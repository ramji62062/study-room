"use client";

import { X, Play, Pause, RotateCcw } from "lucide-react";
import { type StudyTimerState } from "@/hooks/useStudyRealtime";

interface StudyTimerPanelProps {
  timerState: StudyTimerState;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSetPreset: (durationSeconds: number, mode: "focus" | "break") => void;
  onClose: () => void;
}

export default function StudyTimerPanel({
  timerState,
  onStart,
  onPause,
  onReset,
  onSetPreset,
  onClose,
}: StudyTimerPanelProps) {
  const minutes = Math.floor(timerState.remainingSeconds / 60);
  const seconds = timerState.remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="w-full h-full flex flex-col bg-[#141920] border border-[#232A35] rounded-xl overflow-hidden font-['DM_Sans',sans-serif] shadow-sm select-none">
      {/* Header */}
      <div className="h-[52px] bg-[#141920] border-b border-[#232A35] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-[#E6EDF3]">Shared Focus Timer</span>
          <span className="text-[11px] font-semibold text-[#F2B84B] bg-[#451A03] px-2 py-0.5 rounded-full border border-[#78350F]">
            Shared
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-[#8B97A7] hover:text-[#E6EDF3] transition-colors"
          title="Close timer panel"
          aria-label="Close timer panel"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <span className="text-xs uppercase tracking-widest text-[#8B97A7] font-bold mb-2">
          {timerState.mode === "focus" ? "Focus Interval" : "Rest Interval"}
        </span>

        <div className="font-['JetBrains_Mono',monospace] text-6xl font-black text-[#E6EDF3] my-4 tracking-wider">
          {timeFormatted}
        </div>

        <div className="flex items-center gap-3 my-6">
          {timerState.isRunning ? (
            <button
              onClick={onPause}
              className="h-10 px-5 rounded-xl bg-[#232A35] hover:bg-[#2B3340] text-[#E6EDF3] text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <Pause size={14} />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={onStart}
              className="h-10 px-6 rounded-xl bg-[#3DD6B0] hover:bg-[#34BE9C] text-[#0E1116] text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-[#3DD6B0]/20 transition-all hover:scale-105"
            >
              <Play size={14} fill="#0E1116" />
              <span>Start Session</span>
            </button>
          )}

          <button
            onClick={onReset}
            className="h-10 p-2.5 rounded-xl bg-[#141920] border border-[#2B3340] text-[#8B97A7] hover:text-white transition-colors"
            title="Reset to 25:00"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Presets */}
        <div className="flex gap-2">
          <button
            onClick={() => onSetPreset(25 * 60, "focus")}
            className="px-3.5 py-1.5 rounded-lg bg-[#0E1116] border border-[#2B3340] text-xs font-bold text-[#E6EDF3] hover:border-[#3DD6B0] hover:text-[#3DD6B0] transition-colors"
          >
            25m Focus
          </button>
          <button
            onClick={() => onSetPreset(50 * 60, "focus")}
            className="px-3.5 py-1.5 rounded-lg bg-[#0E1116] border border-[#2B3340] text-xs font-bold text-[#E6EDF3] hover:border-[#3DD6B0] hover:text-[#3DD6B0] transition-colors"
          >
            50m Focus
          </button>
          <button
            onClick={() => onSetPreset(5 * 60, "break")}
            className="px-3.5 py-1.5 rounded-lg bg-[#0E1116] border border-[#2B3340] text-xs font-bold text-[#82AAFF] hover:border-[#82AAFF] transition-colors"
          >
            5m Break
          </button>
        </div>
      </div>
    </div>
  );
}
