"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
    <div className="flex-1 flex items-center justify-center px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl w-full text-center">
        <p className="text-sm uppercase tracking-wider mb-2" style={{ color: '#6b6b80' }}>Almost there</p>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#f0f0f5' }}>How will you use this research?</h2>
        <p className="text-sm mb-8" style={{ color: '#8b8b9e' }}>Pick your role and we&apos;ll tailor the brief to your needs.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PERSONA_OPTIONS.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="flex flex-col items-center gap-2 p-5 rounded-xl transition-all cursor-pointer group"
              style={{ background: 'rgba(17,17,24,0.8)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(17,17,24,0.8)'; }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center transition-colors" style={{ background: 'rgba(99,102,241,0.15)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={p.icon} />
                </svg>
              </div>
              <span className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>{p.label}</span>
              <span className="text-xs" style={{ color: '#6b6b80' }}>{p.desc}</span>
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
    if (!query.trim()) { return; }
    setError(null);
    setIsResearching(true);

    try {
      await tryAutoRedeem(getFingerprint());
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: query.trim(), persona: selectedPersona, fingerprint: getFingerprint() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        if (data.quota_exceeded) setQuotaExceeded(true);
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      if (data.id) {
        router.replace(`/brief/${data.id}`);
      } else {
        sessionStorage.setItem("pulse_temp_brief", JSON.stringify(data));
        router.replace("/brief/temp");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsResearching(false);
    }
  }, [query, router]);

  useEffect(() => {
    const p = searchParams.get("persona");
    if (p) {
      setPersona(p);
    } else {
      try {
        const saved = localStorage.getItem('pulsed_persona');
        if (saved) { setPersona(saved); runResearch(saved); }
      } catch {}
    }
  }, [searchParams]);

  useEffect(() => {
    if (persona && !isResearching && !error) runResearch(persona);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona]);

  useEffect(() => {
    if (error || !isResearching) return;
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [error, isResearching]);

  function handlePersonaSelect(p: string) {
    setPersona(p);
    try { localStorage.setItem('pulsed_persona', p); } catch {}
    runResearch(p);
  }

  function handleRetry() {
    setIsRetrying(true);
    setError(null);
    setStatusIndex(0);
    if (persona) runResearch(persona).finally(() => setIsRetrying(false));
  }

  const navBar = (
    <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: 'rgba(10,10,15,0.85)', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="max-w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-lg font-bold" style={{ color: '#f0f0f5' }}>Pulsed</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-indigo-400">Research</span>
          <Link href="/agent" className="text-sm transition-colors hover:text-[#f0f0f5]" style={{ color: '#8b8b9e' }}>Agent</Link>
          <Link href="/workspace" className="text-sm transition-colors hover:text-[#f0f0f5]" style={{ color: '#8b8b9e' }}>Workspace</Link>
          <Link href="/history" className="text-sm transition-colors hover:text-[#f0f0f5]" style={{ color: '#8b8b9e' }}>History</Link>
        </div>
      </div>
    </nav>
  );

  // If no query, show search input (with persona picker if no persona saved)
  if (!query && !isResearching && !error) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
        {navBar}
        {!persona ? (
          <PersonaPicker onSelect={handlePersonaSelect} />
        ) : (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="max-w-xl w-full text-center">
              <h1 className="text-3xl font-bold mb-2" style={{ color: '#f0f0f5' }}>Research anything</h1>
              <p className="text-sm mb-8" style={{ color: '#8b8b9e' }}>Enter a topic and get an executive brief in under 60 seconds.</p>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const topic = (formData.get('topic') as string)?.trim();
                if (topic) router.push(`/search?q=${encodeURIComponent(topic)}&persona=${persona}`);
              }} className="flex gap-3">
                <input
                  name="topic"
                  type="text"
                  autoFocus
                  placeholder="e.g. AI in healthcare, California IT procurement, crypto regulation..."
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'rgba(17,17,24,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#f0f0f5' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <button
                  type="submit"
                  className="px-6 py-3 text-sm font-medium text-white rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  Research
                </button>
              </form>
              <button
                onClick={() => { setPersona(null); try { localStorage.removeItem('pulsed_persona'); } catch {} }}
                className="mt-4 text-xs transition-colors hover:text-indigo-400 cursor-pointer"
                style={{ color: '#6b6b80' }}
              >
                Change role ({PERSONA_OPTIONS.find(p => p.id === persona)?.label || persona}) →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
        {navBar}
        <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>

          <h2 className="text-xl font-bold mb-2" style={{ color: '#f0f0f5' }}>
            {quotaExceeded ? "Monthly searches used up" : "Research failed"}
          </h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: '#8b8b9e' }}>
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
                onClick={() => router.push("/pricing")}
                className="px-6 py-3 text-sm font-medium text-white rounded-xl hover:opacity-90 transition-opacity duration-200 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                Upgrade to Pro
              </button>
            ) : (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-6 py-3 text-sm font-medium text-white rounded-xl hover:opacity-90 transition-opacity duration-200 cursor-pointer disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {isRetrying ? "Retrying..." : "Try again"}
              </button>
            )}
            <button
              onClick={() => router.replace("/")}
              className="px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer"
              style={{ color: '#8b8b9e', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}
            >
              New search
            </button>
          </div>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      {navBar}
      <div className="flex-1 flex items-center justify-center px-4">
      <div className="text-center">
        {/* Pulsing gradient orb */}
        <div className="relative w-32 h-32 mx-auto mb-10">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 opacity-20 animate-orb-pulse" />
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 opacity-30 animate-orb-pulse-delayed" />
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 opacity-50 animate-orb-pulse" />
          <div className="absolute inset-10 rounded-full bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-500 opacity-80 animate-orb-spin" />
          <div className="absolute inset-[52px] rounded-full" style={{ background: '#0a0a0f' }} />
        </div>

        <p className="text-sm uppercase tracking-wider mb-2" style={{ color: '#6b6b80' }}>
          Researching
        </p>
        <h2 className="text-xl sm:text-2xl font-bold mb-8 max-w-sm mx-auto" style={{ color: '#f0f0f5' }}>
          &ldquo;{query}&rdquo;
        </h2>

        <div className="h-6 flex items-center justify-center">
          <p key={statusIndex} className="text-sm animate-status-fade" style={{ color: '#8b8b9e' }}>
            {STATUS_MESSAGES[statusIndex]}
          </p>
        </div>

        {/* Shimmer bar */}
        <div className="mt-8 w-64 h-1 mx-auto rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full w-1/3 rounded-full animate-shimmer-slide" style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
        </div>

        <p className="mt-6 text-xs" style={{ color: '#6b6b80' }}>
          This usually takes 15-30 seconds
        </p>
      </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
          <div style={{ color: '#6b6b80' }}>Loading...</div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
