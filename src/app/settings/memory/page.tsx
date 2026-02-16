"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAuthClient } from "@/lib/auth";

interface Memory {
  id: string;
  content: string;
  category: string;
  created_at: string;
}

const NAV_ITEMS = [
  { href: "/settings/keys", label: "API Keys" },
  { href: "/settings/models", label: "Models" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/memory", label: "Memory" },
  { href: "/settings/activity", label: "Activity" },
  { href: "/settings/account", label: "Account" },
];

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const getAuthHeader = useCallback(async () => {
    const supabase = getAuthClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return `Bearer ${session.access_token}`;
  }, []);

  const fetchMemories = useCallback(async () => {
    const auth = await getAuthHeader();
    if (!auth) { setLoading(false); return; }
    try {
      const res = await fetch("/api/memory", {
        headers: { Authorization: auth },
      });
      const data = await res.json();
      if (res.ok) setMemories(data.memories || data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [getAuthHeader]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  async function handleDelete(id: string) {
    setError("");
    setDeleting(id);
    const auth = await getAuthHeader();
    if (!auth) return;
    try {
      const res = await fetch(`/api/memory/${id}`, {
        method: "DELETE",
        headers: { Authorization: auth },
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete");
      }
    } catch { setError("Network error"); }
    setDeleting(null);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f0f0f5]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-[#6b6b80] hover:text-[#8b8b9e] transition-colors mb-4 inline-block">
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold text-[#f0f0f5] mb-2">Memory</h1>
          <p className="text-sm text-[#8b8b9e]">
            Everything your agent remembers about you. Memories are created automatically as you chat.
          </p>
        </div>

        <div className="flex gap-2 mb-8 flex-wrap">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                item.href === "/settings/memory"
                  ? "bg-gradient-to-r from-[#06b6d4] to-[#6366f1] text-white"
                  : "bg-[rgba(255,255,255,0.04)] text-[#8b8b9e] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(6,182,212,0.2)] hover:text-[#f0f0f5]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-4 text-[#f0f0f5]">Saved Memories</h2>
          {loading ? (
            <div className="text-sm text-[#6b6b80]">Loading...</div>
          ) : memories.length === 0 ? (
            <div
              className="text-sm text-[#8b8b9e] rounded-2xl p-6 text-center"
              style={{
                background: "rgba(17,17,24,0.8)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              Your agent hasn&apos;t saved any memories yet. As you chat, it will remember important details about you.
            </div>
          ) : (
            <div className="space-y-3">
              {memories.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl px-5 py-4 transition-all hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  style={{
                    background: "rgba(17,17,24,0.8)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#f0f0f5] mb-2">{m.content}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-medium">
                          {m.category}
                        </span>
                        <span className="text-xs text-[#6b6b80]">
                          {new Date(m.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={deleting === m.id}
                      className="text-xs text-red-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {deleting === m.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
