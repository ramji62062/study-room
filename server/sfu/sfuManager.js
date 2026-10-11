"use strict";

const os = require("os");
const mediasoup = require("mediasoup");

/**
 * Mediasoup SFU Manager for High-Density Classroom & Live Coding Video
 * Supports up to 250 connected participants via:
 * - Multi-core worker pooling with round-robin room distribution
 * - Dynamic transport management with TCP fallback
 * - Audio level observing for automatic active speaker detection
 * - Selective consumer pause/resume to preserve client CPU and network bandwidth
 */

const MEDIA_CODECS = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "x-google-start-bitrate": 1000,
    },
  },
  {
    kind: "video",
    mimeType: "video/h264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "profile-level-id": "42e01f",
      "level-asymmetry-allowed": 1,
    },
  },
  {
    kind: "video",
    mimeType: "video/VP9",
    clockRate: 90000,
  },
];

class SfuManager {
  constructor() {
    this.workers = [];
    this.nextWorkerIdx = 0;
    this.rooms = new Map(); // roomId -> RoomData
    this.socketRoomMap = new Map(); // socketId -> roomId
    this.io = null;
    this.isInitialized = false;
  }

  async init(io) {
    if (this.isInitialized) return;
    this.io = io;
    const numCores = os.cpus()?.length || 2;
    const numWorkers = Math.max(1, Math.min(numCores, 8));

    console.log(`[SFU] Spawning ${numWorkers} Mediasoup worker(s)...`);

    for (let i = 0; i < numWorkers; i++) {
      await this.spawnWorker(i);
    }

    this.isInitialized = true;
    console.log(`[SFU] Mediasoup SFU initialized with ${this.workers.length} active workers.`);
  }

  async spawnWorker(index) {
    try {
      const worker = await mediasoup.createWorker({
        logLevel: "warn",
        logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
        rtcMinPort: Number(process.env.RTC_MIN_PORT || 20000),
        rtcMaxPort: Number(process.env.RTC_MAX_PORT || 29999),
      });

      worker.on("died", (error) => {
        console.error(`[SFU] Mediasoup worker [${index}] died unexpectedly:`, error);
        // Replace the dead worker
        setTimeout(() => {
          this.spawnWorker(index).catch((err) =>
            console.error(`[SFU] Failed to recover worker [${index}]:`, err)
          );
        }, 1000);
      });

      this.workers[index] = worker;
      return worker;
    } catch (err) {
      console.error(`[SFU] Error creating Mediasoup worker [${index}]:`, err);
      throw err;
    }
  }

  getNextWorker() {
    if (this.workers.length === 0) {
      throw new Error("No Mediasoup workers available");
    }
    const availableWorkers = this.workers.filter(Boolean);
    const worker = availableWorkers[this.nextWorkerIdx % availableWorkers.length];
    this.nextWorkerIdx = (this.nextWorkerIdx + 1) % availableWorkers.length;
    return worker;
  }

  getAnnouncedIp() {
    return (
      process.env.MEDIASOUP_ANNOUNCED_IP ||
      process.env.ANNOUNCED_IP ||
      process.env.PUBLIC_IP ||
      "127.0.0.1"
    );
  }

  async getOrCreateRoom(roomId) {
    let room = this.rooms.get(roomId);
    if (!room) {
      const worker = this.getNextWorker();
      const router = await worker.createRouter({ mediaCodecs: MEDIA_CODECS });

      // Create AudioLevelObserver for 250-seat Active Speaker Detection
      let audioLevelObserver = null;
      try {
        audioLevelObserver = await router.createAudioLevelObserver({
          maxEntries: 1,
          threshold: -70,
          interval: 600,
        });

        audioLevelObserver.on("volumes", (volumes) => {
          if (!volumes || volumes.length === 0) return;
          const { producer, volume } = volumes[0];
          const producerData = room.producers.get(producer.id);
          if (producerData && this.io) {
            this.io.to(roomId).emit("sfu:active-speaker", {
              producerId: producer.id,
              socketId: producerData.socketId,
              userId: producerData.userId,
              volume,
            });
          }
        });

        audioLevelObserver.on("silence", () => {
          if (this.io) {
            this.io.to(roomId).emit("sfu:active-speaker-silence");
          }
        });
      } catch (obsErr) {
        console.warn(`[SFU] AudioLevelObserver initialization warning:`, obsErr.message);
      }

      room = {
        id: roomId,
        router,
        audioLevelObserver,
        transports: new Map(), // transportId -> transport
        producers: new Map(), // producerId -> { producer, socketId, userId, kind, appData }
        consumers: new Map(), // consumerId -> { consumer, socketId, producerId }
        sockets: new Map(), // socketId -> { transports: Set, producers: Set, consumers: Set, userId, name }
      };

      this.rooms.set(roomId, room);
      console.log(`[SFU] Created new media router for room: ${roomId}`);
    }
    return room;
  }

  getRouterRtpCapabilities(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return room.router.rtpCapabilities;
  }

  async createWebRtcTransport(roomId, socketId, direction, userId = "", name = "") {
    const room = await this.getOrCreateRoom(roomId);
    const announcedIp = this.getAnnouncedIp();

    const transport = await room.router.createWebRtcTransport({
      listenIps: [
        {
          ip: "0.0.0.0",
          announcedIp: announcedIp,
        },
      ],
      enableUdp: true,
      enableTcp: true, // TCP fallback for restricted firewalls & institutional networks
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000,
    });

    // Transport limits for client resilience
    await transport.setMaxIncomingBitrate(1500000).catch(() => {});

    room.transports.set(transport.id, transport);

    // Track in socket data
    if (!room.sockets.has(socketId)) {
      room.sockets.set(socketId, {
        userId,
        name,
        transports: new Set(),
        producers: new Set(),
        consumers: new Set(),
      });
    }
    const socketInfo = room.sockets.get(socketId);
    socketInfo.transports.add(transport.id);
    this.socketRoomMap.set(socketId, roomId);

    transport.on("dtlsstatechange", (dtlsState) => {
      if (dtlsState === "closed" || dtlsState === "failed") {
        transport.close();
      }
    });

    transport.on("close", () => {
      room.transports.delete(transport.id);
      socketInfo.transports.delete(transport.id);
    });

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(roomId, transportId, dtlsParameters) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room not found");
    const transport = room.transports.get(transportId);
    if (!transport) throw new Error("Transport not found");
    await transport.connect({ dtlsParameters });
  }

  async produce(roomId, socketId, transportId, kind, rtpParameters, appData = {}) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room not found");
    const transport = room.transports.get(transportId);
    if (!transport) throw new Error("Transport not found");

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData,
    });

    const socketInfo = room.sockets.get(socketId) || { userId: "", name: "" };

    const producerData = {
      producer,
      socketId,
      userId: socketInfo.userId || appData.userId || socketId,
      name: socketInfo.name || appData.userName || "Participant",
      kind,
      appData,
    };

    room.producers.set(producer.id, producerData);
    if (socketInfo.producers) socketInfo.producers.add(producer.id);

    // Attach to audio level observer if audio
    if (kind === "audio" && room.audioLevelObserver) {
      try {
        await room.audioLevelObserver.addProducer({ producerId: producer.id });
      } catch (err) {
        console.warn(`[SFU] Failed to add producer to AudioLevelObserver:`, err.message);
      }
    }

    producer.on("transportclose", () => {
      this.closeProducer(roomId, producer.id);
    });

    return {
      id: producer.id,
      userId: producerData.userId,
      name: producerData.name,
      kind,
      appData,
    };
  }

  async consume(roomId, socketId, transportId, producerId, rtpCapabilities) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room not found");
    const transport = room.transports.get(transportId);
    if (!transport) throw new Error("Transport not found");

    const producerData = room.producers.get(producerId);
    if (!producerData) throw new Error("Producer not found");

    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error("Cannot consume producer with provided capabilities");
    }

    // Start video paused by default to protect client CPU; client resumes active speakers
    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: producerData.kind === "video", // Auto-pause video, audio plays immediately
    });

    const consumerData = {
      consumer,
      socketId,
      producerId,
      kind: consumer.kind,
    };

    room.consumers.set(consumer.id, consumerData);
    const socketInfo = room.sockets.get(socketId);
    if (socketInfo && socketInfo.consumers) {
      socketInfo.consumers.add(consumer.id);
    }

    consumer.on("transportclose", () => {
      room.consumers.delete(consumer.id);
      if (socketInfo && socketInfo.consumers) socketInfo.consumers.delete(consumer.id);
    });

    consumer.on("producerclose", () => {
      if (this.io) {
        this.io.to(socketId).emit("sfu:consumer-closed", { consumerId: consumer.id, producerId });
      }
      room.consumers.delete(consumer.id);
      if (socketInfo && socketInfo.consumers) socketInfo.consumers.delete(consumer.id);
      consumer.close();
    });

    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      type: consumer.type,
      producerPaused: consumer.producerPaused,
    };
  }

  async resumeConsumer(roomId, consumerId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const consumerData = room.consumers.get(consumerId);
    if (consumerData && consumerData.consumer) {
      await consumerData.consumer.resume();
    }
  }

  async pauseConsumer(roomId, consumerId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const consumerData = room.consumers.get(consumerId);
    if (consumerData && consumerData.consumer) {
      await consumerData.consumer.pause();
    }
  }

  closeProducer(roomId, producerId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const producerData = room.producers.get(producerId);
    if (!producerData) return;

    if (producerData.producer) {
      producerData.producer.close();
    }
    room.producers.delete(producerId);

    if (this.io) {
      this.io.to(roomId).emit("sfu:producer-closed", { producerId });
    }
  }

  getRoomProducers(roomId, excludeSocketId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const list = [];
    for (const [producerId, data] of room.producers.entries()) {
      if (excludeSocketId && data.socketId === excludeSocketId) continue;
      list.push({
        producerId,
        producerSocketId: data.socketId,
        userId: data.userId,
        name: data.name,
        kind: data.kind,
        appData: data.appData,
      });
    }
    return list;
  }

  handleSocketDisconnect(socketId) {
    const roomId = this.socketRoomMap.get(socketId);
    if (!roomId) return;
    this.socketRoomMap.delete(socketId);

    const room = this.rooms.get(roomId);
    if (!room) return;

    const socketInfo = room.sockets.get(socketId);
    if (socketInfo) {
      // Close all producers created by this socket
      if (socketInfo.producers) {
        for (const producerId of socketInfo.producers) {
          this.closeProducer(roomId, producerId);
        }
      }

      // Close all consumers used by this socket
      if (socketInfo.consumers) {
        for (const consumerId of socketInfo.consumers) {
          const c = room.consumers.get(consumerId);
          if (c && c.consumer) c.consumer.close();
          room.consumers.delete(consumerId);
        }
      }

      // Close all transports
      if (socketInfo.transports) {
        for (const transportId of socketInfo.transports) {
          const t = room.transports.get(transportId);
          if (t) t.close();
          room.transports.delete(transportId);
        }
      }

      room.sockets.delete(socketId);
    }

    // Clean up empty room
    if (room.sockets.size === 0) {
      if (room.audioLevelObserver) {
        try {
          room.audioLevelObserver.close();
        } catch (_) {}
      }
      if (room.router) {
        try {
          room.router.close();
        } catch (_) {}
      }
      this.rooms.delete(roomId);
      console.log(`[SFU] Cleaned up inactive room: ${roomId}`);
    }
  }

  wireSocketEvents(io, socket) {
    socket.on("sfu:join", async (payload = {}, callback = () => {}) => {
      try {
        const roomId = String(payload.roomId || "default");
        const userId = String(payload.userId || socket.id);
        const name = String(payload.name || "User");

        const room = await this.getOrCreateRoom(roomId);
        if (!room.sockets.has(socket.id)) {
          room.sockets.set(socket.id, {
            userId,
            name,
            transports: new Set(),
            producers: new Set(),
            consumers: new Set(),
          });
        }
        this.socketRoomMap.set(socket.id, roomId);
        socket.join(`sfu:${roomId}`);

        // Return router capabilities + current existing producers in room
        const rtpCapabilities = room.router.rtpCapabilities;
        const existingProducers = this.getRoomProducers(roomId, socket.id);

        callback({
          success: true,
          rtpCapabilities,
          existingProducers,
        });
      } catch (err) {
        console.error("[SFU] Error in sfu:join:", err);
        callback({ success: false, error: err.message });
      }
    });

    socket.on("sfu:get-rtp-capabilities", async (payload = {}, callback = () => {}) => {
      try {
        const roomId = String(payload.roomId || "default");
        const room = await this.getOrCreateRoom(roomId);
        callback({ success: true, rtpCapabilities: room.router.rtpCapabilities });
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    socket.on("sfu:create-transport", async (payload = {}, callback = () => {}) => {
      try {
        const roomId = String(payload.roomId || this.socketRoomMap.get(socket.id) || "default");
        const direction = payload.direction || "send";
        const transportParams = await this.createWebRtcTransport(
          roomId,
          socket.id,
          direction,
          payload.userId,
          payload.name
        );
        callback({ success: true, transportParams });
      } catch (err) {
        console.error("[SFU] Error creating transport:", err);
        callback({ success: false, error: err.message });
      }
    });

    socket.on("sfu:connect-transport", async (payload = {}, callback = () => {}) => {
      try {
        const roomId = String(payload.roomId || this.socketRoomMap.get(socket.id) || "default");
        await this.connectTransport(roomId, payload.transportId, payload.dtlsParameters);
        callback({ success: true });
      } catch (err) {
        console.error("[SFU] Error connecting transport:", err);
        callback({ success: false, error: err.message });
      }
    });

    socket.on("sfu:produce", async (payload = {}, callback = () => {}) => {
      try {
        const roomId = String(payload.roomId || this.socketRoomMap.get(socket.id) || "default");
        const result = await this.produce(
          roomId,
          socket.id,
          payload.transportId,
          payload.kind,
          payload.rtpParameters,
          payload.appData || {}
        );

        // Notify other participants in the room
        socket.to(`sfu:${roomId}`).emit("sfu:new-producer", {
          producerId: result.id,
          producerSocketId: socket.id,
          userId: result.userId,
          name: result.name,
          kind: result.kind,
          appData: result.appData,
        });

        callback({ success: true, producerId: result.id });
      } catch (err) {
        console.error("[SFU] Error in produce:", err);
        callback({ success: false, error: err.message });
      }
    });

    socket.on("sfu:consume", async (payload = {}, callback = () => {}) => {
      try {
        const roomId = String(payload.roomId || this.socketRoomMap.get(socket.id) || "default");
        const consumerParams = await this.consume(
          roomId,
          socket.id,
          payload.transportId,
          payload.producerId,
          payload.rtpCapabilities
        );
        callback({ success: true, consumerParams });
      } catch (err) {
        console.error("[SFU] Error consuming:", err);
        callback({ success: false, error: err.message });
      }
    });

    socket.on("sfu:consumer-resume", async (payload = {}, callback = () => {}) => {
      try {
        const roomId = String(payload.roomId || this.socketRoomMap.get(socket.id) || "default");
        await this.resumeConsumer(roomId, payload.consumerId);
        if (typeof callback === "function") callback({ success: true });
      } catch (err) {
        if (typeof callback === "function") callback({ success: false, error: err.message });
      }
    });

    socket.on("sfu:consumer-pause", async (payload = {}, callback = () => {}) => {
      try {
        const roomId = String(payload.roomId || this.socketRoomMap.get(socket.id) || "default");
        await this.pauseConsumer(roomId, payload.consumerId);
        if (typeof callback === "function") callback({ success: true });
      } catch (err) {
        if (typeof callback === "function") callback({ success: false, error: err.message });
      }
    });

    socket.on("sfu:close-producer", (payload = {}) => {
      const roomId = String(payload.roomId || this.socketRoomMap.get(socket.id) || "default");
      if (payload.producerId) {
        this.closeProducer(roomId, payload.producerId);
      }
    });

    socket.on("sfu:mute-all", (payload = {}) => {
      const roomId = String(payload.roomId || this.socketRoomMap.get(socket.id) || "default");
      // Broadcast mute command to all students in room
      socket.to(`sfu:${roomId}`).emit("sfu:host-mute-all", {
        by: socket.id,
        reason: payload.reason || "Host muted all participants",
      });
    });

    socket.on("sfu:hand-raise", (payload = {}) => {
      const roomId = String(payload.roomId || this.socketRoomMap.get(socket.id) || "default");
      io.to(`sfu:${roomId}`).emit("sfu:hand-raised", {
        socketId: socket.id,
        userId: payload.userId,
        name: payload.name,
        raised: Boolean(payload.raised),
        timestamp: Date.now(),
      });
    });

    socket.on("disconnect", () => {
      this.handleSocketDisconnect(socket.id);
    });
  }
}

const sfuManager = new SfuManager();
module.exports = sfuManager;
