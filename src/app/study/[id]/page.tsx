"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
import StudyFloatingWindow from "@/components/study/StudyFloatingWindow";

import StudyEditorPanel from "@/components/study/StudyEditorPanel";
import StudyNotesPanel from "@/components/study/StudyNotesPanel";
import StudyWhiteboardPanel from "@/components/study/StudyWhiteboardPanel";
import StudyVideoPanel from "@/components/study/StudyVideoPanel";
import { Send } from "lucide-react";

const STORAGE_LAYOUT_KEY = "codetogether_study_scene_layout_v3_";

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
  const [activeRailTab, setActiveRailTab] = useState<RailTabId | null>("scenes");

  // Floating windows visibility & minimize states
  const [activeWindows, setActiveWindows] = useState({
    notes: false,
    whiteboard: false,
    editor: false,
    video: false,
    chat: false,
  });

  const [minimizedWindows, setMinimizedWindows] = useState({
    notes: false,
    whiteboard: false,
    editor: false,
    video: false,
    chat: false,
  });

  const [windowZIndices, setWindowZIndices] = useState({
    notes: 20,
    whiteboard: 21,
    editor: 22,
    video: 23,
    chat: 24,
  });
  const [topZ, setTopZ] = useState(25);

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
        if (parsed.activeWindows) setActiveWindows(parsed.activeWindows);
        if (parsed.selectedSceneId) setSelectedSceneId(parsed.selectedSceneId);
        if (typeof parsed.lowMotion === "boolean") setLowMotion(parsed.lowMotion);
        if (typeof parsed.showCenterTitle === "boolean") setShowCenterTitle(parsed.showCenterTitle);
      }
    } catch (_) {}
  }, [roomId]);

  // Save layout to localStorage
  const persistLayout = useCallback(
    (windows: typeof activeWindows, sceneId: string, motion: boolean, titleVisible: boolean) => {
      if (!roomId) return;
      try {
        localStorage.setItem(
          `${STORAGE_LAYOUT_KEY}${roomId}`,
          JSON.stringify({
            activeWindows: windows,
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

  // Auto-connect SFU when video window is open
  useEffect(() => {
    if (activeWindows.video && !sfu.isJoined && !sfu.isConnecting) {
      sfu.joinSfu();
    }
  }, [activeWindows.video, sfu.isJoined, sfu.isConnecting, sfu]);

  // Bring window to front
  const bringToFront = useCallback((windowId: keyof typeof windowZIndices) => {
    setTopZ((prevTop) => {
      const nextTop = prevTop + 1;
      setWindowZIndices((prev) => ({ ...prev, [windowId]: nextTop }));
      return nextTop;
    });
  }, []);

  // Toggle Window Visibility
  const toggleWindow = useCallback(
    (key: "notes" | "whiteboard" | "editor" | "video" | "chat") => {
      setActiveWindows((prev) => {
        const nextState = { ...prev, [key]: !prev[key] };
        // If opening, un-minimize and focus
        if (nextState[key]) {
          setMinimizedWindows((m) => ({ ...m, [key]: false }));
          bringToFront(key);
        }
        persistLayout(nextState, selectedSceneId, lowMotion, showCenterTitle);
        return nextState;
      });
    },
    [bringToFront, persistLayout, selectedSceneId, lowMotion, showCenterTitle]
  );

  const closeWindow = useCallback(
    (key: "notes" | "whiteboard" | "editor" | "video" | "chat") => {
      setActiveWindows((prev) => {
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

  const toggleMinimizeWindow = useCallback(
    (key: "notes" | "whiteboard" | "editor" | "video" | "chat") => {
      setMinimizedWindows((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  // Rail tab selection
  const handleSelectRailTab = useCallback(
    (tab: RailTabId) => {
      if (tab === "scenes") {
        setActiveRailTab((prev) => (prev === "scenes" ? null : "scenes"));
      } else if (tab === "timer") {
        // Toggle Pomodoro timer preset
        realtime.startTimer();
      } else if (tab === "notes") {
        toggleWindow("notes");
      } else if (tab === "board") {
        toggleWindow("whiteboard");
      } else if (tab === "editor") {
        toggleWindow("editor");
      } else if (tab === "sounds") {
        audio.togglePlay();
      } else if (tab === "chat") {
        toggleWindow("chat");
      }
    },
    [toggleWindow, audio, realtime]
  );

  // Scene Selection Handler
  const handleSelectScene = useCallback(
    (scene: StudyScene) => {
      setSelectedSceneId(scene.id);
      if (isSceneShared) {
        realtime.updateScene(scene.id, true);
      }
      persistLayout(activeWindows, scene.id, lowMotion, showCenterTitle);
    },
    [isSceneShared, realtime, persistLayout, activeWindows, lowMotion, showCenterTitle]
  );

  // Share Scene with Room Toggle Handler
  const handleToggleSceneShared = useCallback(() => {
    const nextShared = !isSceneShared;
    realtime.updateScene(selectedSceneId, nextShared);
  }, [isSceneShared, realtime, selectedSceneId]);

  // Reset layout to defaults
  const handleResetLayout = useCallback(() => {
    setActiveWindows({
      notes: false,
      whiteboard: false,
      editor: false,
      video: false,
      chat: false,
    });
    setMinimizedWindows({
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

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0E1116] text-[#E6EDF3] font-['DM_Sans',sans-serif]">
      {/* 1. Full-Viewport Immersive Scene Renderer */}
      <StudySceneRenderer scene={currentScene} lowMotion={lowMotion} />

      {/* 2. Floating Top Bar */}
      <StudySceneTopBar
        roomName={roomData?.name || "OS Revision, Unit 3"}
        roomCode={roomData?.room_code || roomId}
        currentUser={currentUser}
        cameraActive={activeWindows.video}
        onToggleCamera={() => toggleWindow("video")}
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

      {/* 5. Center Hero Title & Subtitle Overlay */}
      <StudyHeroOverlay
        title={currentScene.name}
        subtitle={currentScene.subtitle}
        visible={showCenterTitle}
        onToggleVisible={() => setShowCenterTitle((v) => !v)}
      />

      {/* 6. Top Right Floating Pomodoro Widget */}
      <StudyFloatingPomodoro
        timerState={realtime.timerState}
        onStart={realtime.startTimer}
        onPause={realtime.pauseTimer}
        onReset={realtime.resetTimer}
        onSetPreset={realtime.setTimerPreset}
      />

      {/* 7. Bottom Center Dock with Overlapping Member Avatars */}
      <StudyBottomDock
        activePanels={{
          notes: activeWindows.notes,
          whiteboard: activeWindows.whiteboard,
          editor: activeWindows.editor,
          chat: activeWindows.chat,
        }}
        onTogglePanel={(panel) => toggleWindow(panel)}
        members={realtime.members}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />

      {/* ========================================================================= */}
      {/* 8. FLOATING RESIZABLE PANELS OVER SCENE (react-rnd)                       */}
      {/* ========================================================================= */}

      {/* Notes Floating Window */}
      <StudyFloatingWindow
        id="notes"
        title="Study Notes (Markdown)"
        isOpen={activeWindows.notes}
        isMinimized={minimizedWindows.notes}
        zIndex={windowZIndices.notes}
        onClose={() => closeWindow("notes")}
        onMinimize={() => toggleMinimizeWindow("notes")}
        onFocus={() => bringToFront("notes")}
        defaultPosition={{ x: 140, y: 120 }}
        defaultSize={{ width: 480, height: 420 }}
      >
        <StudyNotesPanel onClose={() => closeWindow("notes")} />
      </StudyFloatingWindow>

      {/* Whiteboard Floating Window */}
      <StudyFloatingWindow
        id="whiteboard"
        title="Collaborative Whiteboard"
        isOpen={activeWindows.whiteboard}
        isMinimized={minimizedWindows.whiteboard}
        zIndex={windowZIndices.whiteboard}
        onClose={() => closeWindow("whiteboard")}
        onMinimize={() => toggleMinimizeWindow("whiteboard")}
        onFocus={() => bringToFront("whiteboard")}
        defaultPosition={{ x: 260, y: 110 }}
        defaultSize={{ width: 620, height: 460 }}
      >
        <StudyWhiteboardPanel
          roomId={roomId}
          currentUserId={currentUserId}
          onClose={() => closeWindow("whiteboard")}
        />
      </StudyFloatingWindow>

      {/* Code Editor Floating Window */}
      <StudyFloatingWindow
        id="editor"
        title="Code Editor (In-Browser Execution)"
        isOpen={activeWindows.editor}
        isMinimized={minimizedWindows.editor}
        zIndex={windowZIndices.editor}
        onClose={() => closeWindow("editor")}
        onMinimize={() => toggleMinimizeWindow("editor")}
        onFocus={() => bringToFront("editor")}
        defaultPosition={{ x: 220, y: 90 }}
        defaultSize={{ width: 660, height: 500 }}
      >
        <StudyEditorPanel onClose={() => closeWindow("editor")} />
      </StudyFloatingWindow>

      {/* Video Stage Floating Window (Mediasoup SFU) */}
      <StudyFloatingWindow
        id="video"
        title="Video Stage (Mediasoup SFU - 250 Scale)"
        isOpen={activeWindows.video}
        isMinimized={minimizedWindows.video}
        zIndex={windowZIndices.video}
        onClose={() => closeWindow("video")}
        onMinimize={() => toggleMinimizeWindow("video")}
        onFocus={() => bringToFront("video")}
        defaultPosition={{ x: 180, y: 100 }}
        defaultSize={{ width: 720, height: 520 }}
      >
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
          onClose={() => closeWindow("video")}
        />
      </StudyFloatingWindow>

      {/* Workspace Chat Floating Window */}
      <StudyFloatingWindow
        id="chat"
        title="Workspace Chat"
        isOpen={activeWindows.chat}
        isMinimized={minimizedWindows.chat}
        zIndex={windowZIndices.chat}
        onClose={() => closeWindow("chat")}
        onMinimize={() => toggleMinimizeWindow("chat")}
        onFocus={() => bringToFront("chat")}
        defaultPosition={{ x: typeof window !== "undefined" ? Math.max(20, window.innerWidth - 380) : 700, y: 180 }}
        defaultSize={{ width: 340, height: 440 }}
      >
        <div className="w-full h-full flex flex-col bg-[#141920]">
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
                <div className="text-[#E6EDF3] bg-[#0E1116] p-2 rounded-lg border border-[#232A35] break-words">
                  {m.body}
                </div>
              </div>
            ))}
            {realtime.messages.length === 0 && (
              <div className="text-center text-xs text-[#8B97A7] mt-8">
                No messages yet. Send a message to chat with your study group!
              </div>
            )}
          </div>

          {/* Chat input */}
          <form onSubmit={handleSendChat} className="p-2.5 border-t border-[#232A35] flex items-center gap-2 bg-[#0E1116]">
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
        </div>
      </StudyFloatingWindow>
    </main>
  );
}
