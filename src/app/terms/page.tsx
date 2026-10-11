"use client";

import Link from "next/link";
import { ArrowLeft, FileText, AlertTriangle, ShieldCheck, Cpu } from "lucide-react";

export default function TermsOfServicePage() {
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
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Terms of Service</h1>
            <p className="text-xs text-zinc-500">Effective Date: October 2026 • CodeTogether Platform Agreements</p>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-zinc-300">
          <section className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <ShieldCheck size={16} className="text-purple-400" />
              1. Platform Usage & Educational License
            </h2>
            <p className="text-zinc-400">
              CodeTogether is provided for collaborative programming, education, bootcamp instruction, and interactive workshops. By creating a room or joining an active workspace, you agree to comply with standard acceptable use standards.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Cpu size={16} className="text-emerald-400" />
              2. Code Execution Sandboxing & Zero-Liability Clause
            </h2>
            <p className="mb-3 text-zinc-400">
              Code execution is conducted in ephemeral sandboxes. You acknowledge that user-submitted code runs at your own risk. CodeTogether disclaims all liability for compilation crashes, algorithmic infinite loops, or runtime errors triggered by client code.
            </p>
            <p className="text-zinc-400">
              Malicious scripts, cryptocurrency mining, denial-of-service attempts, or unauthorized network scanning within cloud sandbox containers are strictly prohibited and will result in immediate IP termination.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              3. Subscription & Instructor Monetization Plans
            </h2>
            <p className="text-zinc-400">
              Instructor and Academy subscriptions (₹599/mo and ₹2,499/mo) provide priority SFU bandwidth routing, room capacity allocations up to 250 seats, and extended classroom utilities. Billing cycles recur monthly unless canceled before the next renewal date.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
