"use client";

export type PanelId = "editor" | "whiteboard" | "notes" | "timer" | "video" | "chat";

interface StudyPanelBarProps {
  activePanels: Record<PanelId, boolean>;
  onTogglePanel: (panel: PanelId) => void;
  roomMode: "silent" | "discussion";
  onToggleRoomMode: (mode: "silent" | "discussion") => void;
}

const PANELS: Array<{ id: PanelId; label: string }> = [
  { id: "editor", label: "Editor" },
  { id: "whiteboard", label: "Whiteboard" },
  { id: "notes", label: "Notes" },
  { id: "timer", label: "Timer" },
  { id: "video", label: "Video" },
  { id: "chat", label: "Chat" },
];

export default function StudyPanelBar({
  activePanels,
  onTogglePanel,
  roomMode,
  onToggleRoomMode,
}: StudyPanelBarProps) {
  return (
    <div className="h-14 bg-[#0E1116] border-b border-[#232A35] px-4 flex items-center justify-between select-none font-['DM_Sans',sans-serif]">
      {/* Left: Add panel label & 6 toggle buttons */}
      <div className="flex items-center gap-2.5 overflow-x-auto py-1">
        <span className="text-xs text-[#8B97A7] font-semibold pr-1 whitespace-nowrap">
          Add panel
        </span>

        {PANELS.map((p) => {
          const isActive = Boolean(activePanels[p.id]);
          return (
            <button
              key={p.id}
              onClick={() => onTogglePanel(p.id)}
              className={`h-9 px-3.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? "bg-[#12342E] text-[#3DD6B0] border-[#1F5A4D] shadow-sm"
                  : "bg-[#141920] text-[#8B97A7] border-[#2B3340] hover:text-[#E6EDF3] hover:border-[#3E495B]"
              }`}
            >
              <span>+</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Silent / Discussion Segmented Control */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#141920] border border-[#2B3340] flex-shrink-0">
        <button
          onClick={() => onToggleRoomMode("silent")}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            roomMode === "silent"
              ? "bg-[#232A35] text-[#E6EDF3] shadow-sm"
              : "text-[#8B97A7] hover:text-[#E6EDF3]"
          }`}
        >
          Silent
        </button>
        <button
          onClick={() => onToggleRoomMode("discussion")}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            roomMode === "discussion"
              ? "bg-[#232A35] text-[#E6EDF3] shadow-sm"
              : "text-[#8B97A7] hover:text-[#E6EDF3]"
          }`}
        >
          Discussion
        </button>
      </div>
    </div>
  );
}
