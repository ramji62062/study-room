"use client";

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { type StudyTimerState } from "@/hooks/useStudyRealtime";

interface StudyFloatingPomodoroProps {
  timerState: StudyTimerState;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSetPreset: (seconds: number, mode: "focus" | "break") => void;
}

export default function StudyFloatingPomodoro({
  timerState,
  onStart,
  onPause,
  onReset,
  onSetPreset,
}: StudyFloatingPomodoroProps) {
  const { remainingSeconds, isRunning, mode } = timerState;

  // Format MM:SS
  const timeString = useMemo(() => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [remainingSeconds]);

  // Session progress dots (4 dots in a standard Pomodoro block)
  const sessionStep = 1; // 1 to 4

  return (
    <div
      aria-label="Focus timer widget"
      className="fixed top-16 right-3 z-30 w-[330px] bg-[#0E1116]/85 backdrop-blur-md border border-[#2B3340]/70 rounded-2xl p-4 shadow-2xl font-['DM_Sans',sans-serif] select-none"
    >
      {/* Header with Title and 4 Progress Dots */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#8B97A7]">Focus session</span>
        <div className="flex items-center gap-1.5" title="Pomodoro cycle progress">
          {[1, 2, 3, 4].map((dot) => (
            <span
              key={dot}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                dot <= sessionStep ? "bg-[#F2B84B]" : "bg-[#2B3340]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Countdown and Start/Pause Button Row */}
      <div className="flex items-center justify-between gap-3 my-1">
        {/* Big 52px Monospace Countdown */}
        <div className="font-mono text-[52px] font-bold tracking-tight text-[#E6EDF3] leading-none">
          {timeString}
        </div>

        {/* Amber Start / Pause button */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={isRunning ? onPause : onStart}
            aria-label={isRunning ? "Pause timer" : "Start timer"}
            className="h-11 px-5 rounded-xl bg-[#F2B84B] hover:bg-[#e0a83e] active:scale-95 text-[#0E1116] font-bold text-sm shadow-lg shadow-[#F2B84B]/20 transition-all flex items-center justify-center"
          >
            {isRunning ? "Pause" : "Start"}
          </button>

          <button
            onClick={onReset}
            aria-label="Reset timer"
            title="Reset timer"
            className="h-11 w-9 rounded-xl bg-[#141920] hover:bg-[#232A35] text-[#8B97A7] hover:text-[#E6EDF3] border border-[#2B3340] flex items-center justify-center transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Mode Tabs: Pomodoro | Short break | Long break */}
      <div className="flex items-center gap-4 pt-3 border-t border-[#232A35] text-xs">
        <button
          onClick={() => onSetPreset(25 * 60, "focus")}
          aria-pressed={mode === "focus" && timerState.durationSeconds === 25 * 60}
          className={`font-semibold pb-0.5 transition-colors relative ${
            mode === "focus"
              ? "text-[#E6EDF3]"
              : "text-[#8B97A7] hover:text-[#E6EDF3]"
          }`}
        >
          Pomodoro
          {mode === "focus" && (
            <span className="absolute -bottom-1 inset-x-0 h-0.5 bg-[#E6EDF3] rounded-full" />
          )}
        </button>

        <button
          onClick={() => onSetPreset(5 * 60, "break")}
          aria-pressed={mode === "break" && timerState.durationSeconds === 5 * 60}
          className={`font-medium pb-0.5 transition-colors relative ${
            mode === "break" && timerState.durationSeconds === 5 * 60
              ? "text-[#E6EDF3] font-semibold"
              : "text-[#8B97A7] hover:text-[#E6EDF3]"
          }`}
        >
          Short break
          {mode === "break" && timerState.durationSeconds === 5 * 60 && (
            <span className="absolute -bottom-1 inset-x-0 h-0.5 bg-[#E6EDF3] rounded-full" />
          )}
        </button>

        <button
          onClick={() => onSetPreset(15 * 60, "break")}
          aria-pressed={mode === "break" && timerState.durationSeconds === 15 * 60}
          className={`font-medium pb-0.5 transition-colors relative ${
            mode === "break" && timerState.durationSeconds === 15 * 60
              ? "text-[#E6EDF3] font-semibold"
              : "text-[#8B97A7] hover:text-[#E6EDF3]"
          }`}
        >
          Long break
          {mode === "break" && timerState.durationSeconds === 15 * 60 && (
            <span className="absolute -bottom-1 inset-x-0 h-0.5 bg-[#E6EDF3] rounded-full" />
          )}
        </button>
      </div>
    </div>
  );
}
