"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Video, VideoOff, Copy, Check, Flame, Share2 } from "lucide-react";

interface StudySceneTopBarProps {
  roomName: string;
  roomCode: string;
  currentUser: any;
  cameraActive: boolean;
  onToggleCamera: () => void;
}

function parseRoomTitle(raw: any): string {
  if (!raw) return "Study Room";
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed.title || parsed.name || "Study Room";
      } catch (_) {}
    }
    return trimmed;
  }
  if (typeof raw === "object") {
    return raw.title || raw.name || "Study Room";
  }
  return String(raw);
}

export default function StudySceneTopBar({
  roomName,
  roomCode,
  currentUser,
  cameraActive,
  onToggleCamera,
}: StudySceneTopBarProps) {
  const router = useRouter();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const handleCopyCode = () => {
    if (typeof window !== "undefined" && roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyInvite = () => {
    if (typeof window !== "undefined" && roomCode) {
      const inviteUrl = `${window.location.origin}/join/${roomCode}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const isGuest = !currentUser?.email || currentUser?.email?.startsWith("guest");

  return (
    <header className="fixed top-3 inset-x-3 h-11 z-30 flex items-center justify-between pointer-events-none font-['DM_Sans',sans-serif]">
      {/* Left controls */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Home Button */}
        <button
          onClick={() => router.push("/dashboard")}
          aria-label="Back to dashboard"
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#0E1116]/80 hover:bg-[#141920] border border-[#2B3340]/60 text-[#E6EDF3] backdrop-blur-md shadow-md transition-all active:scale-95"
          title="Back to Dashboard"
        >
          <Home size={16} />
        </button>

        {/* User state / Sign in */}
        {isGuest ? (
          <button
            onClick={() => router.push("/login")}
            className="h-10 px-3.5 flex items-center justify-center rounded-xl bg-[#0E1116]/80 hover:bg-[#141920] border border-[#2B3340]/60 text-xs font-medium text-[#E6EDF3] backdrop-blur-md shadow-md transition-all"
          >
            Sign in
          </button>
        ) : (
          <div className="h-10 px-3 flex items-center gap-2 rounded-xl bg-[#0E1116]/80 border border-[#2B3340]/60 text-xs text-[#E6EDF3] backdrop-blur-md shadow-md">
            <span className="w-6 h-6 rounded-full bg-[#1F5A4D] text-[#3DD6B0] flex items-center justify-center text-[11px] font-bold">
              {(currentUser?.user_metadata?.name || currentUser?.email || "U").slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden sm:inline font-medium truncate max-w-[120px]">
              {currentUser?.user_metadata?.name || currentUser?.email?.split("@")[0]}
            </span>
          </div>
        )}

        {/* Streak chip */}
        <div className="h-10 px-3 flex items-center gap-1.5 rounded-xl bg-[#0E1116]/80 border border-[#2B3340]/60 text-xs font-semibold text-[#F2B84B] backdrop-blur-md shadow-md">
          <Flame size={14} className="text-[#F2B84B] fill-[#F2B84B]" />
          <span>Day 1 streak</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Room name chip */}
        <div className="h-10 px-4 hidden md:flex items-center rounded-xl bg-[#0E1116]/80 border border-[#2B3340]/60 text-xs font-medium text-[#E6EDF3] backdrop-blur-md shadow-md truncate max-w-[200px]">
          {parseRoomTitle(roomName)}
        </div>

        {/* Copy Room Code Pill */}
        <button
          onClick={handleCopyCode}
          aria-label="Copy room code"
          className="h-10 px-3 flex items-center gap-1.5 rounded-xl bg-[#0E1116]/80 hover:bg-[#141920] border border-[#2B3340]/60 text-xs font-mono font-bold text-[#82AAFF] backdrop-blur-md shadow-md transition-all active:scale-95"
          title="Click to copy room code"
        >
          <span className="text-[#8B97A7] font-sans text-[11px]">#</span>
          <span>{roomCode}</span>
          {copiedCode ? <Check size={13} className="text-[#3DD6B0]" /> : <Copy size={13} className="text-[#8B97A7]" />}
        </button>

        {/* Invite button */}
        <button
          onClick={handleCopyInvite}
          aria-label="Copy room invite link"
          className="h-10 px-3.5 sm:px-4 flex items-center gap-1.5 rounded-xl bg-[#3DD6B0] hover:bg-[#34c4a1] text-[#0E1116] text-xs font-bold shadow-lg shadow-[#3DD6B0]/20 transition-all active:scale-95"
          title="Copy invite URL"
        >
          {copiedInvite ? <Check size={14} /> : <Share2 size={14} />}
          <span>{copiedInvite ? "Copied" : "Invite"}</span>
        </button>

        {/* Camera toggle button */}
        <button
          onClick={onToggleCamera}
          aria-label={cameraActive ? "Close video stage" : "Open video stage"}
          aria-pressed={cameraActive}
          className={`h-10 w-10 flex items-center justify-center rounded-xl border backdrop-blur-md shadow-md transition-all active:scale-95 ${
            cameraActive
              ? "bg-[#12342E] text-[#3DD6B0] border-[#1F5A4D]"
              : "bg-[#0E1116]/80 hover:bg-[#141920] border-[#2B3340]/60 text-[#E6EDF3]"
          }`}
          title={cameraActive ? "Close Video Stage" : "Open Video Stage"}
        >
          {cameraActive ? <Video size={16} /> : <VideoOff size={16} />}
        </button>
      </div>
    </header>
  );
}
