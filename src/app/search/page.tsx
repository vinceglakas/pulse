"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReferralSection from "../components/ReferralSection";

const STATUS_MESSAGES = [
  "Scanning discussions...",
  "Searching communities...",
  "Analyzing conversations...",
  "Extracting key insights...",
  "Identifying trends...",
  "Building your brief...",
];

const PERSONA_OPTIONS = [
  { id: 'marketer', label: 'Marketer', desc: 'Campaigns, positioning, audience targeting', icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm11 0h7v7h-7v-7z' },
  { id: 'creator', label: 'Content Creator', desc: 'Hooks, viral angles, trending formats', icon: 'M12 19l7-7 3 3-7 7-3-3zm-5.5-2.5l-4-4 9-9 4 4-9 9zM2 22l1.5-4.5L7 21l-5 1z' },
  { id: 'sales', label: 'Sales', desc: 'Talking points, prospect intel, objections', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
  { id: 'product', label: 'Product Manager', desc: 'Market gaps, user needs, feature ideas', icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' },
  { id: 'founder', label: 'Founder / Executive', desc: 'Strategic signals, market direction', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
  { id: 'analyst', label: 'Analyst / Researcher', desc: 'Deep data, patterns, full landscape', icon: 'M18 20V10M12 20V4M6 20v-6' },
];

function PersonaPicker({ onSelect }: { onSelect: (p: string) => void }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Almost there</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">How will you use this research?</h2>
        <p className="text-sm text-gray-500 mb-8">Pick your role and we&apos;ll tailor the brief to your needs.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PERSONA_OPTIONS.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={p.icon} />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900">{p.label}</span>
              <span className="text-xs text-gray-500">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

async function tryAutoRedeem(fingerprint: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const refCode = localStorage.getItem('pulsed_ref_code')
  if (!refCode) return false
  // Only try once
  const redeemed = localStorage.getItem('pulsed_ref_redeemed')
  if (redeemed) return false

  try {
    const res = await fetch('/api/referrals/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: refCode, fingerprint }),
    })
    if (res.ok) {
      localStorage.setItem('pulsed_ref_redeemed', 'true')
      localStorage.removeItem('pulsed_ref_code')
      return true
    }
  } catch { /* ignore */ }
  // Mark as attempted even on failure to avoid infinite retries
  localStorage.setItem('pulsed_ref_redeemed', 'attempted')
  return false
}

function getFingerprint(): string {
  if (typeof window === 'undefined') return 'server'
  let fp = localStorage.getItem('pulsed_fp')
  if (!fp) {
    fp = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('pulsed_fp', fp)
  }
  return fp
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [persona, setPersona] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const runResearch = useCallback(async (selectedPersona: string) => {
    if (!query.trim()) {
      router.replace("/");
      return;
    }

    setError(null);
    setIsResearching(true);

    try {
      // Auto-redeem referral code on first search
      await tryAutoRedeem(getFingerprint());

      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: query.trim(), persona: selectedPersona, fingerprint: getFingerprint() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        if (data.quota_exceeded) {
          setQuotaExceeded(true);
        }
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();

      if (data.id) {
        router.replace(`/brief/${data.id}`);
      } else {
        // If no ID (Supabase save failed), store in sessionStorage and use a temp route
        sessionStorage.setItem("pulse_temp_brief", JSON.stringify(data));
        router.replace("/brief/temp");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsResearching(false);
    }
  }, [query, router]);

  // Check URL for persona param on mount
  useEffect(() => {
    const p = searchParams.get("persona");
    if (p) {
      setPersona(p);
    }
  }, [searchParams]);

  // Auto-run research if persona came from URL param
  useEffect(() => {
    if (persona && !isResearching && !error) {
      runResearch(persona);
    }
    // Only run when persona is first set from URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona]);

  // Cycle through status messages
  useEffect(() => {
    if (error || !isResearching) return;
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [error, isResearching]);

  function handlePersonaSelect(p: string) {
    setPersona(p);
    runResearch(p);
  }

  function handleRetry() {
    setIsRetrying(true);
    setError(null);
    setStatusIndex(0);
    if (persona) {
      runResearch(persona).finally(() => setIsRetrying(false));
    }
  }

  // No persona selected yet — show the picker
  if (!persona && !isResearching && !error) {
    return <PersonaPicker onSelect={handlePersonaSelect} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* Error icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#EF4444]/10 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {quotaExceeded ? "Free searches used up" : "Research failed"}
          </h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {error}
          </p>

          {quotaExceeded && (
            <div className="mb-6 max-w-md mx-auto">
              <ReferralSection />
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            {quotaExceeded ? (
              <button
                onClick={() => router.replace("/")}
                className="px-6 py-3 text-sm font-medium text-white rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-90 transition-opacity duration-200 cursor-pointer"
              >
                Upgrade to Pro — Coming Soon
              </button>
            ) : (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-6 py-3 text-sm font-medium text-white rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-90 transition-opacity duration-200 cursor-pointer disabled:opacity-50"
              >
                {isRetrying ? "Retrying..." : "Try again"}
              </button>
            )}
            <button
              onClick={() => router.replace("/")}
              className="px-6 py-3 text-sm font-medium text-gray-500 rounded-xl border border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-all duration-200 cursor-pointer"
            >
              New search
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center">
        {/* Pulsing gradient orb */}
        <div className="relative w-32 h-32 mx-auto mb-10">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 opacity-20 animate-orb-pulse" />
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 opacity-30 animate-orb-pulse-delayed" />
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 opacity-50 animate-orb-pulse" />
          <div className="absolute inset-10 rounded-full bg-gradient-to-br from-indigo-600 via-blue-600 to-green-500 opacity-80 animate-orb-spin" />
          {/* Center dot */}
          <div className="absolute inset-[52px] rounded-full bg-white/90" />
        </div>

        {/* Topic */}
        <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">
          Researching
        </p>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-8 max-w-sm mx-auto">
          &ldquo;{query}&rdquo;
        </h2>

        {/* Cycling status */}
        <div className="h-6 flex items-center justify-center">
          <p
            key={statusIndex}
            className="text-sm text-gray-500 animate-status-fade"
          >
            {STATUS_MESSAGES[statusIndex]}
          </p>
        </div>

        {/* Shimmer bar */}
        <div className="mt-8 w-64 h-1 mx-auto rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 animate-shimmer-slide" />
        </div>

        <p className="mt-6 text-xs text-gray-400">
          This usually takes 15–30 seconds
        </p>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
