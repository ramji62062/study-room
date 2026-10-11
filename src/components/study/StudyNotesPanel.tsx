"use client";

import { useState } from "react";
import { X, Lock, Check } from "lucide-react";

interface StudyNotesPanelProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  onClose: () => void;
}

const DEFAULT_NOTES = `Process scheduling
FCFS is simple but suffers from the convoy effect.
SJF gives the lowest average wait, but needs burst times.
Round Robin: the time quantum decides responsiveness.

Revise tomorrow
Deadlock conditions and Banker's algorithm
Paging vs segmentation
`;

export default function StudyNotesPanel({
  initialContent = DEFAULT_NOTES,
  onContentChange,
  onClose,
}: StudyNotesPanelProps) {
  const [content, setContent] = useState(initialContent);
  const [isShared, setIsShared] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onContentChange?.(e.target.value);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#141920] border border-[#232A35] rounded-xl overflow-hidden font-['DM_Sans',sans-serif] shadow-sm select-none">
      {/* 1. Header (52px) */}
      <div className="h-[52px] bg-[#141920] border-b border-[#232A35] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-[#E6EDF3]">Notes</span>
          <span className="text-[11px] font-semibold text-[#8B97A7] bg-[#1C232D] px-2 py-0.5 rounded-full border border-[#2B3340]">
            {isShared ? "Shared" : "Private"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShared(!isShared)}
            className="text-xs text-[#8B97A7] hover:text-[#E6EDF3] transition-colors px-2 py-1 rounded bg-[#0E1116] border border-[#2B3340]"
          >
            {isShared ? "Make Private" : "Share with Room"}
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#8B97A7] hover:text-[#E6EDF3] transition-colors"
            title="Close notes panel"
            aria-label="Close notes panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. Notes Body */}
      <div className="flex-1 p-5 overflow-y-auto bg-[#141920]">
        <textarea
          value={content}
          onChange={handleChange}
          placeholder="Write class notes, reminders, or bullet points here..."
          className="w-full h-full bg-transparent border-none outline-none resize-none text-sm text-[#E6EDF3] leading-relaxed font-sans placeholder-[#475264]"
          style={{ whiteSpace: "pre-wrap" }}
        />
      </div>
    </div>
  );
}
