"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStudyRealtime } from "@/hooks/useStudyRealtime";
import { useMediasoup } from "@/hooks/useMediasoup";
import { useStudyAudio } from "@/hooks/useStudyAudio";

import { STUDY_SCENES, getSceneById, DEFAULT_SCENE_ID, type StudyScene } from "@/config/studyScenes";
import StudySceneRenderer from "@/components/study/StudySceneRenderer";
import StudySceneTopBar from "@/components/study/StudySceneTopBar";
import StudySceneRail, { type RailTabId } from "@/components/study/StudySceneRail";
import StudySceneDrawer from "@/components/study/StudySceneDrawer";
import StudyFloatingPomodoro from "@/components/study/StudyFloatingPomodoro";
import StudyHeroOverlay from "@/components/study/StudyHeroOverlay";
import StudyBottomDock from "@/components/study/StudyBottomDock";

import StudyEditorPanel from "@/components/study/StudyEditorPanel";
import StudyNotesPanel from "@/components/study/StudyNotesPanel";
import StudyWhiteboardPanel from "@/components/study/StudyWhiteboardPanel";
import StudyVideoPanel from "@/components/study/StudyVideoPanel";
import { Send, X, MessageSquare } from "lucide-react";

const STORAGE_LAYOUT_KEY = "codetogether_study_scene_layout_v4_";

type MainPanelKey = "video" | "editor" | "notes" | "whiteboard";

export default function StudyRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = String(params?.id || "");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [roomData, setRoomData] = useState<any>(null);

  // Scene state (Private unless shared by room owner)
  const [selectedSceneId, setSelectedSceneId] = useState<string>(DEFAULT_SCENE_ID);
  const [lowMotion, setLowMotion] = useState<boolean>(false);
  const [showCenterTitle, setShowCenterTitle] = useState<boolean>(true);

  // Rail & Drawer state
  const [activeRailTab, setActiveRailTab] = useState<RailTabId | null>(null);

  // Integrated Workspace Panels (No floating windows)
  const [activePanels, setActivePanels] = useState<Record<MainPanelKey | "chat", boolean>>({
    notes: false,
    whiteboard: false,
    editor: false,
    video: false,
    chat: false,
  });

  const [chatMessageDraft, setChatMessageDraft] = useState("");

  // Load user & room details
  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const session = res?.data?.session;
      if (session?.user) {
        setCurrentUser(session.user);
      } else {
        const guestId = "guest_" + Math.random().toString(36).substring(2, 8);
        setCurrentUser({
          id: guestId,
          email: "guest@codetogether.dev",
          user_metadata: { name: "You" },
        });
      }
    });

    if (roomId) {
      supabase
        .from("rooms")
        .select("*")
        .or(`id.eq.${roomId},room_code.eq.${roomId}`)
        .maybeSingle()
        .then((res: any) => {
          if (res?.data) {
            setRoomData(res.data);
            if (res.data.scene_shared && res.data.scene_id) {
              setSelectedSceneId(res.data.scene_id);
            }
          }
        });
    }
  }, [roomId]);

  // Load layout from localStorage
  useEffect(() => {
    if (!roomId) return;
    try {
      const saved = localStorage.getItem(`${STORAGE_LAYOUT_KEY}${roomId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activePanels) setActivePanels(parsed.activePanels);
        if (parsed.selectedSceneId) setSelectedSceneId(parsed.selectedSceneId);
        if (typeof parsed.lowMotion === "boolean") setLowMotion(parsed.lowMotion);
        if (typeof parsed.showCenterTitle === "boolean") setShowCenterTitle(parsed.showCenterTitle);
      }
    } catch (_) {}
  }, [roomId]);

  // Save layout to localStorage
  const persistLayout = useCallback(
    (panels: typeof activePanels, sceneId: string, motion: boolean, titleVisible: boolean) => {
      if (!roomId) return;
      try {
        localStorage.setItem(
          `${STORAGE_LAYOUT_KEY}${roomId}`,
          JSON.stringify({
            activePanels: panels,
            selectedSceneId: sceneId,
            lowMotion: motion,
            showCenterTitle: titleVisible,
          })
        );
      } catch (_) {}
    },
    [roomId]
  );

  const currentUserId = currentUser?.id || "anon";
  const currentUserName =
    currentUser?.user_metadata?.name ||
    currentUser?.email?.split("@")[0] ||
    "You";

  // Reliable Realtime client hook
  const realtime = useStudyRealtime({
    roomId,
    userId: currentUserId,
    userName: currentUserName,
  });

  // Check whether room scene is shared by owner
  const isSceneShared = Boolean(realtime.sceneState?.isShared);
  const effectiveSceneId = isSceneShared ? realtime.sceneState.sceneId : selectedSceneId;
  const currentScene = useMemo(() => getSceneById(effectiveSceneId), [effectiveSceneId]);

  // Audio hook for scene ambience
  const audio = useStudyAudio({
    sceneId: currentScene.id,
    audioUrl: currentScene.audioLoopUrl,
    soundDescription: currentScene.soundDescription,
  });

  // Mediasoup SFU hook
  const sfu = useMediasoup({
    roomId,
    userId: currentUserId,
    userName: currentUserName,
    autoJoin: false,
  });

  // Auto-connect SFU when video stage is active
  useEffect(() => {
    if (activePanels.video && !sfu.isJoined && !sfu.isConnecting) {
      sfu.joinSfu();
    }
  }, [activePanels.video, sfu.isJoined, sfu.isConnecting, sfu]);

  // Toggle Panel in workspace
  const togglePanel = useCallback(
    (key: MainPanelKey | "chat") => {
      setActivePanels((prev) => {
        const nextState = { ...prev, [key]: !prev[key] };
        persistLayout(nextState, selectedSceneId, lowMotion, showCenterTitle);
        return nextState;
      });
    },
    [persistLayout, selectedSceneId, lowMotion, showCenterTitle]
  );

  const closePanel = useCallback(
    (key: MainPanelKey | "chat") => {
      setActivePanels((prev) => {
        const nextState = { ...prev, [key]: false };
        if (key === "video" && sfu.isJoined) {
          sfu.leaveSfu();
        }
        persistLayout(nextState, selectedSceneId, lowMotion, showCenterTitle);
        return nextState;
      });
    },
    [persistLayout, selectedSceneId, lowMotion, showCenterTitle, sfu]
  );

  // Rail tab selection
  const handleSelectRailTab = useCallback(
    (tab: RailTabId) => {
      if (tab === "scenes") {
        setActiveRailTab((prev) => (prev === "scenes" ? null : "scenes"));
      } else if (tab === "timer") {
        realtime.startTimer();
      } else if (tab === "notes") {
        togglePanel("notes");
      } else if (tab === "board") {
        togglePanel("whiteboard");
      } else if (tab === "editor") {
        togglePanel("editor");
      } else if (tab === "sounds") {
        audio.togglePlay();
      } else if (tab === "chat") {
        togglePanel("chat");
      }
    },
    [togglePanel, audio, realtime]
  );

  // Scene Selection Handler
  const handleSelectScene = useCallback(
    (scene: StudyScene) => {
      setSelectedSceneId(scene.id);
      if (isSceneShared) {
        realtime.updateScene(scene.id, true);
      }
      persistLayout(activePanels, scene.id, lowMotion, showCenterTitle);
    },
    [isSceneShared, realtime, persistLayout, activePanels, lowMotion, showCenterTitle]
  );

  // Share Scene with Room Toggle Handler
  const handleToggleSceneShared = useCallback(() => {
    const nextShared = !isSceneShared;
    realtime.updateScene(selectedSceneId, nextShared);
  }, [isSceneShared, realtime, selectedSceneId]);

  // Reset layout to defaults
  const handleResetLayout = useCallback(() => {
    setActivePanels({
      notes: false,
      whiteboard: false,
      editor: false,
      video: false,
      chat: false,
    });
    setShowCenterTitle(true);
    setLowMotion(false);
    persistLayout(
      { notes: false, whiteboard: false, editor: false, video: false, chat: false },
      DEFAULT_SCENE_ID,
      false,
      true
    );
  }, [persistLayout]);

  // Send workspace chat message
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessageDraft.trim()) return;
    realtime.sendMessage(chatMessageDraft);
    setChatMessageDraft("");
  };

  // Identify active main panels (order: video first, then editor, notes, whiteboard)
  const openMainPanels: MainPanelKey[] = useMemo(() => {
    const keys: MainPanelKey[] = ["video", "editor", "notes", "whiteboard"];
    return keys.filter((k) => activePanels[k]);
  }, [activePanels]);

  const hasMainPanels = openMainPanels.length > 0;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0E1116] text-[#E6EDF3] font-['DM_Sans',sans-serif]">
      {/* 1. Full-Viewport Immersive Scene Renderer */}
      <StudySceneRenderer scene={currentScene} lowMotion={lowMotion} />

      {/* 2. Floating Top Bar */}
      <StudySceneTopBar
        roomName={roomData?.name || "Study Room"}
        roomCode={roomData?.room_code || roomId}
        currentUser={currentUser}
        cameraActive={activePanels.video}
        onToggleCamera={() => togglePanel("video")}
      />

      {/* 3. Left 72px Glass Rail */}
      <StudySceneRail
        activeTab={activeRailTab}
        onSelectTab={handleSelectRailTab}
      />

      {/* 4. Left 300px Drawer (Collapsible) */}
      {activeRailTab === "scenes" && (
        <StudySceneDrawer
          currentScene={currentScene}
          onSelectScene={handleSelectScene}
          isSceneShared={isSceneShared}
          onToggleSceneShared={handleToggleSceneShared}
          canShareScene={true}
          isAudioPlaying={audio.isPlaying}
          onToggleAudio={audio.togglePlay}
          volume={audio.volume}
          onVolumeChange={audio.setVolume}
          isMuted={audio.isMuted}
          onToggleMute={audio.toggleMute}
          onResetLayout={handleResetLayout}
          lowMotion={lowMotion}
          onToggleLowMotion={() => setLowMotion((v) => !v)}
          onClose={() => setActiveRailTab(null)}
        />
      )}

      {/* 5. Center Hero Title & Subtitle Overlay (Visible when no panels are open) */}
      {!hasMainPanels && (
        <StudyHeroOverlay
          title={currentScene.name}
          subtitle={currentScene.subtitle}
          visible={showCenterTitle}
          onToggleVisible={() => setShowCenterTitle((v) => !v)}
        />
      )}

      {/* 6. Top Right Floating Pomodoro Widget (Hides when video or multiple panels occupy screen) */}
      {(!hasMainPanels || openMainPanels.length === 1 && !activePanels.video) && (
        <StudyFloatingPomodoro
          timerState={realtime.timerState}
          onStart={realtime.startTimer}
          onPause={realtime.pauseTimer}
          onReset={realtime.resetTimer}
          onSetPreset={realtime.setTimerPreset}
        />
      )}

      {/* ========================================================================= */}
      {/* 7. INTEGRATED WORKSPACE PANELS AREA (NO FLOATING WINDOWS)                */}
      {/* ========================================================================= */}
      {hasMainPanels && (
        <section
          aria-label="Active workspace panels"
          className="fixed top-16 bottom-[74px] left-[84px] z-20 transition-all duration-300"
          style={{
            right: activePanels.chat ? "352px" : "16px",
          }}
        >
          <div
            className={`w-full h-full ${
              openMainPanels.length === 1
                ? "flex flex-col"
                : openMainPanels.length === 2
                ? "grid grid-cols-1 md:grid-cols-2 gap-3"
                : "grid grid-cols-1 md:grid-cols-3 gap-3"
            }`}
          >
            {/* Video Stage Panel */}
            {activePanels.video && (
              <div className="w-full h-full rounded-2xl overflow-hidden border border-[#2B3340]/80 bg-[#141920]/95 backdrop-blur-xl shadow-2xl flex flex-col">
                <StudyVideoPanel
                  peers={sfu.peers}
                  micOn={sfu.micOn}
                  cameraOn={sfu.cameraOn}
                  screenOn={sfu.screenOn}
                  localVideoStream={sfu.localVideoStream}
                  localCameraStream={sfu.localCameraStream}
                  localScreenStream={sfu.localScreenStream}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  activeSpeakerSocketId={sfu.activeSpeakerSocketId}
                  spotlightPeerId={sfu.spotlightPeerId}
                  handRaises={sfu.handRaises}
                  isHandRaised={sfu.isHandRaised}
                  onToggleMic={sfu.toggleMic}
                  onToggleCamera={sfu.toggleCamera}
                  onToggleScreenShare={sfu.toggleScreenShare}
                  onToggleRaiseHand={sfu.toggleRaiseHand}
                  onMuteAll={sfu.muteAllStudents}
                  onToggleSpotlight={sfu.toggleSpotlight}
                  onClose={() => closePanel("video")}
                />
              </div>
            )}

            {/* Code Editor Panel */}
            {activePanels.editor && (
              <div className="w-full h-full rounded-2xl overflow-hidden border border-[#2B3340]/80 bg-[#141920]/95 backdrop-blur-xl shadow-2xl flex flex-col">
                <StudyEditorPanel onClose={() => closePanel("editor")} />
              </div>
            )}

            {/* Notes Panel */}
            {activePanels.notes && (
              <div className="w-full h-full rounded-2xl overflow-hidden border border-[#2B3340]/80 bg-[#141920]/95 backdrop-blur-xl shadow-2xl flex flex-col">
                <StudyNotesPanel onClose={() => closePanel("notes")} />
              </div>
            )}

            {/* Whiteboard Panel */}
            {activePanels.whiteboard && (
              <div className="w-full h-full rounded-2xl overflow-hidden border border-[#2B3340]/80 bg-[#141920]/95 backdrop-blur-xl shadow-2xl flex flex-col">
                <StudyWhiteboardPanel
                  roomId={roomId}
                  currentUserId={currentUserId}
                  onClose={() => closePanel("whiteboard")}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 8. SLIDE-OUT CHAT PANEL (RIGHT SIDE DOCKED)                              */}
      {/* ========================================================================= */}
      {activePanels.chat && (
        <aside
          aria-label="Workspace chat"
          className="fixed top-16 bottom-[74px] right-3 w-[338px] z-30 rounded-2xl border border-[#2B3340]/80 bg-[#141920]/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden font-['DM_Sans',sans-serif]"
        >
          {/* Header */}
          <div className="h-12 px-4 bg-[#141920] border-b border-[#232A35] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-[#82AAFF]" />
              <span className="text-xs font-bold text-[#E6EDF3]">Workspace Chat</span>
            </div>
            <button
              onClick={() => closePanel("chat")}
              aria-label="Close chat"
              className="p-1 rounded text-[#8B97A7] hover:text-[#E6EDF3] transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {realtime.messages.map((m) => (
              <div key={m.id} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="font-bold text-[#82AAFF]">{m.userName}</span>
                  <span className="text-[#8B97A7]">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="text-[#E6EDF3] bg-[#0E1116] p-2.5 rounded-lg border border-[#232A35] break-words">
                  {m.body}
                </div>
              </div>
            ))}
            {realtime.messages.length === 0 && (
              <div className="text-center text-xs text-[#8B97A7] mt-12">
                No messages yet. Send a message to chat with your study group!
              </div>
            )}
          </div>

          {/* Chat input */}
          <form onSubmit={handleSendChat} className="p-2.5 border-t border-[#232A35] flex items-center gap-2 bg-[#0E1116] flex-shrink-0">
            <input
              type="text"
              value={chatMessageDraft}
              onChange={(e) => setChatMessageDraft(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 h-9 px-3 rounded-lg bg-[#141920] border border-[#2B3340] text-xs text-[#E6EDF3] focus:outline-none focus:border-[#3DD6B0]"
            />
            <button
              type="submit"
              disabled={!chatMessageDraft.trim()}
              className="h-9 w-9 rounded-lg bg-[#3DD6B0] hover:bg-[#34c4a1] text-[#0E1116] flex items-center justify-center disabled:opacity-40 transition-colors"
            >
              <Send size={14} />
            </button>
          </form>
        </aside>
      )}

      {/* 9. Bottom Center Dock with Overlapping Member Avatars */}
      <StudyBottomDock
        activePanels={{
          notes: activePanels.notes,
          whiteboard: activePanels.whiteboard,
          editor: activePanels.editor,
          chat: activePanels.chat,
        }}
        onTogglePanel={(panel) => togglePanel(panel)}
        members={realtime.members}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />
    </main>
  );
}
