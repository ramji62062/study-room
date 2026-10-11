"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  Hand,
  VolumeX,
  Pin,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Users,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { type SfuPeer, type HandRaiseEntry } from "@/hooks/useMediasoup";

interface SfuMediaStageProps {
  peers: SfuPeer[];
  micOn: boolean;
  cameraOn: boolean;
  screenOn: boolean;
  localVideoStream?: MediaStream;
  currentUserId: string;
  currentUserName: string;
  isHost?: boolean;
  activeSpeakerSocketId: string | null;
  spotlightPeerId: string | null;
  handRaises: HandRaiseEntry[];
  isHandRaised: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleRaiseHand: () => void;
  onMuteAll: () => void;
  onToggleSpotlight: (peerId: string) => void;
  onLowerHand?: (socketId: string) => void;
}

// Media element wrapper for remote video/audio playback
function VideoPlayer({
  stream,
  isMuted = false,
  className = "",
}: {
  stream?: MediaStream;
  isMuted?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMuted}
      className={`w-full h-full object-cover rounded-xl ${className}`}
    />
  );
}

function AudioPlayer({ stream }: { stream?: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;
  return <audio ref={audioRef} autoPlay playsInline />;
}

export default function SfuMediaStage({
  peers,
  micOn,
  cameraOn,
  screenOn,
  localVideoStream,
  currentUserId,
  currentUserName,
  isHost = false,
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
  onLowerHand,
}: SfuMediaStageProps) {
  const [page, setPage] = useState(0);
  const pageSize = 5; // Top 5 tiles on filmstrip + 1 local preview

  // Identify spotlight peer
  const spotlightPeer = peers.find((p) => p.socketId === spotlightPeerId) ||
    peers.find((p) => p.screenOn) || // Prioritize screen share if any
    peers.find((p) => p.socketId === activeSpeakerSocketId) ||
    peers[0] ||
    null;

  // Filmstrip peers (exclude spotlight peer from strip if in large stage)
  const filmstripPeers = peers.filter((p) => p.socketId !== spotlightPeer?.socketId);
  const totalPages = Math.max(1, Math.ceil(filmstripPeers.length / pageSize));
  const visibleFilmstrip = filmstripPeers.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="w-full flex flex-col bg-zinc-950/80 rounded-2xl border border-zinc-800/80 shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-300">
      {/* Background audio playback for all remote audio streams (zero CPU lag) */}
      {peers.map((peer) => (
        <AudioPlayer key={`audio-${peer.socketId}`} stream={peer.audioStream} />
      ))}

      {/* Main Stage Spotlight Area */}
      <div className="relative w-full h-[320px] md:h-[420px] bg-black/90 flex items-center justify-center overflow-hidden">
        {spotlightPeer && spotlightPeer.videoStream ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <VideoPlayer
              stream={spotlightPeer.videoStream}
              className="object-contain max-h-full"
            />
            {/* Spotlight Overlay Info */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {spotlightPeer.screenOn ? "🖥️ Screen Share: " : "🎤 Spotlight: "}
              {spotlightPeer.name}
            </div>

            {spotlightPeer.isSpeaking && (
              <div className="absolute inset-0 border-4 border-emerald-500/80 rounded-xl pointer-events-none transition-all duration-200" />
            )}
          </div>
        ) : localVideoStream ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <VideoPlayer
              stream={localVideoStream}
              isMuted={true}
              className="object-contain max-h-full"
            />
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold text-white">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {screenOn ? "🖥️ Your Screen" : "📹 You (Presenter View)"}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 shadow-inner">
              <Users className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-base font-semibold text-zinc-200">Stage is Ready</h3>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">
              Turn on your camera or screen share to broadcast to up to 250 students via ultra-low latency SFU.
            </p>
          </div>
        )}

        {/* Hand Raise Live Counter Pill */}
        {handRaises.length > 0 && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md">
            <Hand className="w-3.5 h-3.5 animate-bounce" />
            <span>{handRaises.length} Raised Hand{handRaises.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Filmstrip / Active Attendees Strip */}
      <div className="relative w-full bg-zinc-900/60 border-t border-zinc-800/80 px-4 py-3 flex items-center gap-3">
        {/* Local Participant Tile */}
        <div className="relative w-32 h-20 md:w-40 md:h-24 bg-zinc-950 rounded-xl border border-zinc-800 flex-shrink-0 flex items-center justify-center overflow-hidden group shadow-md">
          {cameraOn && localVideoStream ? (
            <VideoPlayer stream={localVideoStream} isMuted={true} />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
                {currentUserName.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-[10px] text-zinc-500 mt-1">You</span>
            </div>
          )}
          <div className="absolute bottom-1.5 left-2 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">
            <span>You</span>
            {micOn ? <Mic className="w-2.5 h-2.5 text-emerald-400" /> : <MicOff className="w-2.5 h-2.5 text-zinc-500" />}
          </div>
        </div>

        {/* Remote Filmstrip Tiles */}
        <div className="flex-1 flex items-center gap-2.5 overflow-x-hidden">
          {visibleFilmstrip.map((peer) => (
            <div
              key={peer.socketId}
              onClick={() => onToggleSpotlight(peer.socketId)}
              className={`relative w-32 h-20 md:w-40 md:h-24 bg-zinc-950 rounded-xl border flex-shrink-0 flex items-center justify-center overflow-hidden cursor-pointer transition-all hover:scale-[1.02] ${
                peer.isSpeaking
                  ? "border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : peer.socketId === spotlightPeerId
                  ? "border-blue-500"
                  : "border-zinc-800"
              }`}
            >
              {peer.videoStream ? (
                <VideoPlayer stream={peer.videoStream} />
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
                    {peer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 truncate max-w-[100px]">{peer.name}</span>
                </div>
              )}

              {/* Status badges */}
              <div className="absolute bottom-1.5 left-2 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-white">
                <span className="truncate max-w-[70px]">{peer.name}</span>
                {peer.micOn ? <Mic className="w-2.5 h-2.5 text-emerald-400" /> : <MicOff className="w-2.5 h-2.5 text-zinc-500" />}
              </div>

              {peer.handRaised && (
                <div className="absolute top-1.5 right-1.5 bg-amber-500 text-black p-1 rounded-full text-[10px]">
                  <Hand className="w-3 h-3" />
                </div>
              )}
            </div>
          ))}

          {visibleFilmstrip.length === 0 && (
            <div className="text-xs text-zinc-500 pl-2">
              {peers.length === 0
                ? "No other attendees yet. Share the room code to invite students!"
                : "Active speaker or presenter shown in hero stage."}
            </div>
          )}
        </div>

        {/* Filmstrip Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1 pl-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-zinc-400 px-1">
              {page + 1}/{totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Stage Action & Media Controls Bar */}
      <div className="bg-zinc-950 px-6 py-3 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-3">
        {/* Left: Room Status & Participant Count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Mediasoup SFU Active</span>
          </div>
          <span className="text-zinc-600">|</span>
          <div className="flex items-center gap-1 text-xs text-zinc-300 font-medium">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span>{peers.length + 1} connected (up to 250 capacity)</span>
          </div>
        </div>

        {/* Center: Essential Stream Controls */}
        <div className="flex items-center gap-2">
          {/* Mic */}
          <button
            onClick={onToggleMic}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              micOn
                ? "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700"
                : "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
            }`}
          >
            {micOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-red-400" />}
            <span>{micOn ? "Mute" : "Unmute"}</span>
          </button>

          {/* Camera */}
          <button
            onClick={onToggleCamera}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              cameraOn
                ? "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800"
            }`}
          >
            {cameraOn ? <Video className="w-4 h-4 text-blue-400" /> : <VideoOff className="w-4 h-4" />}
            <span>{cameraOn ? "Stop Cam" : "Start Cam"}</span>
          </button>

          {/* Screen Share */}
          <button
            onClick={onToggleScreenShare}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              screenOn
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800"
            }`}
          >
            <ScreenShare className="w-4 h-4" />
            <span>{screenOn ? "Stop Share" : "Share Screen"}</span>
          </button>

          {/* Raise Hand */}
          <button
            onClick={onToggleRaiseHand}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              isHandRaised
                ? "bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20"
                : "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800"
            }`}
          >
            <Hand className="w-4 h-4" />
            <span>{isHandRaised ? "Lower Hand" : "Raise Hand"}</span>
          </button>
        </div>

        {/* Right: Host Moderation Tools */}
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={onMuteAll}
              title="Mute all student microphones"
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold transition-colors"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Mute All Students</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
