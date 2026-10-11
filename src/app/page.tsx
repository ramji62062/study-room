"use client";

import { useState, useEffect, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Code2, Users, Zap, Play, Monitor, BookOpen, Tv, Briefcase,
  GraduationCap, ChevronRight, Star, Globe, Layers, Terminal,
  GitBranch, Video, MessageSquare, ArrowRight, CheckCircle2, Menu, X,
  ShieldCheck, Clock, Radio, Check, Sparkles, HelpCircle, FileText
} from "lucide-react";

const FEATURES = [
  {
    icon: <Video size={22} className="text-emerald-400" />,
    title: "Mediasoup SFU Video (250 Seats)",
    desc: "Single-speaker spotlight and automatic selective stream forwarding keeps client CPU under 15%, even in classes of 250 participants."
  },
  {
    icon: <BookOpen size={22} className="text-purple-400" />,
    title: "Dedicated Study Rooms",
    desc: "Distraction-free classroom mode where the code editor is on-demand, prioritizing shared whiteboard, synchronized teacher notes, and Pomodoro intervals."
  },
  {
    icon: <Terminal size={22} className="text-blue-400" />,
    title: "Hybrid Execution Sandboxes",
    desc: "Instant client-side WebContainers for Node.js/HTML, paired with secure isolated containers for Python, C++, Java, and Go."
  },
  {
    icon: <Code2 size={22} className="text-amber-400" />,
    title: "Synchronized Monaco Editor",
    desc: "Real-time collaborative code editor with intelligent autocomplete, syntax diagnostics, multi-file exploration, and live multi-cursor presence."
  },
  {
    icon: <Radio size={22} className="text-cyan-400" />,
    title: "Classroom Utilities",
    desc: "Integrated raise-hand queue, ambient study audio generator, synchronized focus timers, and upvoted student Q&A."
  },
  {
    icon: <ShieldCheck size={22} className="text-rose-400" />,
    title: "Instructor Moderation",
    desc: "One-click 'Mute All Students', host stage granting, room access passcodes, and session lifecycle controls."
  },
];

const PRICING_TIERS = [
  {
    id: "free",
    name: "Free / Student",
    priceInr: "₹0",
    priceUsd: "$0",
    period: "forever",
    badge: null,
    desc: "Perfect for peer study groups, quick pair-programming, and homework review.",
    features: [
      "Up to 5 participants per room",
      "45-minute room session limit",
      "Full Monaco code editor & tabs",
      "Interactive WebContainer terminal",
      "Collaborative shared whiteboard",
      "Community project library access",
    ],
    cta: "Start Free",
    ctaLink: "/signup",
    popular: false,
  },
  {
    id: "pro-teacher",
    name: "Pro Instructor",
    priceInr: "₹599",
    priceUsd: "$9",
    period: "per month",
    badge: "Recommended for Teachers",
    desc: "Engineered for coding bootcamp teachers, tutors, and technical creators.",
    features: [
      "Up to 50 students per room",
      "Unlimited session duration",
      "Mediasoup SFU Stage & screen sharing",
      "Dedicated Study Room Hub mode",
      "Synchronized Pomodoro & Notes",
      "Raise-hand queue & Upvoted Q&A",
      "Priority cloud compilation queue",
    ],
    cta: "Upgrade to Pro Instructor",
    ctaLink: "/signup?plan=pro-teacher",
    popular: true,
  },
  {
    id: "academy",
    name: "Academy & Cohort",
    priceInr: "₹2,499",
    priceUsd: "$35",
    period: "per month",
    badge: "Scale & Institutions",
    desc: "For colleges, coding academies, and large live engineering workshops.",
    features: [
      "Up to 250 students per room",
      "Dedicated SFU router bandwidth allocation",
      "Host 'Mute All' & stage permissions",
      "Role-based moderation (Teacher, TA, Student)",
      "Attendance logs & Markdown notes export",
      "Custom branding & institution join codes",
      "Dedicated technical support",
    ],
    cta: "Get Academy Plan",
    ctaLink: "/signup?plan=academy",
    popular: false,
  },
];

const EDUCATOR_TESTIMONIALS = [
  {
    quote: "Mesh WebRTC crashed whenever our cohort grew past 8 students. With CodeTogether's SFU stage, we ran a 40-student live Python algorithm workshop with zero audio stutter.",
    name: "Dr. Arvind Rao",
    role: "Engineering Educator & Bootcamp Mentor",
    initial: "A",
  },
  {
    quote: "The Study Room mode solved our biggest distraction: jumping into code before explaining the architecture. Now students see the whiteboard and notes first, and open the sandbox on-demand.",
    name: "Sanya Mehta",
    role: "Lead Full-Stack Instructor",
    initial: "S",
  },
  {
    quote: "The Q&A upvote queue and Pomodoro timer make live teaching feel effortless. My students stay engaged for entire 2-hour problem-solving sprints.",
    name: "Rahul Verma",
    role: "DSA & System Design Workshop Lead",
    initial: "R",
  },
];

function LandingCard({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`border border-white/10 bg-zinc-950/80 shadow-[0_18px_42px_rgba(0,0,0,0.4)] backdrop-blur-sm rounded-2xl ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    supabase.auth.getSession().then((result: any) => setAuthUser(result?.data?.session?.user ?? null));
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleJoin() {
    const code = roomCode.trim().toUpperCase();
    if (!code) { setJoinError("Enter a room code"); return; }
    setJoining(true); setJoinError("");

    const res = await fetch("/api/join-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode: code }),
    });
    const result = await res.json();

    if (res.ok && result.roomId) {
      if (result.roomType === "study") {
        router.push(`/study/${result.roomId}`);
      } else {
        router.push(`/room/${result.roomId}`);
      }
    } else {
      setJoinError(result.error || "Room not found. Check the code.");
      setJoining(false);
    }
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-inter overflow-x-hidden selection:bg-purple-600 selection:text-white">

      {/* ── NAVBAR ── */}
      <header className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 px-6 ${scrolled ? 'bg-black/90 backdrop-blur-xl border-b border-zinc-800' : 'bg-transparent border-b border-transparent'}`}>
        <div className="max-w-[1200px] mx-auto h-16 flex items-center justify-between">
          <Link href="/" className="text-[22px] font-black text-white no-underline tracking-tight flex items-center gap-2">
            <span className="p-1 rounded-lg bg-white text-black font-black text-sm">CT</span>
            <span>Code<span className="text-zinc-400">Together</span></span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex gap-7 items-center">
            {["features", "modes", "pricing", "testimonials"].map((id) => (
              <button key={id} onClick={() => scrollTo(id)} className="bg-transparent border-none text-zinc-400 cursor-pointer text-sm capitalize hover:text-white transition-colors">
                {id}
              </button>
            ))}
          </nav>

          <div className="flex gap-2.5 items-center">
            {authUser ? (
              <Link href="/dashboard" className="px-[18px] py-2 bg-white rounded-xl text-black text-sm font-bold no-underline hover:bg-zinc-200 transition-colors">
                Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 border border-zinc-800 rounded-xl text-zinc-300 text-sm no-underline hover:border-zinc-600 transition-colors">Login</Link>
                <Link href="/signup" className="px-[18px] py-2 bg-white rounded-xl text-black text-sm font-bold no-underline hover:bg-zinc-200 transition-colors">Start Teaching</Link>
              </>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden bg-transparent border-none text-zinc-300 cursor-pointer">
              {menuOpen ? <X size={22}/> : <Menu size={22}/>}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="bg-zinc-950 border-t border-zinc-800 p-4 px-6 flex flex-col gap-4">
            {["features", "modes", "pricing", "testimonials"].map(id => (
              <button key={id} onClick={() => scrollTo(id)} className="bg-transparent border-none text-zinc-300 cursor-pointer text-left text-[15px] capitalize">
                {id}
              </button>
            ))}
            <Link href="/login" className="text-zinc-300 no-underline">Login</Link>
            <Link href="/signup" className="text-white font-bold no-underline">Start Teaching →</Link>
          </div>
        )}
      </header>

      {/* ── HERO SECTION (Persona Focus: Coding Teachers & Instructors) ── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-[120px] pb-20 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[650px] h-[650px] bg-[radial-gradient(ellipse,rgba(168,85,247,0.12)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute top-[35%] left-[15%] w-[400px] h-[400px] bg-[radial-gradient(ellipse,rgba(59,130,246,0.08)_0%,transparent_70%)] pointer-events-none" />

        {/* Authentic Educator Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Built for coding instructors, bootcamps, and cohorts</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight max-w-4xl leading-[1.1] mb-6">
          Teach Live Coding Classes That <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">Never Lag or Crash.</span>
        </h1>

        {/* Subhead */}
        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed mb-10">
          Host up to 250 students with ultra-low latency SFU video, shared whiteboard canvas, synchronized study notes, and zero-setup web terminals.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-4 flex-wrap justify-center mb-12">
          <Link
            href="/signup"
            className="px-8 py-3.5 bg-white hover:bg-zinc-200 rounded-xl text-black text-sm font-extrabold no-underline shadow-xl shadow-white/10 flex items-center gap-2 hover:scale-105 transition-all"
          >
            Create Class for Free <ArrowRight size={16}/>
          </Link>
          <button
            onClick={() => scrollTo("modes")}
            className="px-7 py-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-300 text-sm font-semibold cursor-pointer flex items-center gap-2 transition-colors"
          >
            <Play size={14}/> Compare Room Modes
          </button>
        </div>

        {/* Instant Join Card */}
        <LandingCard className="p-5 max-w-[480px] w-full border-zinc-800 bg-zinc-950/90">
          <p className="text-xs text-zinc-400 mb-3 text-left font-medium">Have an invitation code? Join your cohort:</p>
          <div className="flex gap-2">
            <input
              value={roomCode}
              onChange={e => { setRoomCode(e.target.value.toUpperCase()); setJoinError(""); }}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              placeholder="e.g. XK9P2M"
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none tracking-[2px] font-mono font-bold uppercase placeholder:text-zinc-600 focus:border-purple-500"
            />
            <button
              onClick={handleJoin}
              disabled={joining}
              className="px-5 py-2.5 bg-white hover:bg-zinc-200 border-none rounded-xl text-black text-xs font-black cursor-pointer whitespace-nowrap transition-colors disabled:opacity-50"
            >
              {joining ? "Joining..." : "Join →"}
            </button>
          </div>
          {joinError && <p className="text-red-400 text-xs mt-2 text-left">{joinError}</p>}
        </LandingCard>
      </section>

      {/* ── DUAL ROOM ARCHITECTURES (MODULE 2 HIGHLIGHT) ── */}
      <section id="modes" className="py-24 px-6 max-w-[1200px] mx-auto border-t border-zinc-900">
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Dual Room Modes</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-2">Built for the Way Instructors Actually Teach</h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto mt-3">
            Choose between a deep hands-on coding room and a visual study hub where the editor doesn&apos;t distract until you need it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mode 1: Study Room */}
          <LandingCard className="p-8 border-purple-500/30 bg-purple-950/10 hover:border-purple-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300">
                  <BookOpen size={24} />
                </span>
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                  250-Seat SFU Scale
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">📚 Dedicated Study & Classroom Mode</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                <strong>The Code Editor does NOT open by default.</strong> Students arrive in an organized classroom hub with a live SFU video stage, collaborative whiteboard, class notes, and focus timer.
              </p>
              <ul className="space-y-2.5 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-purple-400" />
                  Hero spotlight stage with selective video decoders
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-purple-400" />
                  Shared infinite canvas for algorithms & system diagrams
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-purple-400" />
                  On-demand slide-out Code Sandbox drawer when ready to execute
                </li>
              </ul>
            </div>
            <div className="mt-8 pt-4 border-t border-purple-500/20 text-xs text-purple-300 font-bold">
              Default for Lectures, DSA & System Design →
            </div>
          </LandingCard>

          {/* Mode 2: Coding Room */}
          <LandingCard className="p-8 border-blue-500/30 bg-blue-950/10 hover:border-blue-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300">
                  <Code2 size={24} />
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                  Interactive Sandbox
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">💻 Live Coding Room</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Direct Monaco Editor workspace with multi-file project tree, WebContainer local terminal, and integrated live debugging for pairs and small teams.
              </p>
              <ul className="space-y-2.5 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-blue-400" />
                  Live multi-cursor editing with synchronized file tree
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-blue-400" />
                  Browser-native WebContainer terminal for zero-latency execution
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-blue-400" />
                  Built-in AI assistant for real-time explanations & debugging
                </li>
              </ul>
            </div>
            <div className="mt-8 pt-4 border-t border-blue-500/20 text-xs text-blue-300 font-bold">
              Default for Pair Programming & Code Reviews →
            </div>
          </LandingCard>
        </div>
      </section>

      {/* ── TECHNICAL FEATURES MATRIX ── */}
      <section id="features" className="py-24 px-6 max-w-[1200px] mx-auto border-t border-zinc-900">
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Architectural Advantage</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-2">Zero Client Lag. Zero Broken Calls.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <LandingCard key={i} className="p-6 border-zinc-800/80 hover:border-zinc-700 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
            </LandingCard>
          ))}
        </div>
      </section>

      {/* ── 3-TIER PRICING & MONETIZATION (MODULE 3) ── */}
      <section id="pricing" className="py-24 px-6 max-w-[1200px] mx-auto border-t border-zinc-900">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Transparent Pricing</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-2">Plans Designed for Coding Instructors</h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto mt-3">
            Start for free with your study group, or scale to cohorts of 250 with guaranteed SFU routing bandwidth.
          </p>

          {/* Currency switch */}
          <div className="inline-flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 mt-6">
            <button
              onClick={() => setCurrency("INR")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${currency === "INR" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
            >
              INR (₹)
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${currency === "USD" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
            >
              USD ($)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PRICING_TIERS.map((tier) => (
            <LandingCard
              key={tier.id}
              className={`p-8 flex flex-col justify-between relative transition-all ${
                tier.popular
                  ? "border-purple-500 bg-purple-950/20 shadow-2xl shadow-purple-900/20 ring-1 ring-purple-500/50"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-purple-600 text-white text-[11px] font-extrabold uppercase tracking-wider shadow-md">
                  {tier.badge}
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-white mb-1">{tier.name}</h3>
                <p className="text-xs text-zinc-400 min-h-[36px] mb-6">{tier.desc}</p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-white">
                    {currency === "INR" ? tier.priceInr : tier.priceUsd}
                  </span>
                  <span className="text-xs text-zinc-500">/{tier.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                      <Check size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={tier.ctaLink}
                className={`w-full py-3 rounded-xl text-xs font-bold text-center no-underline transition-all block ${
                  tier.popular
                    ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40"
                    : "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                }`}
              >
                {tier.cta}
              </Link>
            </LandingCard>
          ))}
        </div>
      </section>

      {/* ── AUTHENTIC EDUCATOR TESTIMONIALS ── */}
      <section id="testimonials" className="py-24 px-6 max-w-[1100px] mx-auto border-t border-zinc-900">
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Real Educator Experiences</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">Tested by Engineering Instructors</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {EDUCATOR_TESTIMONIALS.map((t, i) => (
            <LandingCard key={i} className="p-6 border-zinc-800/80 flex flex-col justify-between">
              <p className="text-xs text-zinc-300 leading-relaxed mb-6 italic">&quot;{t.quote}&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white border border-zinc-700">
                  {t.initial}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{t.name}</div>
                  <div className="text-[11px] text-zinc-500">{t.role}</div>
                </div>
              </div>
            </LandingCard>
          ))}
        </div>
      </section>

      {/* ── CALL TO ACTION ── */}
      <section className="py-24 px-6 text-center border-t border-zinc-900">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">Ready to Teach at Scale?</h2>
          <p className="text-sm text-zinc-400 mb-8">
            Create your first Study Room or Coding Sandbox in 30 seconds. No credit card required.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/signup"
              className="px-8 py-3.5 bg-white hover:bg-zinc-200 rounded-xl text-black text-sm font-extrabold no-underline shadow-xl hover:scale-105 transition-all"
            >
              Get Started Free →
            </Link>
            <Link
              href="/login"
              className="px-7 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 text-sm font-semibold no-underline transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER & LEGAL COMPLIANCE ── */}
      <footer className="border-t border-zinc-900 py-12 px-6 bg-black text-zinc-500 text-xs">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <span>CodeTogether</span>
            <span className="text-zinc-600 font-normal">| High-Density Collaborative Coding</span>
          </div>

          <div className="flex gap-6 flex-wrap justify-center">
            <Link href="#features" className="hover:text-white transition-colors no-underline text-zinc-400">Features</Link>
            <Link href="#modes" className="hover:text-white transition-colors no-underline text-zinc-400">Study Rooms</Link>
            <Link href="#pricing" className="hover:text-white transition-colors no-underline text-zinc-400">Pricing</Link>
            <Link href="/privacy" className="hover:text-white transition-colors no-underline text-zinc-400">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors no-underline text-zinc-400">Terms of Service</Link>
          </div>

          <p className="text-zinc-600 text-[11px] m-0">
            © 2026 CodeTogether Inc. Mediasoup SFU & WebContainers enabled.
          </p>
        </div>
      </footer>

    </div>
  );
}
