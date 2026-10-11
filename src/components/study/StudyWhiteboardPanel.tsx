"use client";

import dynamic from "next/dynamic";
import { X } from "lucide-react";

const Whiteboard = dynamic(() => import("@/components/Whiteboard"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#141920] text-xs text-[#8B97A7]">
      Loading whiteboard canvas...
    </div>
  ),
});

interface StudyWhiteboardPanelProps {
  roomId: string;
  currentUserId: string;
  onClose: () => void;
}

export default function StudyWhiteboardPanel({
  roomId,
  currentUserId,
  onClose,
}: StudyWhiteboardPanelProps) {
  return (
    <div className="w-full h-full flex flex-col bg-[#141920] border border-[#232A35] rounded-xl overflow-hidden font-['DM_Sans',sans-serif] shadow-sm select-none">
      {/* Header */}
      <div className="h-[52px] bg-[#141920] border-b border-[#232A35] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-[#E6EDF3]">Whiteboard</span>
          <span className="text-[11px] font-semibold text-[#82AAFF] bg-[#172554] px-2 py-0.5 rounded-full border border-[#1E3A8A]">
            Shared
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-[#8B97A7] hover:text-[#E6EDF3] transition-colors"
          title="Close whiteboard"
          aria-label="Close whiteboard"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 relative bg-[#0E1116] overflow-hidden">
        <Whiteboard roomId={roomId} currentUserId={currentUserId} />
      </div>
    </div>
  );
}
