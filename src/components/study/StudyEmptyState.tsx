"use client";

import { type PanelId } from "./StudyPanelBar";

interface StudyEmptyStateProps {
  onOpenPanel: (panel: PanelId) => void;
  onStartFocus: (durationMinutes: number, breakMinutes: number) => void;
}

const CARDS: Array<{
  id: PanelId;
  title: string;
  desc: string;
  badgeContent: string;
  badgeStyle: string;
}> = [
  {
    id: "editor",
    title: "Editor",
    desc: "Write and run code in your browser. Private until you share it.",
    badgeContent: "</>",
    badgeStyle: "bg-[#12342E] text-[#3DD6B0]",
  },
  {
    id: "whiteboard",
    title: "Whiteboard",
    desc: "Sketch ideas and diagrams together with the room.",
    badgeContent: "~",
    badgeStyle: "bg-[#172554] text-[#82AAFF]",
  },
  {
    id: "notes",
    title: "Notes",
    desc: "Your own notes. Only you can see them.",
    badgeContent: "Aa",
    badgeStyle: "bg-[#451A03] text-[#F2B84B]",
  },
  {
    id: "timer",
    title: "Timer",
    desc: "A shared focus timer with Pomodoro presets.",
    badgeContent: "25",
    badgeStyle: "bg-[#451A03] text-[#F2B84B]",
  },
  {
    id: "video",
    title: "Video",
    desc: "Camera and mic stay off until you switch them on.",
    badgeContent: "cam",
    badgeStyle: "bg-[#3B0764] text-[#C792EA]",
  },
  {
    id: "chat",
    title: "Chat",
    desc: "Talk with everyone in the room.",
    badgeContent: "...",
    badgeStyle: "bg-[#1E293B] text-[#82AAFF]",
  },
];

export default function StudyEmptyState({
  onOpenPanel,
  onStartFocus,
}: StudyEmptyStateProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 sm:p-10 overflow-y-auto font-['DM_Sans',sans-serif]">
      {/* Outer Dashed Border Container */}
      <div className="w-full max-w-4xl border border-dashed border-[#232A35] rounded-3xl p-8 sm:p-12 flex flex-col items-center text-center bg-[#0E1116]/40 backdrop-blur-sm">
        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#E6EDF3] tracking-tight mb-2">
          Your desk is clear
        </h2>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-[#8B97A7] leading-relaxed max-w-md mb-8">
          Open only what you need. Your layout is private to you.
          <br />
          Nothing is shared until you choose to share it.
        </p>

        {/* 6 Panel Cards Grid (3 columns x 2 rows) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full text-left mb-10">
          {CARDS.map((card) => (
            <button
              key={card.id}
              onClick={() => onOpenPanel(card.id)}
              className="p-5 rounded-2xl bg-[#141920] border border-[#232A35] hover:border-[#3DD6B0]/50 hover:bg-[#181F28] transition-all flex flex-col justify-between group cursor-pointer text-left min-h-[140px] shadow-sm hover:-translate-y-0.5"
            >
              {/* Badge Icon */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs mb-3 ${card.badgeStyle}`}
              >
                {card.badgeContent}
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#E6EDF3] group-hover:text-white mb-1.5 transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-[#8B97A7] leading-relaxed">
                  {card.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Quick start focus session row */}
        <div className="flex items-center gap-3 flex-wrap justify-center text-xs text-[#8B97A7]">
          <span className="font-medium">Quick start a focus session:</span>

          <button
            onClick={() => onStartFocus(25, 5)}
            className="px-3.5 py-1.5 rounded-lg bg-[#141920] border border-[#2B3340] text-xs font-bold text-[#E6EDF3] hover:border-[#3DD6B0] hover:text-[#3DD6B0] transition-colors"
          >
            25 / 5
          </button>

          <button
            onClick={() => onStartFocus(50, 10)}
            className="px-3.5 py-1.5 rounded-lg bg-[#141920] border border-[#2B3340] text-xs font-bold text-[#E6EDF3] hover:border-[#3DD6B0] hover:text-[#3DD6B0] transition-colors"
          >
            50 / 10
          </button>

          <button
            onClick={() => {
              const customMinutes = prompt("Enter focus duration in minutes:", "30");
              if (customMinutes && !isNaN(Number(customMinutes))) {
                onStartFocus(Number(customMinutes), 5);
              }
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#141920] border border-[#2B3340] text-xs font-bold text-[#E6EDF3] hover:border-[#3DD6B0] hover:text-[#3DD6B0] transition-colors"
          >
            Custom
          </button>
        </div>
      </div>
    </div>
  );
}
