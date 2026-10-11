"use client";

import { useState, useEffect, useRef } from "react";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Radio,
  FileText,
  Download,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  ThumbsUp,
  Send,
  Users,
  Hand,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { type HandRaiseEntry } from "@/hooks/useMediasoup";

// --- 1. POMODORO TIMER WITH WEB AUDIO CHIME ---
export function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"study" | "break">("study");

  // Web Audio chime generator
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (_) {}
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      playChime();
      if (mode === "study") {
        setMode("break");
        setTimeLeft(5 * 60);
      } else {
        setMode("study");
        setTimeLeft(25 * 60);
      }
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode]);

  const toggleRun = () => setIsRunning(!isRunning);
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === "study" ? 25 * 60 : 5 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-between shadow-lg">
      <div className="w-full flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
          <Timer className="w-4 h-4 text-emerald-400" />
          <span>{mode === "study" ? "Focus Interval" : "Rest Interval"}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => {
              setMode("study");
              setTimeLeft(25 * 60);
              setIsRunning(false);
            }}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              mode === "study" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-zinc-500"
            }`}
          >
            25m
          </button>
          <button
            onClick={() => {
              setMode("break");
              setTimeLeft(5 * 60);
              setIsRunning(false);
            }}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              mode === "break" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "text-zinc-500"
            }`}
          >
            5m
          </button>
        </div>
      </div>

      <div className="text-3xl font-black text-white tracking-widest my-1 font-mono">
        {formattedTime}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={toggleRun}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isRunning
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30"
          }`}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRunning ? "Pause" : "Start"}</span>
        </button>

        <button
          onClick={resetTimer}
          className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
          title="Reset Timer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// --- 2. RAISE HAND ORDERED QUEUE (FOR TEACHERS & STUDENTS) ---
export function RaiseHandQueue({
  handRaises,
  isHost,
  onLowerHand,
}: {
  handRaises: HandRaiseEntry[];
  isHost?: boolean;
  onLowerHand?: (socketId: string) => void;
}) {
  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col">
      <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
          <Hand className="w-4 h-4 text-amber-400" />
          <span>Raised Hand Queue</span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold">
          {handRaises.length}
        </span>
      </div>

      <div className="flex-1 max-h-48 overflow-y-auto space-y-2">
        {handRaises.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-4">No active questions in queue.</p>
        ) : (
          handRaises.map((entry, idx) => (
            <div
              key={entry.socketId}
              className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[10px]">
                  #{idx + 1}
                </span>
                <span className="text-zinc-200 font-medium truncate max-w-[120px]">{entry.name}</span>
              </div>

              {isHost && onLowerHand && (
                <button
                  onClick={() => onLowerHand(entry.socketId)}
                  className="text-[11px] px-2 py-0.5 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 rounded-lg transition-colors"
                >
                  Answered
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- 3. LOFI & AMBIENT FOCUS AUDIO PLAYER ---
export function LofiAmbientRadio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundType, setSoundType] = useState<"rain" | "drone" | "waves">("rain");
  const [volume, setVolume] = useState(0.3);

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);

  const startAmbient = (type: "rain" | "drone" | "waves") => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") ctx.resume();

      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.connect(ctx.destination);
      gainNodeRef.current = gain;

      if (type === "rain") {
        // Synthesize gentle pink-noise rain sound
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          output[i] = (b0 + b1 + b2) * 0.05;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 800;

        whiteNoise.connect(filter);
        filter.connect(gain);
        whiteNoise.start();
        sourceNodeRef.current = whiteNoise;
      } else if (type === "drone") {
        // Deep 432Hz ambient focus drone
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(108, ctx.currentTime); // Low fundamental
        osc.connect(gain);
        osc.start();
        sourceNodeRef.current = osc;
      } else {
        // Gentle oceanic pink noise waves
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(136.1, ctx.currentTime); // Om frequency
        osc.connect(gain);
        osc.start();
        sourceNodeRef.current = osc;
      }

      setIsPlaying(true);
    } catch (_) {}
  };

  const stopAmbient = () => {
    if (sourceNodeRef.current) {
      try {
        (sourceNodeRef.current as any).stop?.();
        sourceNodeRef.current.disconnect();
      } catch (_) {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleToggle = () => {
    if (isPlaying) {
      stopAmbient();
    } else {
      startAmbient(soundType);
    }
  };

  const changeType = (newType: "rain" | "drone" | "waves") => {
    setSoundType(newType);
    if (isPlaying) {
      stopAmbient();
      startAmbient(newType);
    }
  };

  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      stopAmbient();
    };
  }, []);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
          <Radio className="w-4 h-4 text-purple-400" />
          <span>Ambient Focus Audio</span>
        </div>
        <button
          onClick={handleToggle}
          className={`p-1.5 rounded-xl text-xs font-semibold transition-all ${
            isPlaying ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          {isPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex gap-1.5 mt-2">
        {(["rain", "drone", "waves"] as const).map((t) => (
          <button
            key={t}
            onClick={() => changeType(t)}
            className={`flex-1 py-1 rounded-lg text-[10px] font-semibold capitalize transition-all ${
              soundType === t
                ? "bg-zinc-800 text-purple-300 border border-purple-500/30"
                : "bg-zinc-950 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-[10px] text-zinc-500">Vol</span>
        <input
          type="range"
          min="0"
          max="0.8"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="flex-1 accent-purple-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
        />
      </div>
    </div>
  );
}

// --- 4. STUDY RESOURCES & CURATED ASSETS ---
export function StudyResourcesViewer({ roomId }: { roomId: string }) {
  const [resources] = useState([
    {
      id: "res-1",
      title: "Full-Stack System Architecture Diagram",
      category: "Architecture",
      size: "1.4 MB",
      url: "#",
    },
    {
      id: "res-2",
      title: "Mediasoup SFU 250-Seat Signaling Protocol",
      category: "Documentation",
      size: "820 KB",
      url: "#",
    },
    {
      id: "res-3",
      title: "Data Structures & Big-O Quick Reference",
      category: "Cheatsheet",
      size: "450 KB",
      url: "#",
    },
    {
      id: "res-4",
      title: "Node.js Concurrency & Event Loop Guide",
      category: "Lecture Slides",
      size: "3.2 MB",
      url: "#",
    },
  ]);

  return (
    <div className="w-full h-full p-6 flex flex-col bg-zinc-950 text-zinc-100 overflow-y-auto">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <span>Curated Class Resources & Materials</span>
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Download lecture slides, problem statements, and reference diagrams for this session.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources.map((res) => (
          <div
            key={res.id}
            className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  {res.title}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-1">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{res.category}</span>
                  <span>•</span>
                  <span>{res.size}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => alert(`Resource downloaded: ${res.title}`)}
              className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              title="Download Resource"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 5. CLASS CHAT & Q&A FOR STUDY ROOMS ---
export function ClassQaChat({
  roomId,
  currentUserId,
  currentUserName,
}: {
  roomId: string;
  currentUserId: string;
  currentUserName: string;
}) {
  const [tab, setTab] = useState<"chat" | "qa">("qa");
  const [messages, setMessages] = useState<Array<{ id: string; user: string; text: string; time: string }>>([
    {
      id: "1",
      user: "Instructor",
      text: "Welcome to today's deep dive! Post questions in the Q&A tab so they don't get lost.",
      time: "10:00 AM",
    },
  ]);
  const [questions, setQuestions] = useState<Array<{ id: string; user: string; text: string; votes: number; answered: boolean }>>([
    {
      id: "q-1",
      user: "Aarav K.",
      text: "How does the SFU distribute video packets without re-encoding on the server?",
      votes: 14,
      answered: false,
    },
    {
      id: "q-2",
      user: "Neha R.",
      text: "Why is Opus chosen for audio over AAC in WebRTC?",
      votes: 9,
      answered: true,
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    if (tab === "chat") {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          user: currentUserName,
          text: input.trim(),
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } else {
      setQuestions((prev) => [
        ...prev,
        {
          id: `q-${Date.now()}`,
          user: currentUserName,
          text: input.trim(),
          votes: 1,
          answered: false,
        },
      ]);
    }
    setInput("");
  };

  const handleUpvote = (id: string) => {
    setQuestions((prev) =>
      prev
        .map((q) => (q.id === id ? { ...q, votes: q.votes + 1 } : q))
        .sort((a, b) => b.votes - a.votes)
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Top Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/60 p-1">
        <button
          onClick={() => setTab("qa")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            tab === "qa"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Class Q&A ({questions.length})</span>
        </button>

        <button
          onClick={() => setTab("chat")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            tab === "chat"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>General Chat</span>
        </button>
      </div>

      {/* Content list */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {tab === "qa" ? (
          questions.map((q) => (
            <div
              key={q.id}
              className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                q.answered
                  ? "bg-zinc-900/50 border-zinc-800/60 opacity-60"
                  : "bg-zinc-900 border-zinc-800"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-zinc-300">{q.user}</span>
                  {q.answered && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Answered
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-200">{q.text}</p>
              </div>

              <button
                onClick={() => handleUpvote(q.id)}
                className="flex flex-col items-center justify-center px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-blue-600/20 hover:text-blue-400 transition-colors text-zinc-400"
              >
                <ThumbsUp className="w-3 h-3" />
                <span className="text-[10px] font-bold mt-0.5">{q.votes}</span>
              </button>
            </div>
          ))
        ) : (
          messages.map((m) => (
            <div key={m.id} className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-bold text-blue-400">{m.user}</span>
                <span className="text-zinc-500 text-[10px]">{m.time}</span>
              </div>
              <p className="text-xs text-zinc-200">{m.text}</p>
            </div>
          ))
        )}
      </div>

      {/* Message input */}
      <div className="p-2.5 bg-zinc-900/80 border-t border-zinc-800 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={tab === "qa" ? "Ask a question for the instructor..." : "Send a message..."}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSend}
          className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
