"use client";

import { MessageSquare, Plus } from "lucide-react";
import { type StudyMember } from "@/hooks/useStudyRealtime";

interface StudyBottomDockProps {
  activePanels: {
    notes: boolean;
    whiteboard: boolean;
    editor: boolean;
    chat: boolean;
  };
  onTogglePanel: (panel: "notes" | "whiteboard" | "editor" | "chat") => void;
  members: StudyMember[];
  currentUserId: string;
  currentUserName: string;
}

const AVATAR_COLORS = [
  "bg-[#3DD6B0] text-[#0E1116]",
  "bg-[#82AAFF] text-[#0E1116]",
  "bg-[#F2B84B] text-[#0E1116]",
  "bg-[#C792EA] text-[#0E1116]",
  "bg-[#FF8A8A] text-[#0E1116]",
];

export default function StudyBottomDock({
  activePanels,
  onTogglePanel,
  members,
  currentUserId,
  currentUserName,
}: StudyBottomDockProps) {
  // Combine current user with other members
  const memberList = members.length > 0
    ? members
    : [{ socketId: "self", userId: currentUserId, name: currentUserName, status: "Studying" }];

  const visibleMembers = memberList.slice(0, 4);
  const overflowCount = Math.max(0, memberList.length - 4);

  return (
    <>
      {/* Center Dock */}
      <div
        aria-label="Panel dock"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[#0E1116]/85 backdrop-blur-md border border-[#2B3340]/70 rounded-2xl p-2 shadow-2xl font-['DM_Sans',sans-serif] select-none"
      >
        {/* + Notes */}
        <button
          onClick={() => onTogglePanel("notes")}
          aria-label="Toggle notes window"
          aria-pressed={activePanels.notes}
          className={`h-10 px-4 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center gap-1.5 ${
            activePanels.notes
              ? "bg-[#12342E] text-[#3DD6B0] border-[#1F5A4D] shadow-sm"
              : "bg-[#141920]/90 hover:bg-[#1c232d] text-[#E6EDF3] border-[#2B3340]"
          }`}
        >
          <span>+ Notes</span>
        </button>

        {/* + Whiteboard */}
        <button
          onClick={() => onTogglePanel("whiteboard")}
          aria-label="Toggle whiteboard window"
          aria-pressed={activePanels.whiteboard}
          className={`h-10 px-4 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center gap-1.5 ${
            activePanels.whiteboard
              ? "bg-[#12342E] text-[#3DD6B0] border-[#1F5A4D] shadow-sm"
              : "bg-[#141920]/90 hover:bg-[#1c232d] text-[#E6EDF3] border-[#2B3340]"
          }`}
        >
          <span>+ Whiteboard</span>
        </button>

        {/* + Editor */}
        <button
          onClick={() => onTogglePanel("editor")}
          aria-label="Toggle code editor window"
          aria-pressed={activePanels.editor}
          className={`h-10 px-4 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center gap-1.5 ${
            activePanels.editor
              ? "bg-[#12342E] text-[#3DD6B0] border-[#1F5A4D] shadow-sm"
              : "bg-[#141920]/90 hover:bg-[#1c232d] text-[#E6EDF3] border-[#2B3340]"
          }`}
        >
          <span>+ Editor</span>
        </button>

        {/* Member Avatars Stack */}
        <div className="flex items-center -space-x-2 pl-2 border-l border-[#2B3340] ml-1">
          {visibleMembers.map((m, idx) => {
            const initials = (m.name || "U").slice(0, 2).toUpperCase();
            const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            return (
              <div
                key={m.userId + idx}
                title={`${m.name}: ${m.status || "Studying"}`}
                className={`w-7 h-7 rounded-full border-2 border-[#0E1116] flex items-center justify-center text-[10px] font-bold shadow-md ${colorClass}`}
              >
                {initials}
              </div>
            );
          })}

          {overflowCount > 0 && (
            <div className="w-7 h-7 rounded-full border-2 border-[#0E1116] bg-[#232A35] text-[#8B97A7] flex items-center justify-center text-[10px] font-bold shadow-md">
              +{overflowCount}
            </div>
          )}
        </div>
      </div>

      {/* Floating Chat Round Button (Bottom Right) */}
      <button
        onClick={() => onTogglePanel("chat")}
        aria-label={activePanels.chat ? "Close chat window" : "Open chat window"}
        aria-pressed={activePanels.chat}
        className={`fixed bottom-4 right-4 z-30 w-13 h-13 p-3.5 rounded-full border backdrop-blur-md shadow-2xl flex items-center justify-center transition-all active:scale-95 ${
          activePanels.chat
            ? "bg-[#12342E] text-[#3DD6B0] border-[#1F5A4D]"
            : "bg-[#0E1116]/85 hover:bg-[#141920] border-[#2B3340] text-[#E6EDF3]"
        }`}
        title="Workspace Chat"
      >
        <MessageSquare size={20} />
      </button>
    </>
  );
}
