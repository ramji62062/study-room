"use client";

import { useState } from "react";
import { Search, Volume2, VolumeX, Play, Pause, HelpCircle, Sliders } from "lucide-react";
import { STUDY_SCENES, type StudyScene } from "@/config/studyScenes";

interface StudySceneDrawerProps {
  currentScene: StudyScene;
  onSelectScene: (scene: StudyScene) => void;
  isSceneShared: boolean;
  onToggleSceneShared: () => void;
  canShareScene: boolean;
  isAudioPlaying: boolean;
  onToggleAudio: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onResetLayout: () => void;
  lowMotion: boolean;
  onToggleLowMotion: () => void;
  onClose: () => void;
}

export default function StudySceneDrawer({
  currentScene,
  onSelectScene,
  isSceneShared,
  onToggleSceneShared,
  canShareScene,
  isAudioPlaying,
  onToggleAudio,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  onResetLayout,
  lowMotion,
  onToggleLowMotion,
  onClose,
}: StudySceneDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showLayoutModal, setShowLayoutModal] = useState(false);

  const filteredScenes = STUDY_SCENES.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.soundDescription.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      aria-label="Scenes panel"
      className="fixed top-16 left-[88px] z-30 w-[304px] max-h-[calc(100vh-84px)] overflow-y-auto bg-[#0E1116]/85 backdrop-blur-md border border-[#2B3340]/70 rounded-2xl p-4 flex flex-col gap-4 shadow-2xl font-['DM_Sans',sans-serif] select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#E6EDF3]">Scenes</h2>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B97A7] pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search scenes"
          aria-label="Search scenes"
          className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#141920]/90 border border-[#2B3340] text-xs text-[#E6EDF3] placeholder-[#8B97A7] focus:outline-none focus:border-[#3DD6B0] transition-colors"
        />
      </div>

      {/* 3-Column Scene Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {filteredScenes.map((scene) => {
          const isSelected = scene.id === currentScene.id;
          return (
            <button
              key={scene.id}
              onClick={() => onSelectScene(scene)}
              aria-label={`Select scene ${scene.name}`}
              className="flex flex-col items-center gap-1 group text-left active:scale-95 transition-transform"
            >
              <div
                className={`w-[74px] h-[58px] rounded-xl transition-all shadow-md relative overflow-hidden ${
                  isSelected
                    ? "border-2 border-[#3DD6B0] shadow-[0_0_12px_rgba(61,214,176,0.35)]"
                    : "border border-[#2B3340] hover:border-[#8B97A7]/40"
                }`}
                style={{ background: scene.thumbnailGradient }}
              >
                {/* Subtle sheen */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10" />
              </div>
              <span
                className={`text-[11px] font-medium leading-tight text-center truncate max-w-[76px] ${
                  isSelected ? "text-[#3DD6B0] font-semibold" : "text-[#8B97A7] group-hover:text-[#E6EDF3]"
                }`}
              >
                {scene.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Now Playing Card */}
      <div className="bg-[#141920]/80 border border-[#2B3340]/60 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#8B97A7] uppercase tracking-wider font-semibold">
              Now playing
            </div>
            <div className="text-xs font-bold text-[#E6EDF3] truncate max-w-[190px]">
              {currentScene.name}
            </div>
            <div className="text-[11px] text-[#8B97A7] truncate max-w-[190px]">
              {currentScene.soundDescription}
            </div>
          </div>

          <button
            onClick={onToggleAudio}
            aria-label={isAudioPlaying ? "Pause ambient sound" : "Play ambient sound"}
            className="w-8 h-8 rounded-lg bg-[#232A35] hover:bg-[#2B3340] text-[#3DD6B0] flex items-center justify-center transition-all active:scale-95"
          >
            {isAudioPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
        </div>

        {/* Volume Slider & Mute */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="text-[#8B97A7] hover:text-[#E6EDF3] transition-colors"
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            aria-label="Sound volume"
            className="flex-1 h-1 bg-[#232A35] rounded-lg appearance-none cursor-pointer accent-[#3DD6B0]"
          />
        </div>
      </div>

      {/* Share Scene with Room Toggle */}
      <div className="bg-[#141920]/80 border border-[#2B3340]/60 rounded-xl p-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-[#E6EDF3]">
            Share scene with room
          </div>
          <div className="text-[10px] text-[#8B97A7]">
            Everyone sees the same view
          </div>
        </div>

        <button
          onClick={onToggleSceneShared}
          disabled={!canShareScene}
          aria-pressed={isSceneShared}
          aria-label="Share scene with room toggle"
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 ${
            isSceneShared ? "bg-[#3DD6B0]" : "bg-[#2B3340]"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isSceneShared ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Footer Actions: Help and Layout */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => {
            alert(
              "Study Room Help:\n\n• Click any scene to change your immersive background.\n• Use the Pomodoro timer at top right.\n• Click + Notes, + Whiteboard, or + Editor at bottom dock to open private work panels.\n• All panels are resizable and draggable floating windows."
            );
          }}
          className="h-9 px-3 rounded-xl bg-[#141920]/80 hover:bg-[#1a212b] border border-[#2B3340] text-xs font-semibold text-[#8B97A7] hover:text-[#E6EDF3] flex items-center justify-center gap-1.5 transition-colors"
        >
          <HelpCircle size={13} />
          <span>Help</span>
        </button>

        <button
          onClick={() => setShowLayoutModal(!showLayoutModal)}
          className="h-9 px-3 rounded-xl bg-[#141920]/80 hover:bg-[#1a212b] border border-[#2B3340] text-xs font-semibold text-[#8B97A7] hover:text-[#E6EDF3] flex items-center justify-center gap-1.5 transition-colors"
        >
          <Sliders size={13} />
          <span>Layout</span>
        </button>
      </div>

      {/* Layout quick drawer popup */}
      {showLayoutModal && (
        <div className="bg-[#141920] border border-[#2B3340] rounded-xl p-3 flex flex-col gap-2 mt-1">
          <button
            onClick={() => {
              onResetLayout();
              setShowLayoutModal(false);
            }}
            className="w-full py-1.5 px-2 rounded-lg bg-[#232A35] hover:bg-[#2B3340] text-xs font-medium text-[#E6EDF3] text-left"
          >
            Reset all window positions
          </button>
          <button
            onClick={onToggleLowMotion}
            className="w-full py-1.5 px-2 rounded-lg bg-[#232A35] hover:bg-[#2B3340] text-xs font-medium text-[#E6EDF3] flex items-center justify-between"
          >
            <span>Low motion mode</span>
            <span className={`text-[10px] font-bold ${lowMotion ? "text-[#3DD6B0]" : "text-[#8B97A7]"}`}>
              {lowMotion ? "ON" : "OFF"}
            </span>
          </button>
        </div>
      )}
    </aside>
  );
}
