"use client";

import { X, Video, Mic, ScreenShare, Sparkles } from "lucide-react";
import SfuMediaStage from "@/components/SfuMediaStage";
import { type SfuPeer } from "@/hooks/useMediasoup";

interface StudyVideoPanelProps {
  peers: SfuPeer[];
  micOn: boolean;
  cameraOn: boolean;
  screenOn: boolean;
  localVideoStream?: MediaStream;
  localCameraStream?: MediaStream;
  localScreenStream?: MediaStream;
  currentUserId: string;
  currentUserName: string;
  activeSpeakerSocketId: string | null;
  spotlightPeerId: string | null;
  handRaises: any[];
  isHandRaised: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleRaiseHand: () => void;
  onMuteAll: () => void;
  onToggleSpotlight: (peerId: string) => void;
  onClose: () => void;
}

export default function StudyVideoPanel({
  peers,
  micOn,
  cameraOn,
  screenOn,
  localVideoStream,
  localCameraStream,
  localScreenStream,
  currentUserId,
  currentUserName,
  activeSpeakerSocketId,
  spotlightPeerId,
  handRaises,
  isHandRaised,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleRaiseHand,
  onMuteAll,
  onToggleSpotlight,
  onClose,
}: StudyVideoPanelProps) {
  return (
    <div className="w-full h-full flex flex-col bg-[#141920] border border-[#232A35] rounded-xl overflow-hidden font-['DM_Sans',sans-serif] shadow-sm select-none">
      {/* Header */}
      <div className="h-[52px] bg-[#141920] border-b border-[#232A35] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-[#E6EDF3]">Video Stage</span>
          <span className="text-[11px] font-semibold text-[#C792EA] bg-[#3B0764] px-2 py-0.5 rounded-full border border-[#581C87]">
            Shared
          </span>
          <span className="text-[11px] text-[#8B97A7] hidden sm:inline">
            Camera and mic stay off until you switch them on.
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-[#8B97A7] hover:text-[#E6EDF3] transition-colors"
          title="Close video stage"
          aria-label="Close video stage"
        >
          <X size={15} />
        </button>
      </div>

      {/* Video Stage Body */}
      <div className="flex-1 p-3 overflow-y-auto bg-[#0E1116]">
        <SfuMediaStage
          peers={peers}
          micOn={micOn}
          cameraOn={cameraOn}
          screenOn={screenOn}
          localVideoStream={localVideoStream}
          localCameraStream={localCameraStream}
          localScreenStream={localScreenStream}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          activeSpeakerSocketId={activeSpeakerSocketId}
          spotlightPeerId={spotlightPeerId}
          handRaises={handRaises}
          isHandRaised={isHandRaised}
          onToggleMic={onToggleMic}
          onToggleCamera={onToggleCamera}
          onToggleScreenShare={onToggleScreenShare}
          onToggleRaiseHand={onToggleRaiseHand}
          onMuteAll={onMuteAll}
          onToggleSpotlight={onToggleSpotlight}
        />
      </div>
    </div>
  );
}
