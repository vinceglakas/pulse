"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAuthClient } from "@/lib/auth";

interface HistoryEntry {
  id: string;
  role: "user" | "agent" | "assistant";
  content: string;
  timestamp: string;
}

type Filter = "all" | "agent" | "user";

const NAV_ITEMS = [
  { href: "/settings/keys", label: "API Keys" },
  { href: "/settings/models", label: "Models" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/memory", label: "Memory" },
  { href: "/settings/activity", label: "Activity" },
  { href: "/settings/account", label: "Account" },
];

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const getAuthHeader = useCallback(async () => {
    const supabase = getAuthClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return `Bearer ${session.access_token}`;
  }, []);

  useEffect(() => {
    (async () => {
      const auth = await getAuthHeader();
      if (!auth) { setLoading(false); return; }
      try {
        const res = await fetch("/api/agent/history?sessionKey=default&limit=50", {
          headers: { Authorization: auth },
        });
        const data = await res.json();
        if (res.ok) setEntries(data.messages || data.history || data || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [getAuthHeader]);

  const filtered = entries.filter((e) => {
    if (filter === "all") return true;
    if (filter === "agent") return e.role === "agent" || e.role === "assistant";
    return e.role === "user";
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f0f0f5]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-[#6b6b80] hover:text-[#8b8b9e] transition-colors mb-4 inline-block">
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold text-[#f0f0f5] mb-2">Activity Log</h1>
          <p className="text-sm text-[#8b8b9e]">
            A timeline of your conversations with your agent.
          </p>
        </div>

        <div className="flex gap-2 mb-8 flex-wrap">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                item.href === "/settings/activity"
                  ? "bg-gradient-to-r from-[#06b6d4] to-[#6366f1] text-white"
                  : "bg-[rgba(255,255,255,0.04)] text-[#8b8b9e] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(6,182,212,0.2)] hover:text-[#f0f0f5]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(["all", "agent", "user"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                filter === f
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-[rgba(255,255,255,0.04)] text-[#8b8b9e] border border-[rgba(255,255,255,0.06)] hover:text-[#f0f0f5]"
              }`}
            >
              {f === "all" ? "All" : f === "agent" ? "Agent only" : "User only"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-[#6b6b80]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div
            className="text-sm text-[#8b8b9e] rounded-2xl p-6 text-center"
            style={{
              background: "rgba(17,17,24,0.8)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {entries.length === 0
              ? "No activity yet. Start chatting with your agent to see the log."
              : "No entries match this filter."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry, i) => {
              const isAgent = entry.role === "agent" || entry.role === "assistant";
              return (
                <div
                  key={entry.id || i}
                  className="rounded-xl px-5 py-4 transition-all hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  style={{
                    background: "rgba(17,17,24,0.8)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isAgent
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "bg-indigo-500/20 text-indigo-400"
                      }`}
                    >
                      {isAgent ? "Agent" : "You"}
                    </span>
                    <span className="text-xs text-[#6b6b80]">
                      {entry.timestamp ? relativeTime(new Date(entry.timestamp)) : ""}
                    </span>
                  </div>
                  <p className="text-sm text-[#f0f0f5]">
                    {entry.content?.length > 200
                      ? entry.content.slice(0, 200) + "..."
                      : entry.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
