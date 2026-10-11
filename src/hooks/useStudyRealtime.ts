"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";

export interface StudyMember {
  socketId: string;
  userId: string;
  name: string;
  status: string;
}

export interface StudyChatMessage {
  id: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
  status?: "sending" | "sent" | "failed";
}

export interface StudyTimerState {
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  mode: "focus" | "break";
}

interface UseStudyRealtimeProps {
  roomId: string;
  userId: string;
  userName: string;
  initialStatus?: string;
}

function sanitizeText(str: string, maxLen = 1000): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/[<>]/g, "")
    .slice(0, maxLen)
    .trim();
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
}

export function useStudyRealtime({
  roomId,
  userId,
  userName,
  initialStatus = "Studying",
}: UseStudyRealtimeProps) {
  const [connectionState, setConnectionState] = useState<"connected" | "reconnecting" | "offline">("reconnecting");
  const [members, setMembers] = useState<StudyMember[]>([]);
  const [messages, setMessages] = useState<StudyChatMessage[]>([]);
  const [timerState, setTimerState] = useState<StudyTimerState>({
    durationSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    isRunning: false,
    mode: "focus",
  });
  const [roomMode, setRoomMode] = useState<"silent" | "discussion">("silent");
  const [sceneState, setSceneState] = useState<{ sceneId: string; isShared: boolean }>({
    sceneId: "night-library",
    isShared: false,
  });

  const socketRef = useRef<Socket | null>(null);
  const offlineQueueRef = useRef<StudyChatMessage[]>([]);
  const lastSyncTimestampRef = useRef<number>(Date.now());
  const myStatusRef = useRef(initialStatus);

  // Send offline queued messages
  const flushOfflineQueue = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    while (offlineQueueRef.current.length > 0) {
      const queued = offlineQueueRef.current.shift();
      if (!queued) break;

      socket.emit(
        "study:message-send",
        {
          id: queued.id,
          roomId,
          userId: queued.userId,
          userName: queued.userName,
          body: queued.body,
        },
        (res: any) => {
          if (res?.success) {
            setMessages((prev) =>
              prev.map((m) => (m.id === queued.id ? { ...m, status: "sent" } : m))
            );
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === queued.id ? { ...m, status: "failed" } : m))
            );
          }
        }
      );
    }
  }, [roomId]);

  // Catch up missed messages
  const catchupMessages = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      const lastCreatedAt = lastMsg?.createdAt || null;

      socket.emit("study:messages-catchup", { roomId, lastSeenCreatedAt: lastCreatedAt }, (res: any) => {
        if (res?.success && Array.isArray(res.messages) && res.messages.length > 0) {
          setMessages((cur) => {
            const map = new Map(cur.map((m) => [m.id, m]));
            for (const m of res.messages) {
              map.set(m.id, { ...m, status: "sent" });
            }
            return Array.from(map.values()).sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
        }
      });

      return prev;
    });
  }, [roomId]);

  // Connect & wire socket events
  useEffect(() => {
    if (!roomId) return;

    const socket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("connected");

      socket.emit(
        "study:join",
        {
          roomId,
          userId,
          name: userName,
          status: myStatusRef.current,
        },
        (res: any) => {
          if (res?.success) {
            if (res.timerState) {
              setTimerState({
                durationSeconds: res.timerState.durationSeconds,
                remainingSeconds: res.timerState.remainingSeconds,
                isRunning: res.timerState.isRunning,
                mode: res.timerState.mode || "focus",
              });
            }
            if (Array.isArray(res.members)) {
              setMembers(res.members);
            }
            if (res.mode) {
              setRoomMode(res.mode);
            }
            if (res.sceneState) {
              setSceneState({
                sceneId: res.sceneState.sceneId || "night-library",
                isShared: Boolean(res.sceneState.isShared),
              });
            }
            if (Array.isArray(res.messages)) {
              setMessages(
                res.messages.map((m: any) => ({ ...m, status: "sent" }))
              );
            }
            flushOfflineQueue();
          }
        }
      );
    });

    socket.on("disconnect", () => {
      setConnectionState("offline");
    });

    socket.on("connect_error", () => {
      setConnectionState("reconnecting");
    });

    socket.on("study:members-update", (updatedMembers: StudyMember[]) => {
      if (Array.isArray(updatedMembers)) {
        setMembers(updatedMembers);
      }
    });

    socket.on("study:scene-update", (serverScene: { sceneId: string; isShared: boolean }) => {
      if (serverScene) {
        setSceneState({
          sceneId: serverScene.sceneId || "night-library",
          isShared: Boolean(serverScene.isShared),
        });
      }
    });

    socket.on("study:timer-update", (serverTimer: any) => {
      if (serverTimer) {
        setTimerState({
          durationSeconds: serverTimer.durationSeconds,
          remainingSeconds: serverTimer.remainingSeconds,
          isRunning: serverTimer.isRunning,
          mode: serverTimer.mode || "focus",
        });
      }
    });

    socket.on("study:mode-update", (payload: { mode: "silent" | "discussion" }) => {
      if (payload?.mode) {
        setRoomMode(payload.mode);
      }
    });

    socket.on("study:message-new", (newMsg: StudyChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) {
          return prev.map((m) => (m.id === newMsg.id ? { ...newMsg, status: "sent" } : m));
        }
        return [...prev, { ...newMsg, status: "sent" }];
      });
    });

    // Heartbeat ping interval
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("study:ping");
      }
    }, 15000);

    // Visibility change / tab wake catch-up
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        catchupMessages();
      }
    };

    // Online event catch-up
    const handleOnline = () => {
      setConnectionState("reconnecting");
      catchupMessages();
    };

    const handleOffline = () => {
      setConnectionState("offline");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(pingInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      socket.disconnect();
    };
  }, [roomId, userId, userName, flushOfflineQueue, catchupMessages]);

  // Client tick for running timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerState.isRunning && timerState.remainingSeconds > 0) {
      interval = setInterval(() => {
        setTimerState((prev) => {
          if (!prev.isRunning || prev.remainingSeconds <= 0) return prev;
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.remainingSeconds]);

  // Send Chat Message with Optimistic UI & Retry
  const sendMessage = useCallback(
    (text: string) => {
      const cleanBody = sanitizeText(text, 1000);
      if (!cleanBody) return;

      const msgId = generateId();
      const optimisticMsg: StudyChatMessage = {
        id: msgId,
        userId,
        userName,
        body: cleanBody,
        createdAt: new Date().toISOString(),
        status: "sending",
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        offlineQueueRef.current.push(optimisticMsg);
        return;
      }

      socket.emit(
        "study:message-send",
        {
          id: msgId,
          roomId,
          userId,
          userName,
          body: cleanBody,
        },
        (res: any) => {
          if (res?.success) {
            setMessages((prev) =>
              prev.map((m) => (m.id === msgId ? { ...m, status: "sent" } : m))
            );
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === msgId ? { ...m, status: "failed" } : m))
            );
          }
        }
      );
    },
    [roomId, userId, userName]
  );

  // Retry Failed Message
  const retryMessage = useCallback(
    (msgId: string) => {
      const target = messages.find((m) => m.id === msgId);
      if (!target) return;

      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, status: "sending" } : m))
      );

      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        offlineQueueRef.current.push(target);
        return;
      }

      socket.emit(
        "study:message-send",
        {
          id: target.id,
          roomId,
          userId: target.userId,
          userName: target.userName,
          body: target.body,
        },
        (res: any) => {
          if (res?.success) {
            setMessages((prev) =>
              prev.map((m) => (m.id === msgId ? { ...m, status: "sent" } : m))
            );
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === msgId ? { ...m, status: "failed" } : m))
            );
          }
        }
      );
    },
    [messages, roomId]
  );

  // Timer Controls (Server-backed source of truth)
  const startTimer = useCallback(() => {
    socketRef.current?.emit("study:timer-set", { roomId, action: "start" });
  }, [roomId]);

  const pauseTimer = useCallback(() => {
    socketRef.current?.emit("study:timer-set", { roomId, action: "pause" });
  }, [roomId]);

  const resetTimer = useCallback(() => {
    socketRef.current?.emit("study:timer-set", { roomId, action: "reset" });
  }, [roomId]);

  const setTimerPreset = useCallback(
    (durationSeconds: number, mode: "focus" | "break") => {
      socketRef.current?.emit("study:timer-set", {
        roomId,
        action: "start",
        durationSeconds,
        mode,
      });
    },
    [roomId]
  );

  // Update Member Status Line (e.g., "Studying OS")
  const updateMyStatus = useCallback(
    (newStatus: string) => {
      const clean = sanitizeText(newStatus, 40) || "Studying";
      myStatusRef.current = clean;
      socketRef.current?.emit("study:status-update", { roomId, status: clean });
    },
    [roomId]
  );

  // Toggle Silent / Discussion Mode
  const toggleRoomMode = useCallback(
    (mode: "silent" | "discussion") => {
      setRoomMode(mode);
      socketRef.current?.emit("study:mode-set", { roomId, mode });
    },
    [roomId]
  );

  // Update Shared Scene
  const updateScene = useCallback(
    (sceneId: string, isShared: boolean) => {
      setSceneState({ sceneId, isShared });
      socketRef.current?.emit("study:scene-set", { roomId, sceneId, isShared, userId });
    },
    [roomId, userId]
  );

  return {
    connectionState,
    members,
    messages,
    timerState,
    roomMode,
    sceneState,
    sendMessage,
    retryMessage,
    startTimer,
    pauseTimer,
    resetTimer,
    setTimerPreset,
    updateMyStatus,
    toggleRoomMode,
    updateScene,
  };
}
