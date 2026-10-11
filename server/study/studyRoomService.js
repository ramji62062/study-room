"use strict";

/**
 * Server-side Study Room Service
 * Source of truth for:
 * - Shared Pomodoro focus timer (zero client clock drift)
 * - Reliable idempotent chat messages & catch-up
 * - Stale-timeout presence tracking with status lines
 * - Silent vs Discussion mode synchronization
 */

function sanitizeText(str, maxLen = 1000) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[<>]/g, "") // strip angle brackets to prevent script tags
    .slice(0, maxLen)
    .trim();
}

class StudyRoomService {
  constructor() {
    this.timers = new Map(); // roomId -> { durationSeconds, startedAt, isRunning, mode }
    this.messages = new Map(); // roomId -> Array<{ id, userId, userName, body, createdAt }>
    this.members = new Map(); // roomId -> Map(socketId -> { userId, name, status, lastPing })
    this.modes = new Map(); // roomId -> 'silent' | 'discussion'
    this.supabaseAdmin = null;

    // Start stale presence check interval (removes abandoned connections after 35s)
    setInterval(() => this.cleanStaleMembers(), 10000);
  }

  setSupabaseAdmin(adminClient) {
    this.supabaseAdmin = adminClient;
  }

  getTimerState(roomId) {
    let t = this.timers.get(roomId);
    if (!t) {
      t = {
        durationSeconds: 25 * 60,
        startedAt: null,
        isRunning: false,
        mode: "focus",
      };
      this.timers.set(roomId, t);
    }

    let remainingSeconds = t.durationSeconds;
    if (t.isRunning && t.startedAt) {
      const elapsed = Math.floor((Date.now() - t.startedAt) / 1000);
      remainingSeconds = Math.max(0, t.durationSeconds - elapsed);
      if (remainingSeconds === 0) {
        t.isRunning = false;
        t.startedAt = null;
      }
    }

    return {
      durationSeconds: t.durationSeconds,
      remainingSeconds,
      isRunning: t.isRunning,
      mode: t.mode,
      serverTime: Date.now(),
    };
  }

  setTimer(roomId, { action, durationSeconds, mode }) {
    let t = this.timers.get(roomId);
    if (!t) {
      t = { durationSeconds: 25 * 60, startedAt: null, isRunning: false, mode: "focus" };
      this.timers.set(roomId, t);
    }

    if (mode) t.mode = mode;
    if (typeof durationSeconds === "number" && durationSeconds > 0) {
      t.durationSeconds = durationSeconds;
    }

    if (action === "start") {
      t.isRunning = true;
      t.startedAt = Date.now();
    } else if (action === "pause") {
      if (t.isRunning && t.startedAt) {
        const elapsed = Math.floor((Date.now() - t.startedAt) / 1000);
        t.durationSeconds = Math.max(0, t.durationSeconds - elapsed);
      }
      t.isRunning = false;
      t.startedAt = null;
    } else if (action === "reset") {
      t.isRunning = false;
      t.startedAt = null;
      t.durationSeconds = (t.mode === "break" ? 5 : 25) * 60;
    }

    return this.getTimerState(roomId);
  }

  getRoomMode(roomId) {
    return this.modes.get(roomId) || "silent";
  }

  setRoomMode(roomId, mode) {
    const valid = mode === "discussion" ? "discussion" : "silent";
    this.modes.set(roomId, valid);
    return valid;
  }

  getMembers(roomId) {
    const roomMap = this.members.get(roomId);
    if (!roomMap) return [];
    const now = Date.now();
    const list = [];
    const seenUsers = new Set();

    for (const [socketId, m] of roomMap.entries()) {
      // Discard stale members inactive for > 35 seconds
      if (now - m.lastPing > 35000) continue;
      if (seenUsers.has(m.userId)) continue;
      seenUsers.add(m.userId);
      list.push({
        socketId,
        userId: m.userId,
        name: m.name,
        status: m.status,
      });
    }

    return list;
  }

  trackMember(roomId, socketId, { userId, name, status }) {
    if (!this.members.has(roomId)) {
      this.members.set(roomId, new Map());
    }
    const roomMap = this.members.get(roomId);
    roomMap.set(socketId, {
      userId: sanitizeText(userId || socketId, 50),
      name: sanitizeText(name || "Student", 40),
      status: sanitizeText(status || "Studying", 40),
      lastPing: Date.now(),
    });
  }

  updateMemberStatus(roomId, socketId, status) {
    const roomMap = this.members.get(roomId);
    if (!roomMap) return;
    const m = roomMap.get(socketId);
    if (m) {
      m.status = sanitizeText(status, 40);
      m.lastPing = Date.now();
    }
  }

  pingMember(socketId) {
    for (const roomMap of this.members.values()) {
      const m = roomMap.get(socketId);
      if (m) {
        m.lastPing = Date.now();
      }
    }
  }

  removeMember(socketId) {
    for (const [roomId, roomMap] of this.members.entries()) {
      if (roomMap.has(socketId)) {
        roomMap.delete(socketId);
        if (roomMap.size === 0) this.members.delete(roomId);
      }
    }
  }

  cleanStaleMembers() {
    const now = Date.now();
    for (const [roomId, roomMap] of this.members.entries()) {
      for (const [socketId, m] of roomMap.entries()) {
        if (now - m.lastPing > 35000) {
          roomMap.delete(socketId);
        }
      }
      if (roomMap.size === 0) this.members.delete(roomId);
    }
  }

  async addMessage(roomId, { id, userId, userName, body }) {
    if (!this.messages.has(roomId)) {
      this.messages.set(roomId, []);
    }
    const list = this.messages.get(roomId);

    // Deduplicate by message ID
    const cleanId = String(id || Date.now());
    const existing = list.find((m) => m.id === cleanId);
    if (existing) return existing;

    const messageObj = {
      id: cleanId,
      roomId,
      userId: sanitizeText(userId, 50),
      userName: sanitizeText(userName, 40),
      body: sanitizeText(body, 1000),
      createdAt: new Date().toISOString(),
    };

    list.push(messageObj);
    // Keep last 150 messages in memory
    if (list.length > 150) list.shift();

    // Persist to Supabase Postgres if available
    if (this.supabaseAdmin) {
      try {
        await this.supabaseAdmin.from("messages").insert({
          id: messageObj.id,
          room_id: roomId,
          user_id: messageObj.userId,
          user_name: messageObj.userName,
          body: messageObj.body,
          created_at: messageObj.createdAt,
        });
      } catch (dbErr) {
        // Safe logging without credentials
        console.warn("[StudyService] DB insert warning:", dbErr.message);
      }
    }

    return messageObj;
  }

  async getMessages(roomId, lastSeenCreatedAt = null) {
    // Attempt to read from Supabase if configured
    if (this.supabaseAdmin) {
      try {
        let query = this.supabaseAdmin
          .from("messages")
          .select("id, room_id, user_id, user_name, body, created_at")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true })
          .limit(80);

        if (lastSeenCreatedAt) {
          query = query.gt("created_at", lastSeenCreatedAt);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map((d) => ({
            id: d.id,
            roomId: d.room_id,
            userId: d.user_id,
            userName: d.user_name,
            body: d.body,
            createdAt: d.created_at,
          }));
        }
      } catch (_) {}
    }

    // Fallback to in-memory store
    const list = this.messages.get(roomId) || [];
    if (!lastSeenCreatedAt) return list;
    return list.filter((m) => new Date(m.createdAt) > new Date(lastSeenCreatedAt));
  }

  wireSocketEvents(io, socket) {
    socket.on("study:join", async (payload = {}, callback = () => {}) => {
      try {
        const roomId = String(payload.roomId || "default");
        socket.join(`study:${roomId}`);
        socket.data.studyRoomId = roomId;

        this.trackMember(roomId, socket.id, {
          userId: payload.userId,
          name: payload.name,
          status: payload.status,
        });

        const timerState = this.getTimerState(roomId);
        const members = this.getMembers(roomId);
        const mode = this.getRoomMode(roomId);
        const messages = await this.getMessages(roomId);

        // Notify other room members about presence update
        socket.to(`study:${roomId}`).emit("study:members-update", members);

        callback({
          success: true,
          timerState,
          members,
          mode,
          messages,
        });
      } catch (err) {
        console.error("[StudyService] Join error:", err);
        callback({ success: false, error: err.message });
      }
    });

    socket.on("study:ping", () => {
      this.pingMember(socket.id);
    });

    socket.on("study:status-update", (payload = {}) => {
      const roomId = socket.data.studyRoomId || String(payload.roomId || "");
      if (!roomId) return;
      this.updateMemberStatus(roomId, socket.id, payload.status);
      const members = this.getMembers(roomId);
      io.to(`study:${roomId}`).emit("study:members-update", members);
    });

    socket.on("study:timer-set", (payload = {}, callback = () => {}) => {
      const roomId = socket.data.studyRoomId || String(payload.roomId || "");
      if (!roomId) return callback({ success: false, error: "No room" });
      const nextTimer = this.setTimer(roomId, payload);
      io.to(`study:${roomId}`).emit("study:timer-update", nextTimer);
      callback({ success: true, timerState: nextTimer });
    });

    socket.on("study:mode-set", (payload = {}, callback = () => {}) => {
      const roomId = socket.data.studyRoomId || String(payload.roomId || "");
      if (!roomId) return;
      const nextMode = this.setRoomMode(roomId, payload.mode);
      io.to(`study:${roomId}`).emit("study:mode-update", { mode: nextMode });
      if (typeof callback === "function") callback({ success: true, mode: nextMode });
    });

    socket.on("study:message-send", async (payload = {}, callback = () => {}) => {
      try {
        const roomId = socket.data.studyRoomId || String(payload.roomId || "");
        if (!roomId || !payload.body) return callback({ success: false, error: "Invalid payload" });

        const message = await this.addMessage(roomId, payload);
        io.to(`study:${roomId}`).emit("study:message-new", message);
        callback({ success: true, message });
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    socket.on("study:messages-catchup", async (payload = {}, callback = () => {}) => {
      try {
        const roomId = socket.data.studyRoomId || String(payload.roomId || "");
        const messages = await this.getMessages(roomId, payload.lastSeenCreatedAt);
        callback({ success: true, messages });
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.studyRoomId;
      this.removeMember(socket.id);
      if (roomId) {
        const members = this.getMembers(roomId);
        io.to(`study:${roomId}`).emit("study:members-update", members);
      }
    });
  }
}

const studyRoomService = new StudyRoomService();
module.exports = studyRoomService;
