"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { generateGuestName } from "@/lib/utils";

type RoomLookup = {
  id: string;
  name: string | null;
  room_code: string;
  is_active: boolean | null;
  room_type?: string | null;
};

export default function JoinByCodePage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = useMemo(() => (params?.code || "").toUpperCase(), [params]);

  const [room, setRoom] = useState<RoomLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function lookupRoom() {
      setLoading(true);
      const { data, error: roomError } = await supabase
        .from("rooms")
        .select("id, name, room_code, is_active, room_type")
        .eq("room_code", code)
        .maybeSingle();

      if (roomError || !data) {
        setError("Room not found. Check your code.");
        setLoading(false);
        return;
      }
      if (data.is_active === false) {
        setError("This session has ended. Ask the owner to create a new room.");
        setLoading(false);
        return;
      }

      setRoom(data);
      setLoading(false);
    }

    if (code) {
      lookupRoom();
    } else {
      setError("Invalid room code");
      setLoading(false);
    }
  }, [code]);

  const parsedRoomMeta = useMemo(() => {
    if (!room?.name) return { title: "Untitled Room", isStudy: room?.room_type === "study" };
    if (room.name.startsWith("{")) {
      try {
        const meta = JSON.parse(room.name);
        return {
          title: meta.title || "Workspace",
          isStudy: meta.roomType === "study" || room.room_type === "study",
        };
      } catch (_) {}
    }
    return { title: room.name, isStudy: room.room_type === "study" };
  }, [room]);

  async function joinRoom() {
    if (!room) return;
    setJoining(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const safeName = displayName.trim() || generateGuestName();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const res = await fetch("/api/join-room", {
      method: "POST",
      headers,
      body: JSON.stringify({ roomCode: room.room_code, accessCode, guestName: safeName }),
    });
    const result = await res.json();

    if (!res.ok || !result.roomId) {
      setError(result.error || "Could not join this room.");
      setJoining(false);
      return;
    }

    if (!session?.user?.id) localStorage.setItem("guest_name", safeName);
    
    if (result.roomType === "study" || parsedRoomMeta.isStudy) {
      router.push(`/study/${result.roomId}`);
    } else {
      router.push(`/room/${result.roomId}`);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        {loading ? (
          <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6">
            <p className="text-gray-300">Checking room code...</p>
          </div>
        ) : room ? (
          <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${parsedRoomMeta.isStudy ? 'bg-[#12342E] text-[#3DD6B0] border border-[#1F5A4D]' : 'bg-white/10 text-white'}`}>
                {parsedRoomMeta.isStudy ? "Study Hub Room" : "Coding Workspace"}
              </span>
              <span className="font-mono text-xs text-gray-400">Code: #{room.room_code}</span>
            </div>
            <h1 className="text-2xl font-bold">{parsedRoomMeta.title}</h1>
            <p className="mt-1 text-gray-400 text-sm">
              {parsedRoomMeta.isStudy ? "Collaborative study room with focus timer, whiteboard, notes & media." : "Collaborative coding workspace with live editor and terminal."}
            </p>

            <GuestJoinSection displayName={displayName} setDisplayName={setDisplayName} />

            <label className="mt-4 block text-sm font-semibold text-gray-300">Access code</label>
            <input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Required for private rooms"
              className="mt-2 w-full rounded-lg border border-[#2a2a2a] bg-[#0b0b0b] px-3 py-2 text-white outline-none focus:border-white"
            />

            {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

            <button
              onClick={joinRoom}
              disabled={joining}
              className={`mt-5 rounded-lg px-6 py-2.5 font-bold transition disabled:opacity-70 ${
                parsedRoomMeta.isStudy
                  ? "bg-[#3DD6B0] hover:bg-[#34c4a1] text-[#0E1116] shadow-lg shadow-[#3DD6B0]/20"
                  : "bg-white hover:bg-gray-200 text-black"
              }`}
            >
              {joining ? "Joining..." : parsedRoomMeta.isStudy ? "Join Study Room →" : "Join Workspace →"}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}

function GuestJoinSection({
  displayName,
  setDisplayName,
}: {
  displayName: string;
  setDisplayName: (value: string) => void;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    async function detectSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(Boolean(session?.user));
    }
    detectSession();
  }, []);

  if (isLoggedIn === null) return null;
  if (isLoggedIn) {
    return <p className="mt-4 text-sm text-gray-300">You are logged in and will join with your account.</p>;
  }

  return (
    <div className="mt-4 rounded-xl border border-[#292929] bg-[#0f0f0f] p-4">
      <p className="text-sm text-[#c4b5fd]">You are joining as guest.</p>
      <input
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder="Display name (or we generate one)"
        className="mt-3 w-full rounded-lg border border-[#2a2a2a] bg-[#101010] px-3 py-2 outline-none focus:border-white"
      />
    </div>
  );
}
