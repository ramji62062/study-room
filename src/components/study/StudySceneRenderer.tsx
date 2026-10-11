"use client";

import { useMemo } from "react";
import { type StudyScene } from "@/config/studyScenes";

interface StudySceneRendererProps {
  scene: StudyScene;
  lowMotion?: boolean;
}

export default function StudySceneRenderer({ scene, lowMotion = false }: StudySceneRendererProps) {
  // Check prefers-reduced-motion
  const isReducedMotion = useMemo(() => {
    if (lowMotion) return true;
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  }, [lowMotion]);

  return (
    <div
      className="fixed inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0 transition-colors duration-700"
      style={{
        background: scene.gradient,
      }}
    >
      {/* Background radial gradient bloom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 75%, rgba(245, 158, 11, 0.12) 0%, rgba(20, 25, 34, 0.6) 55%, rgba(10, 13, 18, 0.95) 100%)",
        }}
      />

      {/* Atmospheric Window Pane Perspective (matches uploaded screenshot) */}
      {scene.windowOverlay && (
        <div className="absolute inset-0 flex flex-col justify-between">
          {/* Main Upper Window Pane Grid */}
          <div className="relative flex-1 w-full flex items-stretch border-b-[6px] border-[#0a0d12]/90">
            {/* 4 Vertical Window Panes with Divider Mullions */}
            {[0, 1, 2, 3].map((paneIdx) => (
              <div
                key={paneIdx}
                className="relative flex-1 h-full border-r-[8px] border-[#0a0d12]/95 last:border-r-0 overflow-hidden"
              >
                {/* Subtle vertical rain streaks inside pane */}
                {!isReducedMotion && (
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(105deg, transparent, transparent 18px, rgba(255, 255, 255, 0.08) 19px, transparent 20px)",
                      backgroundSize: "200% 200%",
                      animation: "rainDrift 16s linear infinite",
                    }}
                  />
                )}
                {/* Diagonal glass reflection highlight */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 40%, rgba(255,255,255,0.015) 100%)",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Bottom Desk Surface with Warm Ambient Lamp Glow */}
          <div className="relative h-[22vh] w-full bg-[#120f0d]/90 border-t border-[#231e1a]/60 flex items-center justify-center">
            {/* Ambient lamp glow orb */}
            <div
              className="absolute -top-12 w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-85"
              style={{
                background: "radial-gradient(circle, rgba(245, 178, 75, 0.6) 0%, rgba(217, 119, 6, 0.2) 60%, transparent 100%)",
              }}
            />
            {/* Subtle desk grain line */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#f59e0b]/40 to-transparent" />
          </div>
        </div>
      )}

      {/* Global CSS for seamless rain drift */}
      <style jsx global>{`
        @keyframes rainDrift {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: -100% 100%;
          }
        }
      `}</style>
    </div>
  );
}
