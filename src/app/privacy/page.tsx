"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, Database, FileCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-200 font-inter py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={14} /> Back to CodeTogether Home
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Privacy Policy</h1>
            <p className="text-xs text-zinc-500">Effective Date: October 2026 • Version 2.0 (SFU & Study Hub)</p>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-zinc-300">
          <section className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Lock size={16} className="text-blue-400" />
              1. Information We Collect
            </h2>
            <p className="mb-3 text-zinc-400">
              CodeTogether collects minimal necessary account details including your email address, display name, and optional role profile (Student, Teacher, Instructor).
            </p>
            <p className="text-zinc-400">
              When using live audio/video rooms, real-time media streams (audio, video, screen shares) are routed through our Selective Forwarding Unit (SFU) servers in transit and are <strong>never recorded or stored on our servers</strong> unless explicitly triggered by an authorized room host for export.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Database size={16} className="text-emerald-400" />
              2. Code Execution Sandboxing & Storage
            </h2>
            <p className="mb-3 text-zinc-400">
              Code entered into the Monaco Editor and Terminal is executed either locally within your browser sandbox via WebContainer or in short-lived, isolated server containers.
            </p>
            <p className="text-zinc-400">
              Temporary code files created for execution in compiled environments (Python, C++, Java) are purged automatically upon execution completion. Workspace files are securely synchronized via Supabase database infrastructure with row-level security.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Eye size={16} className="text-purple-400" />
              3. Telemetry & Analytics
            </h2>
            <p className="text-zinc-400">
              We collect operational metrics such as SFU packet loss, WebRTC round-trip times, and crash reports solely to maintain low-latency media quality for 250-seat sessions. We do not sell user data to advertising third parties.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <FileCheck size={16} className="text-amber-400" />
              4. Contact & Inquiries
            </h2>
            <p className="text-zinc-400">
              For any questions or data removal requests regarding this Privacy Policy, please contact our privacy compliance team at <span className="text-blue-400 font-mono">privacy@codetogether.dev</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
