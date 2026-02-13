"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAuthClient } from "@/lib/auth";

interface ApiKey {
  id: string;
  provider: string;
  key_hint: string;
  created_at: string;
}

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google" },
  { value: "moonshot", label: "Moonshot/Kimi" },
  { value: "custom", label: "Custom" },
];

const PROVIDER_LABELS: Record<string, string> = Object.fromEntries(
  PROVIDERS.map((p) => [p.value, p.label])
);

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getAuthHeader = useCallback(async () => {
    const supabase = getAuthClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;
    return `Bearer ${session.access_token}`;
  }, []);

  const fetchKeys = useCallback(async () => {
    const auth = await getAuthHeader();
    if (!auth) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/keys", {
        headers: { Authorization: auth },
      });
      const data = await res.json();
      if (res.ok) setKeys(data.keys || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [getAuthHeader]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const auth = await getAuthHeader();
    if (!auth) {
      setError("Please log in first");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save key");
      } else {
        setSuccess("Key verified and saved!");
        setApiKey("");
        fetchKeys();
      }
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setError("");
    setDeleting(id);
    const auth = await getAuthHeader();
    if (!auth) return;

    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: "DELETE",
        headers: { Authorization: auth },
      });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete");
      }
    } catch {
      setError("Network error");
    }
    setDeleting(null);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 inline-block"
          >
            ← Back
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold">API Keys</h1>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium">
              Ultron
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Add your LLM API keys to power your AI agent. Keys are encrypted and
            never exposed.
          </p>
        </div>

        {/* Settings Nav */}
        <div className="flex gap-2 mb-8">
          {[
            { href: '/settings/keys', label: 'API Keys', icon: '🔑' },
            { href: '/settings/models', label: 'Models', icon: '🧠' },
            { href: '/settings/integrations', label: 'Integrations', icon: '🔗' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                item.href === '/settings/keys'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Error/Success */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400">
            {success}
          </div>
        )}

        {/* Add Key Form */}
        <form
          onSubmit={handleSave}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8"
        >
          <h2 className="text-lg font-semibold mb-4">Add New Key</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full h-[44px] bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all appearance-none cursor-pointer"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value} className="bg-[#1a1a1a]">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full h-[44px] bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white placeholder:text-gray-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving || !apiKey}
              className="w-full h-[44px] bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Testing & Saving..." : "Test & Save"}
            </button>
          </div>
        </form>

        {/* Keys List */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Saved Keys</h2>
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : keys.length === 0 ? (
            <div className="text-sm text-gray-500 bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              No API keys added yet. Add one above to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-5 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {PROVIDER_LABELS[k.provider] || k.provider}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {k.key_hint}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Added{" "}
                      {new Date(k.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(k.id)}
                    disabled={deleting === k.id}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50 ml-4 shrink-0"
                  >
                    {deleting === k.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
