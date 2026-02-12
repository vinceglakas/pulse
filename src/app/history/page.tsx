"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SearchItem {
  id: string;
  topic: string;
  brief_id: string | null;
  created_at: string;
}

function getFingerprint(): string {
  if (typeof window === "undefined") return "server";
  let fp = localStorage.getItem("pulsed_fp");
  if (!fp) {
    fp = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("pulsed_fp", fp);
  }
  return fp;
}

export default function HistoryPage() {
  const [searches, setSearches] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fp = getFingerprint();
    fetch(`/api/briefs/history?fp=${fp}`)
      .then((r) => (r.ok ? r.json() : { searches: [] }))
      .then((data) => setSearches(data.searches || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-500 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Home
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Research History</h1>
        <p className="text-sm text-gray-500 mb-8">
          Recent searches and briefs you&apos;ve generated.
        </p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
                <div className="h-5 w-2/3 bg-gray-100 rounded mb-2"></div>
                <div className="h-4 w-1/3 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        ) : searches.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-50 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No searches yet</h3>
            <p className="text-sm text-gray-500 mb-6">
              Your research history will appear here after you run your first search.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-90 transition-opacity"
            >
              Start researching
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {searches.map((item) => (
              <Link
                key={item.id}
                href={item.brief_id ? `/brief/${item.brief_id}` : `/search?q=${encodeURIComponent(item.topic)}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {item.topic}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {new Date(item.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
