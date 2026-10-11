"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Group, Panel, Separator, type GroupImperativeHandle } from "react-resizable-panels";
import { supabase } from "@/lib/supabase";
import { useStudyRealtime } from "@/hooks/useStudyRealtime";
import { useMediasoup } from "@/hooks/useMediasoup";

import StudyTopBar from "@/components/study/StudyTopBar";
import StudyPanelBar, { type PanelId } from "@/components/study/StudyPanelBar";
import StudySidebar from "@/components/study/StudySidebar";
import StudyEmptyState from "@/components/study/StudyEmptyState";
import StudyEditorPanel from "@/components/study/StudyEditorPanel";
import StudyNotesPanel from "@/components/study/StudyNotesPanel";
import StudyWhiteboardPanel from "@/components/study/StudyWhiteboardPanel";
import StudyTimerPanel from "@/components/study/StudyTimerPanel";
import StudyVideoPanel from "@/components/study/StudyVideoPanel";
import { SplitSquareHorizontal, SplitSquareVertical, RotateCcw } from "lucide-react";

const STORAGE_KEY_PREFIX = "codetogether_study_layout_v2_";

export default function StudyRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = String(params?.id || "");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [roomData, setRoomData] = useState<any>(null);

  // Active panels state (Private per user & room)
  const [activePanels, setActivePanels] = useState<Record<PanelId, boolean>>({
    editor: false,
    whiteboard: false,
    notes: false,
    timer: false,
    video: false,
    chat: false,
  });

  const [splitOrientation, setSplitOrientation] = useState<"horizontal" | "vertical">("horizontal");
  const [editorCode, setEditorCode] = useState<string>("");
  const [notesContent, setNotesContent] = useState<string>("");
  const groupRef = useRef<GroupImperativeHandle | null>(null);

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
          if (res?.data) setRoomData(res.data);
        });
    }
  }, [roomId]);

  // Load layout from localStorage with try/catch validation
  useEffect(() => {
    if (!roomId) return;
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${roomId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.activePanels === "object") {
          setActivePanels(parsed.activePanels);
          if (parsed.orientation === "vertical" || parsed.orientation === "horizontal") {
            setSplitOrientation(parsed.orientation);
          }
        }
      }
    } catch (_) {
      // Fallback cleanly on corruption
    }
  }, [roomId]);

  // Save layout to localStorage
  const saveLayout = useCallback(
    (panels: Record<PanelId, boolean>, orientation: "horizontal" | "vertical") => {
      if (!roomId) return;
      try {
        localStorage.setItem(
          `${STORAGE_KEY_PREFIX}${roomId}`,
          JSON.stringify({ activePanels: panels, orientation })
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

  // Reliable Realtime Client Hook
  const realtime = useStudyRealtime({
    roomId,
    userId: currentUserId,
    userName: currentUserName,
  });

  // Mediasoup SFU Hook (250 scale)
  const sfu = useMediasoup({
    roomId,
    userId: currentUserId,
    userName: currentUserName,
    autoJoin: false, // Activated when video panel is opened
  });

  // Toggle video stream connection when Video panel opens/closes
  const handleTogglePanel = useCallback(
    (id: PanelId) => {
      setActivePanels((prev) => {
        const nextState = { ...prev, [id]: !prev[id] };
        saveLayout(nextState, splitOrientation);

        if (id === "video") {
          if (nextState.video && !sfu.isJoined) {
            sfu.joinSfu();
          } else if (!nextState.video && sfu.isJoined) {
            sfu.leaveSfu();
          }
        }
        return nextState;
      });
    },
    [saveLayout, splitOrientation, sfu]
  );

  const handleOpenPanel = useCallback(
    (id: PanelId) => {
      setActivePanels((prev) => {
        const nextState = { ...prev, [id]: true };
        saveLayout(nextState, splitOrientation);
        if (id === "video" && !sfu.isJoined) {
          sfu.joinSfu();
        }
        return nextState;
      });
    },
    [saveLayout, splitOrientation, sfu]
  );

  const handleClosePanel = useCallback(
    (id: PanelId) => {
      setActivePanels((prev) => {
        const nextState = { ...prev, [id]: false };
        saveLayout(nextState, splitOrientation);
        if (id === "video" && sfu.isJoined) {
          sfu.leaveSfu();
        }
        return nextState;
      });
    },
    [saveLayout, splitOrientation, sfu]
  );

  // Quick Start Focus Session preset
  const handleStartFocus = useCallback(
    (durationMinutes: number, breakMinutes: number) => {
      realtime.setTimerPreset(durationMinutes * 60, "focus");
    },
    [realtime]
  );

  // Reset Split to equal ratio
  const handleResetSplit = useCallback(() => {
    // Calling groupRef.current.setLayout can reset, or resetting orientation
    try {
      groupRef.current?.setLayout({});
    } catch (_) {}
  }, []);

  const openPanelsList = (
    Object.keys(activePanels) as PanelId[]
  ).filter((k) => activePanels[k]);

  const hasOpenPanels = openPanelsList.length > 0;

  const roomDisplayName = roomData?.name?.startsWith("{")
    ? JSON.parse(roomData.name).title
    : roomData?.name || "OS Revision, Unit 3";

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0E1116] text-[#E6EDF3] overflow-hidden font-['DM_Sans',sans-serif]">
      {/* 1. TOP BAR (56px) */}
      <StudyTopBar
        roomName={roomDisplayName}
        roomCode={roomData?.room_code || roomId.slice(0, 6).toUpperCase()}
        memberCount={realtime.members.length || 4}
        maxSeats={5}
        timerState={realtime.timerState}
        connectionState={realtime.connectionState}
        onStartTimer={realtime.startTimer}
        onPauseTimer={realtime.pauseTimer}
        onResetTimer={realtime.resetTimer}
        onLeave={() => router.push("/dashboard")}
      />

      {/* 2. PANEL BAR (56px) */}
      <StudyPanelBar
        activePanels={activePanels}
        onTogglePanel={handleTogglePanel}
        roomMode={realtime.roomMode}
        onToggleRoomMode={realtime.toggleRoomMode}
      />

      {/* 3. MAIN WORKSPACE + SIDEBAR */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Workspace Central Area */}
        <main className="flex-1 h-full flex flex-col p-3 overflow-hidden relative">
          {/* Layout controls overlay when multiple panels are open */}
          {hasOpenPanels && openPanelsList.length > 1 && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-[#141920]/90 border border-[#232A35] backdrop-blur-md shadow-md text-xs">
              <button
                onClick={() => {
                  const nextOrient = splitOrientation === "horizontal" ? "vertical" : "horizontal";
                  setSplitOrientation(nextOrient);
                  saveLayout(activePanels, nextOrient);
                }}
                className="p-1 rounded text-[#8B97A7] hover:text-[#E6EDF3] transition-colors"
                title={`Switch to ${splitOrientation === "horizontal" ? "vertical" : "horizontal"} split`}
              >
                {splitOrientation === "horizontal" ? (
                  <SplitSquareVertical size={13} />
                ) : (
                  <SplitSquareHorizontal size={13} />
                )}
              </button>

              <button
                onClick={handleResetSplit}
                className="p-1 rounded text-[#8B97A7] hover:text-[#E6EDF3] transition-colors"
                title="Reset layout splits"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          )}

          {/* A) DEFAULT EMPTY STATE (Mockup 2) */}
          {!hasOpenPanels ? (
            <StudyEmptyState
              onOpenPanel={handleOpenPanel}
              onStartFocus={handleStartFocus}
            />
          ) : (
            /* B) WORKING STATE (Mockup 1) - Resizable Panels Group */
            <div className="w-full h-full rounded-xl overflow-hidden">
              <Group
                groupRef={groupRef}
                orientation={splitOrientation}
                className="w-full h-full"
              >
                {openPanelsList.map((panelId, index) => {
                  const isLast = index === openPanelsList.length - 1;

                  return (
                    <div key={`wrapper-${panelId}`} className="contents">
                      <Panel
                        id={panelId}
                        minSize={18}
                        defaultSize={Math.floor(100 / openPanelsList.length)}
                        className="h-full overflow-hidden"
                      >
                        {panelId === "editor" && (
                          <StudyEditorPanel
                            initialCode={editorCode}
                            onCodeChange={setEditorCode}
                            onClose={() => handleClosePanel("editor")}
                          />
                        )}

                        {panelId === "notes" && (
                          <StudyNotesPanel
                            initialContent={notesContent}
                            onContentChange={setNotesContent}
                            onClose={() => handleClosePanel("notes")}
                          />
                        )}

                        {panelId === "whiteboard" && (
                          <StudyWhiteboardPanel
                            roomId={roomId}
                            currentUserId={currentUserId}
                            onClose={() => handleClosePanel("whiteboard")}
                          />
                        )}

                        {panelId === "timer" && (
                          <StudyTimerPanel
                            timerState={realtime.timerState}
                            onStart={realtime.startTimer}
                            onPause={realtime.pauseTimer}
                            onReset={realtime.resetTimer}
                            onSetPreset={realtime.setTimerPreset}
                            onClose={() => handleClosePanel("timer")}
                          />
                        )}

                        {panelId === "video" && (
                          <StudyVideoPanel
                            peers={sfu.peers}
                            micOn={sfu.micOn}
                            cameraOn={sfu.cameraOn}
                            screenOn={sfu.screenOn}
                            localVideoStream={sfu.localVideoStream}
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
                            onClose={() => handleClosePanel("video")}
                          />
                        )}

                        {panelId === "chat" && (
                          <div className="w-full h-full bg-[#141920] border border-[#232A35] rounded-xl flex flex-col p-4">
                            <div className="flex items-center justify-between pb-2 border-b border-[#232A35] mb-3">
                              <span className="text-xs font-bold text-[#E6EDF3]">Workspace Chat</span>
                              <button onClick={() => handleClosePanel("chat")} className="text-[#8B97A7] hover:text-white">✕</button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2">
                              {realtime.messages.map((m) => (
                                <div key={m.id} className="text-xs">
                                  <span className="font-bold text-[#82AAFF] mr-1.5">{m.userName}</span>
                                  <span>{m.body}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Panel>

                      {!isLast && (
                        <Separator
                          className={`group relative transition-all ${
                            splitOrientation === "horizontal"
                              ? "w-2.5 mx-0.5 cursor-col-resize flex justify-center items-center"
                              : "h-2.5 my-0.5 cursor-row-resize flex justify-center items-center"
                          } hover:bg-[#3DD6B0]/20 rounded focus:outline-none focus:ring-1 focus:ring-[#3DD6B0]`}
                          title="Double-click to reset split"
                          onDoubleClick={handleResetSplit}
                        >
                          <div
                            className={`rounded-full bg-[#232A35] group-hover:bg-[#3DD6B0] group-focus:bg-[#3DD6B0] transition-colors ${
                              splitOrientation === "horizontal"
                                ? "w-1 h-8"
                                : "h-1 w-8"
                            }`}
                          />
                        </Separator>
                      )}
                    </div>
                  );
                })}
              </Group>
            </div>
          )}
        </main>

        {/* 4. SIDEBAR (280px on the right) */}
        <StudySidebar
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          members={realtime.members}
          messages={realtime.messages}
          onSendMessage={realtime.sendMessage}
          onRetryMessage={realtime.retryMessage}
          onUpdateStatus={realtime.updateMyStatus}
        />
      </div>
    </div>
  );
}
