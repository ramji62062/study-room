"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, Copy, Check, Play, Pause, RotateCcw, UserPlus, LogOut } from "lucide-react";
import { type StudyTimerState } from "@/hooks/useStudyRealtime";

interface StudyTopBarProps {
  roomName: string;
  roomCode: string;
  memberCount: number;
  maxSeats?: number;
  timerState: StudyTimerState;
  connectionState: "connected" | "reconnecting" | "offline";
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResetTimer: () => void;
  onLeave: () => void;
}

export default function StudyTopBar({
  roomName,
  roomCode,
  memberCount,
  maxSeats = 5,
  timerState,
  connectionState,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onLeave,
}: StudyTopBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url || roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const minutes = Math.floor(timerState.remainingSeconds / 60);
  const seconds = timerState.remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <header className="h-14 bg-[#0E1116] border-b border-[#232A35] px-4 flex items-center justify-between select-none z-30 font-['DM_Sans',sans-serif]">
      {/* Left: Logo & Room details */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-bold text-[#E6EDF3] hover:text-white no-underline transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-[#3DD6B0] text-[#0E1116] flex items-center justify-center font-black text-xs">
            &lt;/&gt;
          </div>
          <span>CodeTogether</span>
        </Link>

        <span className="text-[#475264] text-sm">/</span>

        <h1 className="text-sm font-semibold text-[#E6EDF3] truncate max-w-[180px] sm:max-w-xs md:max-w-md m-0">
          {roomName || "Study Room"}
        </h1>

        {roomCode && (
          <span className="font-['JetBrains_Mono',monospace] text-xs font-semibold px-2 py-0.5 rounded bg-[#141920] border border-[#2B3340] text-[#8B97A7] uppercase tracking-wider">
            {roomCode}
          </span>
        )}
      </div>

      {/* Center: Shared Focus Timer Pill */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#141920] border border-[#2B3340] shadow-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              timerState.isRunning ? "bg-[#F2B84B] animate-pulse" : "bg-[#475264]"
            }`}
          />
          <span className="text-xs text-[#8B97A7] font-medium">Focus</span>
          <span className="font-['JetBrains_Mono',monospace] text-sm font-bold text-[#E6EDF3] tracking-wide">
            {timeFormatted}
          </span>
          <span className="text-[11px] text-[#475264] font-medium">25 / 5</span>

          <div className="flex items-center gap-1 pl-1 border-l border-[#232A35]">
            {timerState.isRunning ? (
              <button
                onClick={onPauseTimer}
                className="p-1 rounded text-[#8B97A7] hover:text-[#E6EDF3] hover:bg-[#232A35] transition-colors"
                title="Pause Focus Timer"
                aria-label="Pause Focus Timer"
              >
                <Pause size={12} />
              </button>
            ) : (
              <button
                onClick={onStartTimer}
                className="text-xs font-bold text-[#3DD6B0] hover:text-white px-1.5 py-0.5 rounded hover:bg-[#12342E] transition-colors"
                title="Start Focus Timer"
                aria-label="Start Focus Timer"
              >
                Start
              </button>
            )}

            <button
              onClick={onResetTimer}
              className="p-1 rounded text-[#475264] hover:text-[#8B97A7] transition-colors"
              title="Reset Timer"
              aria-label="Reset Timer"
            >
              <RotateCcw size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Seat count, Connection, Invite, Leave */}
      <div className="flex items-center gap-3">
        {/* Connection status indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#8B97A7]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connectionState === "connected"
                ? "bg-[#3DD6B0]"
                : connectionState === "reconnecting"
                ? "bg-[#F2B84B] animate-ping"
                : "bg-[#FF8A8A]"
            }`}
          />
          <span className="capitalize">{connectionState}</span>
        </div>

        {/* Seat count */}
        <span className="text-xs text-[#8B97A7] font-medium">
          {Math.min(memberCount || 1, maxSeats)} of {maxSeats} seats
        </span>

        {/* Invite button */}
        <button
          onClick={handleCopyInvite}
          className="h-8 px-3 rounded-lg bg-[#141920] border border-[#2B3340] text-xs font-bold text-[#E6EDF3] hover:border-[#8B97A7] transition-colors flex items-center gap-1.5"
          title="Copy room invitation link"
        >
          {copied ? <Check size={13} className="text-[#3DD6B0]" /> : <UserPlus size={13} />}
          <span>{copied ? "Copied" : "Invite"}</span>
        </button>

        {/* Leave button */}
        <button
          onClick={onLeave}
          className="h-8 px-3 rounded-lg bg-[#2A1B1E] border border-[#3E2328] text-xs font-bold text-[#FF8A8A] hover:bg-[#382025] transition-colors flex items-center gap-1.5"
          title="Leave Study Room"
        >
          <LogOut size={13} />
          <span>Leave</span>
        </button>
      </div>
    </header>
  );
}
