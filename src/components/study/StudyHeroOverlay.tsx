"use client";

import { Eye, EyeOff } from "lucide-react";

interface StudyHeroOverlayProps {
  title: string;
  subtitle: string;
  visible: boolean;
  onToggleVisible: () => void;
}

export default function StudyHeroOverlay({
  title,
  subtitle,
  visible,
  onToggleVisible,
}: StudyHeroOverlayProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex items-center justify-center font-['DM_Sans',sans-serif] select-none">
      {visible ? (
        <div className="text-center px-4 max-w-4xl relative group pointer-events-auto">
          {/* Main Title */}
          <h1
            className="text-6xl sm:text-7xl md:text-8xl font-black tracking-[-0.04em] text-[#E6EDF3] leading-none mb-3"
            style={{
              textShadow:
                "0 4px 28px rgba(0, 0, 0, 0.85), 0 2px 10px rgba(0, 0, 0, 0.9)",
            }}
          >
            {title}
          </h1>

          {/* Subtitle */}
          <p
            className="text-sm sm:text-base md:text-xl font-bold uppercase tracking-[0.25em] text-[#E6EDF3]/85"
            style={{
              textShadow:
                "0 3px 18px rgba(0, 0, 0, 0.85), 0 1px 6px rgba(0, 0, 0, 0.9)",
            }}
          >
            {subtitle}
          </p>

          {/* Subtle Hover Action to hide text */}
          <button
            onClick={onToggleVisible}
            title="Hide center text"
            aria-label="Hide scene title overlay"
            className="opacity-0 group-hover:opacity-100 transition-opacity mt-4 px-2.5 py-1 rounded-lg bg-[#0E1116]/70 hover:bg-[#141920] border border-[#2B3340] text-[11px] text-[#8B97A7] hover:text-[#E6EDF3] inline-flex items-center gap-1.5 shadow-md backdrop-blur-sm"
          >
            <EyeOff size={12} />
            <span>Hide title</span>
          </button>
        </div>
      ) : (
        /* Floating Pill to bring text back when hidden */
        <button
          onClick={onToggleVisible}
          aria-label="Show scene title overlay"
          className="fixed bottom-24 right-5 pointer-events-auto p-2 rounded-xl bg-[#0E1116]/80 hover:bg-[#141920] border border-[#2B3340] text-[#8B97A7] hover:text-[#E6EDF3] shadow-lg backdrop-blur-md transition-all active:scale-95"
          title="Show scene title"
        >
          <Eye size={16} />
        </button>
      )}
    </div>
  );
}
