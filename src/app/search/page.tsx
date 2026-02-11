"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const STATUS_MESSAGES = [
  "Scanning discussions...",
  "Searching communities...",
  "Analyzing conversations...",
  "Extracting key insights...",
  "Identifying trends...",
  "Building your brief...",
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const runResearch = useCallback(async () => {
    if (!query.trim()) {
      router.replace("/");
      return;
    }

    setError(null);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: query.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
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
    }
  }, [query, router]);

  useEffect(() => {
    runResearch();
  }, [runResearch]);

  // Cycle through status messages
  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [error]);

  function handleRetry() {
    setIsRetrying(true);
    setError(null);
    setStatusIndex(0);
    runResearch().finally(() => setIsRetrying(false));
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
            Research failed
          </h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {error}
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-6 py-3 text-sm font-medium text-white rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-90 transition-opacity duration-200 cursor-pointer disabled:opacity-50"
            >
              {isRetrying ? "Retrying..." : "Try again"}
            </button>
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
