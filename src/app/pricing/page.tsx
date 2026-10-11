"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles, Shield, Users, Video, Zap } from "lucide-react";

const PRICING_TIERS = [
  {
    id: "free",
    name: "Free / Student",
    priceInr: "₹0",
    priceUsd: "$0",
    period: "forever",
    badge: null,
    desc: "For student study groups, homework sessions, and open-source pair programming.",
    features: [
      "Up to 5 participants per room",
      "45-minute room session limit",
      "Full Monaco code editor & tabs",
      "Interactive WebContainer terminal",
      "Collaborative shared whiteboard",
      "Community project library access",
    ],
    cta: "Get Started Free",
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
    desc: "Engineered for coding bootcamp instructors, university tutors, and tech content creators.",
    features: [
      "Up to 50 students per room",
      "Unlimited session duration",
      "Mediasoup SFU Stage & screen sharing",
      "Dedicated Study Room Hub mode",
      "Synchronized Pomodoro & Notes",
      "Raise-hand queue & Upvoted Q&A",
      "Priority cloud compilation queue",
    ],
    cta: "Start Pro Instructor Trial",
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
    desc: "Built for engineering colleges, bootcamps, and large-scale interactive workshops.",
    features: [
      "Up to 250 students per room",
      "Dedicated SFU router bandwidth allocation",
      "Host 'Mute All' & stage permissions",
      "Role-based moderation (Teacher, TA, Student)",
      "Attendance logs & Markdown notes export",
      "Custom branding & institution join codes",
      "Priority 24/7 technical support",
    ],
    cta: "Contact Academy Sales",
    ctaLink: "/signup?plan=academy",
    popular: false,
  },
];

export default function PricingPage() {
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-inter py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={14} /> Back to CodeTogether Home
        </Link>

        <div className="text-center mb-12">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Monetization & Plans</span>
          <h1 className="text-4xl sm:text-5xl font-black text-white mt-2">Fair, Simple Pricing for Educators</h1>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto mt-3">
            Host live coding cohorts with low-latency SFU video and zero client thermal throttling.
          </p>

          <div className="inline-flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 mt-6">
            <button
              onClick={() => setCurrency("INR")}
              className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                currency === "INR" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              INR (₹)
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                currency === "USD" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`p-8 rounded-2xl border flex flex-col justify-between relative transition-all bg-zinc-950/90 ${
                tier.popular
                  ? "border-purple-500 shadow-2xl shadow-purple-950/50 ring-1 ring-purple-500/50"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-purple-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
