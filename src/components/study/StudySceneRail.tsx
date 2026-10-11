"use client";

import {
  Image as ImageIcon,
  Clock,
  FileText,
  PenTool,
  Code,
  Volume2,
  MessageSquare,
} from "lucide-react";

export type RailTabId = "scenes" | "timer" | "notes" | "board" | "editor" | "sounds" | "chat";

interface StudySceneRailProps {
  activeTab: RailTabId | null;
  onSelectTab: (tab: RailTabId) => void;
}

interface RailItem {
  id: RailTabId;
  label: string;
  icon: typeof ImageIcon;
}

const RAIL_ITEMS: RailItem[] = [
  { id: "scenes", label: "Scenes", icon: ImageIcon },
  { id: "timer", label: "Timer", icon: Clock },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "board", label: "Board", icon: PenTool },
  { id: "editor", label: "Editor", icon: Code },
  { id: "sounds", label: "Sounds", icon: Volume2 },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

export default function StudySceneRail({ activeTab, onSelectTab }: StudySceneRailProps) {
  return (
    <nav
      aria-label="Workspace tools"
      className="fixed top-16 left-3 z-30 w-[72px] bg-[#0E1116]/80 backdrop-blur-md border border-[#2B3340]/60 rounded-2xl p-2 flex flex-col items-center gap-1.5 shadow-2xl font-['DM_Sans',sans-serif]"
    >
      {RAIL_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            aria-label={item.label}
            aria-pressed={isActive}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-95 ${
              isActive
                ? "bg-[#232A35] text-[#3DD6B0] shadow-sm"
                : "text-[#8B97A7] hover:text-[#E6EDF3] hover:bg-[#141920]/60"
            }`}
          >
            <Icon size={19} className={isActive ? "text-[#3DD6B0]" : "currentColor"} />
            <span className="text-[10px] font-medium tracking-tight leading-none">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
