"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as mediasoupClient from "mediasoup-client";
import { type Socket, io } from "socket.io-client";

export interface SfuPeer {
  socketId: string;
  userId: string;
  name: string;
  micOn: boolean;
  cameraOn: boolean;
  screenOn: boolean;
  isSpeaking: boolean;
  audioStream?: MediaStream;
  videoStream?: MediaStream;
  isPinned?: boolean;
  handRaised?: boolean;
  audioConsumerId?: string;
  videoConsumerId?: string;
}

export interface HandRaiseEntry {
  socketId: string;
  userId: string;
  name: string;
  timestamp: number;
}

interface UseMediasoupOptions {
  roomId: string;
  userId: string;
  userName: string;
  isHost?: boolean;
  autoJoin?: boolean;
}

export function useMediasoup({
  roomId,
  userId,
  userName,
  isHost = false,
  autoJoin = true,
}: UseMediasoupOptions) {
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [peers, setPeers] = useState<Map<string, SfuPeer>>(new Map());
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [activeSpeakerSocketId, setActiveSpeakerSocketId] = useState<string | null>(null);
  const [spotlightPeerId, setSpotlightPeerId] = useState<string | null>(null);
  const [handRaises, setHandRaises] = useState<HandRaiseEntry[]>([]);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dedicated reactive state for local media streams
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(null);

  // Stream refs to avoid stale closures in track teardowns
  const localCameraStreamRef = useRef<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const localAudioStreamRef = useRef<MediaStream | null>(null);

  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<mediasoupClient.types.Device | null>(null);
  const sendTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const recvTransportRef = useRef<mediasoupClient.types.Transport | null>(null);

  // Local producers
  const audioProducerRef = useRef<mediasoupClient.types.Producer | null>(null);
  const videoProducerRef = useRef<mediasoupClient.types.Producer | null>(null);
  const screenProducerRef = useRef<mediasoupClient.types.Producer | null>(null);

  // Active consumers map: consumerId -> consumer
  const consumersRef = useRef<Map<string, mediasoupClient.types.Consumer>>(new Map());

  // Initialize socket on mount
  useEffect(() => {
    const s = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    setSocket(s);
    socketRef.current = s;

    return () => {
      s.disconnect();
    };
  }, []);

  // Socket helper with Promise response
  const socketRequest = useCallback((event: string, data: any = {}): Promise<any> => {
    return new Promise((resolve, reject) => {
      const activeSocket = socketRef.current;
      if (!activeSocket) return reject(new Error("Socket not connected"));
      activeSocket.emit(event, data, (response: any) => {
        if (!response || response.error) {
          reject(new Error(response?.error || `Error in ${event}`));
        } else {
          resolve(response);
        }
      });
    });
  }, []);

  // Consume a remote producer
  const consumeProducer = useCallback(
    async (producerInfo: {
      producerId: string;
      producerSocketId: string;
      userId: string;
      name: string;
      kind: "audio" | "video";
      appData?: any;
    }) => {
      if (!deviceRef.current || !recvTransportRef.current || !socketRef.current) return;
      if (producerInfo.producerSocketId === socketRef.current.id) return; // Don't consume own

      try {
        const res = await socketRequest("sfu:consume", {
          roomId,
          transportId: recvTransportRef.current.id,
          producerId: producerInfo.producerId,
          rtpCapabilities: deviceRef.current.rtpCapabilities,
        });

        const { id, kind, rtpParameters } = res.consumerParams;
        const consumer = await recvTransportRef.current.consume({
          id,
          producerId: producerInfo.producerId,
          kind,
          rtpParameters,
        });

        consumersRef.current.set(consumer.id, consumer);

        const newStream = new MediaStream([consumer.track]);

        // Auto-resume audio immediately
        if (kind === "audio") {
          await socketRequest("sfu:consumer-resume", { roomId, consumerId: consumer.id });
          consumer.resume();
        } else if (kind === "video") {
          // Resume video for active speaker or pinned presenter
          await socketRequest("sfu:consumer-resume", { roomId, consumerId: consumer.id });
          consumer.resume();
        }

        // Update peers state
        setPeers((prev) => {
          const updated = new Map(prev);
          const currentPeer = updated.get(producerInfo.producerSocketId) || {
            socketId: producerInfo.producerSocketId,
            userId: producerInfo.userId,
            name: producerInfo.name,
            micOn: kind === "audio",
            cameraOn: kind === "video" && !producerInfo.appData?.isScreen,
            screenOn: kind === "video" && Boolean(producerInfo.appData?.isScreen),
            isSpeaking: false,
          };

          if (kind === "audio") {
            currentPeer.audioStream = newStream;
            currentPeer.micOn = true;
            currentPeer.audioConsumerId = consumer.id;
          } else if (kind === "video") {
            currentPeer.videoStream = newStream;
            currentPeer.cameraOn = !producerInfo.appData?.isScreen;
            currentPeer.screenOn = Boolean(producerInfo.appData?.isScreen);
            currentPeer.videoConsumerId = consumer.id;
          }

          updated.set(producerInfo.producerSocketId, currentPeer);
          return updated;
        });
      } catch (err) {
        console.warn("[SFU Client] Consume producer error:", err);
      }
    },
    [roomId, socketRequest]
  );

  // Initialize and connect SFU
  const joinSfu = useCallback(async () => {
    if (isJoined || isConnecting) return;
    setIsConnecting(true);
    setError(null);

    try {
      const activeSocket = socketRef.current;
      if (!activeSocket) {
        throw new Error("Socket connection is initializing");
      }

      // If socket is still connecting, await connection
      if (!activeSocket.connected) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            if (activeSocket.connected) resolve();
            else reject(new Error("Socket connection timed out"));
          }, 8000);

          activeSocket.once("connect", () => {
            clearTimeout(timer);
            resolve();
          });

          activeSocket.once("connect_error", (err) => {
            clearTimeout(timer);
            reject(err);
          });
        });
      }

      // Join SFU room & fetch capabilities
      const joinRes = await socketRequest("sfu:join", {
        roomId,
        userId,
        name: userName,
      });

      if (!joinRes.success || !joinRes.rtpCapabilities) {
        throw new Error("Failed to receive SFU router RTP capabilities");
      }

      // Initialize Mediasoup Device
      const device = new mediasoupClient.Device();
      await device.load({ routerRtpCapabilities: joinRes.rtpCapabilities });
      deviceRef.current = device;

      // Create Send WebRtcTransport
      const sendRes = await socketRequest("sfu:create-transport", {
        roomId,
        direction: "send",
        userId,
        name: userName,
      });
      const sendTransport = device.createSendTransport(sendRes.transportParams);

      sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
        try {
          await socketRequest("sfu:connect-transport", {
            roomId,
            transportId: sendTransport.id,
            dtlsParameters,
          });
          callback();
        } catch (err: any) {
          errback(err);
        }
      });

      sendTransport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
          const res = await socketRequest("sfu:produce", {
            roomId,
            transportId: sendTransport.id,
            kind,
            rtpParameters,
            appData,
          });
          callback({ id: res.producerId });
        } catch (err: any) {
          errback(err);
        }
      });

      sendTransportRef.current = sendTransport;

      // Create Recv WebRtcTransport
      const recvRes = await socketRequest("sfu:create-transport", {
        roomId,
        direction: "recv",
        userId,
        name: userName,
      });
      const recvTransport = device.createRecvTransport(recvRes.transportParams);

      recvTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
        try {
          await socketRequest("sfu:connect-transport", {
            roomId,
            transportId: recvTransport.id,
            dtlsParameters,
          });
          callback();
        } catch (err: any) {
          errback(err);
        }
      });

      recvTransportRef.current = recvTransport;

      // Consume any existing producers in the room
      if (joinRes.existingProducers && Array.isArray(joinRes.existingProducers)) {
        for (const producerInfo of joinRes.existingProducers) {
          consumeProducer(producerInfo);
        }
      }

      setIsJoined(true);
      setIsConnecting(false);
    } catch (err: any) {
      console.error("[SFU Client] Join error:", err);
      setError(err.message || "Failed to join media session");
      setIsConnecting(false);
    }
  }, [roomId, userId, userName, isJoined, isConnecting, socketRequest, consumeProducer]);

  // Setup Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewProducer = (producerInfo: any) => {
      consumeProducer(producerInfo);
    };

    const handleProducerClosed = ({ producerId }: { producerId: string }) => {
      // Find consumer linked to producer
      Array.from(consumersRef.current.entries()).forEach(([consumerId, consumer]) => {
        if (consumer.producerId === producerId) {
          consumer.close();
          consumersRef.current.delete(consumerId);
        }
      });

      setPeers((prev) => {
        const updated = new Map(prev);
        Array.from(updated.entries()).forEach(([sId, p]) => {
          if (p.audioConsumerId && !consumersRef.current.has(p.audioConsumerId)) {
            p.audioStream = undefined;
            p.micOn = false;
          }
          if (p.videoConsumerId && !consumersRef.current.has(p.videoConsumerId)) {
            p.videoStream = undefined;
            p.cameraOn = false;
            p.screenOn = false;
          }
        });
        return updated;
      });
    };

    const handleActiveSpeaker = ({ socketId }: { socketId: string; volume: number }) => {
      setActiveSpeakerSocketId(socketId);
      setPeers((prev) => {
        const updated = new Map(prev);
        Array.from(updated.entries()).forEach(([sId, p]) => {
          p.isSpeaking = sId === socketId;
        });
        return updated;
      });
    };

    const handleActiveSpeakerSilence = () => {
      setActiveSpeakerSocketId(null);
      setPeers((prev) => {
        const updated = new Map(prev);
        Array.from(updated.entries()).forEach(([, p]) => {
          p.isSpeaking = false;
        });
        return updated;
      });
    };

    const handleHostMuteAll = () => {
      if (!isHost && audioProducerRef.current) {
        audioProducerRef.current.pause();
        if (localAudioStreamRef.current) {
          localAudioStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
        }
        setMicOn(false);
      }
    };

    const handleHandRaised = (entry: HandRaiseEntry & { raised: boolean }) => {
      setHandRaises((prev) => {
        if (entry.raised) {
          if (prev.some((h) => h.socketId === entry.socketId)) return prev;
          return [...prev, { socketId: entry.socketId, userId: entry.userId, name: entry.name, timestamp: entry.timestamp }];
        } else {
          return prev.filter((h) => h.socketId !== entry.socketId);
        }
      });

      setPeers((prev) => {
        const updated = new Map(prev);
        const p = updated.get(entry.socketId);
        if (p) {
          p.handRaised = entry.raised;
          updated.set(entry.socketId, p);
        }
        return updated;
      });
    };

    socket.on("sfu:new-producer", handleNewProducer);
    socket.on("sfu:producer-closed", handleProducerClosed);
    socket.on("sfu:active-speaker", handleActiveSpeaker);
    socket.on("sfu:active-speaker-silence", handleActiveSpeakerSilence);
    socket.on("sfu:host-mute-all", handleHostMuteAll);
    socket.on("sfu:hand-raised", handleHandRaised);

    return () => {
      socket.off("sfu:new-producer", handleNewProducer);
      socket.off("sfu:producer-closed", handleProducerClosed);
      socket.off("sfu:active-speaker", handleActiveSpeaker);
      socket.off("sfu:active-speaker-silence", handleActiveSpeakerSilence);
      socket.off("sfu:host-mute-all", handleHostMuteAll);
      socket.off("sfu:hand-raised", handleHandRaised);
    };
  }, [socket, consumeProducer, isHost]);

  // Toggle Microphone
  const toggleMic = useCallback(async () => {
    setError(null);
    if (micOn) {
      if (audioProducerRef.current) {
        try {
          audioProducerRef.current.close();
        } catch (_) {}
        if (socketRef.current) {
          socketRef.current.emit("sfu:close-producer", {
            roomId,
            producerId: audioProducerRef.current.id,
          });
        }
        audioProducerRef.current = null;
      }
      if (localAudioStreamRef.current) {
        localAudioStreamRef.current.getTracks().forEach((track) => track.stop());
        localAudioStreamRef.current = null;
      }
      setLocalAudioStream(null);
      setMicOn(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localAudioStreamRef.current = stream;
      setLocalAudioStream(stream);
      setMicOn(true);

      // Connect transport if not connected yet
      let transport = sendTransportRef.current;
      if (!transport) {
        await joinSfu();
        transport = sendTransportRef.current;
      }

      if (transport && !transport.closed) {
        const audioTrack = stream.getAudioTracks()[0];
        const producer = await transport.produce({
          track: audioTrack,
          codecOptions: {
            opusStereo: false,
            opusDtx: true, // discontinuous transmission to save bandwidth
          },
          appData: { userId, userName, kind: "audio" },
        });
        audioProducerRef.current = producer;
      }
    } catch (err: any) {
      console.error("[SFU] Mic access failed:", err);
      setError("Microphone permission denied or unavailable");
      setMicOn(false);
    }
  }, [micOn, roomId, userId, userName, joinSfu]);

  // Toggle Camera
  const toggleCamera = useCallback(async () => {
    setError(null);
    if (cameraOn) {
      if (videoProducerRef.current) {
        try {
          videoProducerRef.current.close();
        } catch (_) {}
        if (socketRef.current) {
          socketRef.current.emit("sfu:close-producer", {
            roomId,
            producerId: videoProducerRef.current.id,
          });
        }
        videoProducerRef.current = null;
      }
      if (localCameraStreamRef.current) {
        localCameraStreamRef.current.getTracks().forEach((track) => track.stop());
        localCameraStreamRef.current = null;
      }
      setLocalCameraStream(null);
      setCameraOn(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 24, max: 30 },
        },
      });

      localCameraStreamRef.current = stream;
      setLocalCameraStream(stream);
      setCameraOn(true);

      // Connect transport if not connected yet
      let transport = sendTransportRef.current;
      if (!transport) {
        await joinSfu();
        transport = sendTransportRef.current;
      }

      if (transport && !transport.closed) {
        const videoTrack = stream.getVideoTracks()[0];
        const producer = await transport.produce({
          track: videoTrack,
          encodings: [{ maxBitrate: 900000, scaleResolutionDownBy: 1 }],
          codecOptions: {
            videoGoogleStartBitrate: 500,
          },
          appData: { userId, userName, isScreen: false },
        });
        videoProducerRef.current = producer;
      }
    } catch (err: any) {
      console.error("[SFU] Camera access failed:", err);
      setError("Camera permission denied or unavailable");
      setCameraOn(false);
    }
  }, [cameraOn, roomId, userId, userName, joinSfu]);

  // Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    setError(null);
    if (screenOn) {
      if (screenProducerRef.current) {
        try {
          screenProducerRef.current.close();
        } catch (_) {}
        if (socketRef.current) {
          socketRef.current.emit("sfu:close-producer", {
            roomId,
            producerId: screenProducerRef.current.id,
          });
        }
        screenProducerRef.current = null;
      }
      if (localScreenStreamRef.current) {
        localScreenStreamRef.current.getTracks().forEach((track) => track.stop());
        localScreenStreamRef.current = null;
      }
      setLocalScreenStream(null);
      setScreenOn(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
          frameRate: { ideal: 30, max: 60 },
        },
        audio: true,
      });

      const screenTrack = stream.getVideoTracks()[0];

      // Handle user stopping screen share via browser native controls
      screenTrack.onended = () => {
        if (screenProducerRef.current) {
          try {
            screenProducerRef.current.close();
          } catch (_) {}
          if (socketRef.current) {
            socketRef.current.emit("sfu:close-producer", {
              roomId,
              producerId: screenProducerRef.current.id,
            });
          }
          screenProducerRef.current = null;
        }
        if (localScreenStreamRef.current) {
          localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
          localScreenStreamRef.current = null;
        }
        setLocalScreenStream(null);
        setScreenOn(false);
      };

      localScreenStreamRef.current = stream;
      setLocalScreenStream(stream);
      setScreenOn(true);

      // Connect transport if not connected yet
      let transport = sendTransportRef.current;
      if (!transport) {
        await joinSfu();
        transport = sendTransportRef.current;
      }

      if (transport && !transport.closed) {
        const producer = await transport.produce({
          track: screenTrack,
          encodings: [{ maxBitrate: 2500000 }],
          appData: { userId, userName, isScreen: true },
        });
        screenProducerRef.current = producer;
      }
    } catch (err: any) {
      console.error("[SFU] Screen share failed:", err);
      if (err.name !== "NotAllowedError") {
        setError("Screen share permission denied or unavailable");
      }
      setScreenOn(false);
    }
  }, [screenOn, roomId, userId, userName, joinSfu]);

  // Host Mute All Students
  const muteAllStudents = useCallback(() => {
    if (!socketRef.current || !isHost) return;
    socketRef.current.emit("sfu:mute-all", { roomId });
  }, [isHost, roomId]);

  // Raise Hand
  const toggleRaiseHand = useCallback(() => {
    if (!socketRef.current) return;
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    socketRef.current.emit("sfu:hand-raise", {
      roomId,
      userId,
      name: userName,
      raised: nextState,
    });
  }, [isHandRaised, roomId, userId, userName]);

  // Lower specific student's hand (teacher control)
  const lowerStudentHand = useCallback((socketId: string) => {
    if (!socketRef.current) return;
    setHandRaises((prev) => prev.filter((h) => h.socketId !== socketId));
    setPeers((prev) => {
      const updated = new Map(prev);
      const p = updated.get(socketId);
      if (p) {
        p.handRaised = false;
        updated.set(socketId, p);
      }
      return updated;
    });
  }, []);

  // Spotlight / Pin a peer
  const toggleSpotlight = useCallback((peerId: string) => {
    setSpotlightPeerId((prev) => (prev === peerId ? null : peerId));
  }, []);

  // Leave SFU session
  const leaveSfu = useCallback(() => {
    if (localCameraStreamRef.current) {
      localCameraStreamRef.current.getTracks().forEach((t) => t.stop());
      localCameraStreamRef.current = null;
    }
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
      localScreenStreamRef.current = null;
    }
    if (localAudioStreamRef.current) {
      localAudioStreamRef.current.getTracks().forEach((t) => t.stop());
      localAudioStreamRef.current = null;
    }

    if (audioProducerRef.current) audioProducerRef.current.close();
    if (videoProducerRef.current) videoProducerRef.current.close();
    if (screenProducerRef.current) screenProducerRef.current.close();

    audioProducerRef.current = null;
    videoProducerRef.current = null;
    screenProducerRef.current = null;

    Array.from(consumersRef.current.values()).forEach((consumer) => {
      consumer.close();
    });
    consumersRef.current.clear();

    if (sendTransportRef.current) sendTransportRef.current.close();
    if (recvTransportRef.current) recvTransportRef.current.close();

    sendTransportRef.current = null;
    recvTransportRef.current = null;

    setPeers(new Map());
    setLocalCameraStream(null);
    setLocalScreenStream(null);
    setLocalAudioStream(null);
    setCameraOn(false);
    setScreenOn(false);
    setMicOn(false);
    setIsJoined(false);
  }, []);

  // Auto-join if enabled
  useEffect(() => {
    if (autoJoin) {
      joinSfu();
    }
    return () => {
      leaveSfu();
    };
  }, [autoJoin, joinSfu, leaveSfu]);

  return {
    isJoined,
    isConnecting,
    error,
    peers: Array.from(peers.values()),
    micOn,
    cameraOn,
    screenOn,
    activeSpeakerSocketId,
    spotlightPeerId,
    handRaises,
    isHandRaised,
    localVideoStream: (localScreenStream || localCameraStream || undefined) as MediaStream | undefined,
    localCameraStream: (localCameraStream || undefined) as MediaStream | undefined,
    localScreenStream: (localScreenStream || undefined) as MediaStream | undefined,
    localAudioStream: (localAudioStream || undefined) as MediaStream | undefined,
    joinSfu,
    leaveSfu,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    muteAllStudents,
    toggleRaiseHand,
    lowerStudentHand,
    toggleSpotlight,
  };
}
