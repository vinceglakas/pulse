"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthClient } from "@/lib/auth";
import type { ResearchResponse, StructuredBrief } from "@/lib/types";

/* ─── Parse structured brief JSON ─── */
function parseStructuredBrief(text: string): StructuredBrief | null {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    // Validate required fields
    if (
      typeof parsed.executive_summary === "string" &&
      Array.isArray(parsed.key_themes) &&
      parsed.sentiment &&
      typeof parsed.sentiment.positive === "number" &&
      Array.isArray(parsed.recommended_actions) &&
      Array.isArray(parsed.follow_up_queries)
    ) {
      return parsed as StructuredBrief;
    }
    return null;
  } catch {
    return null;
  }
}

/* ─── Markdown-ish renderer (fallback for old briefs) ─── */
function BriefMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let numberedItems: string[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="space-y-1.5 mb-4">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-900 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  }

  function flushNumberedList() {
    if (numberedItems.length > 0) {
      elements.push(
        <ol key={`ol-${elements.length}`} className="space-y-1.5 mb-4">
          {numberedItems.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-900 leading-relaxed">
              <span className="text-xs font-mono text-indigo-600 mt-0.5 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ol>
      );
      numberedItems = [];
    }
  }

  function inlineFormat(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-900 font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="text-gray-500">$1</em>')
      .replace(/`(.+?)`/g, '<code class="text-indigo-600 bg-indigo-600/10 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-700 underline underline-offset-2">$1</a>'
      );
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushNumberedList();
      continue;
    }

    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
      flushList();
      flushNumberedList();
      elements.push(
        <h2 key={`h1-${i}`} className="text-xl font-bold text-gray-900 mb-3 mt-6 first:mt-0">
          {trimmed.slice(2)}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith("## ") && !trimmed.startsWith("### ")) {
      flushList();
      flushNumberedList();
      elements.push(
        <h3 key={`h2-${i}`} className="text-lg font-semibold text-gray-900 mb-2 mt-6">
          {trimmed.slice(3)}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      flushNumberedList();
      elements.push(
        <h4 key={`h3-${i}`} className="text-base font-semibold text-gray-900 mb-2 mt-4">
          {trimmed.slice(4)}
        </h4>
      );
      continue;
    }

    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushList();
      flushNumberedList();
      elements.push(
        <hr key={`hr-${i}`} className="border-gray-200 my-6" />
      );
      continue;
    }

    if (/^[-*\u2022]\s/.test(trimmed)) {
      flushNumberedList();
      listItems.push(trimmed.replace(/^[-*\u2022]\s+/, ""));
      continue;
    }

    if (/^\d+[.)]\s/.test(trimmed)) {
      flushList();
      numberedItems.push(trimmed.replace(/^\d+[.)]\s+/, ""));
      continue;
    }

    flushList();
    flushNumberedList();
    elements.push(
      <p
        key={`p-${i}`}
        className="text-sm text-gray-500 leading-relaxed mb-3"
        dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }}
      />
    );
  }

  flushList();
  flushNumberedList();

  return <div>{elements}</div>;
}

/* ─── UI Components ─── */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 shadow-sm rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
      {children}
    </h3>
  );
}

/* ─── Loading skeleton ─── */
function BriefSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="h-4 w-24 bg-gray-100 rounded mb-8 animate-pulse" />
        <Card className="mb-6">
          <div className="h-3 w-20 bg-gray-100 rounded mb-3 animate-pulse" />
          <div className="h-8 w-3/4 bg-gray-100 rounded mb-3 animate-pulse" />
          <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
        </Card>
        <Card className="mb-6">
          <div className="h-3 w-32 bg-gray-100 rounded mb-4 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-4/6 bg-gray-100 rounded animate-pulse" />
          </div>
        </Card>
        <Card className="mb-6">
          <div className="h-3 w-24 bg-gray-100 rounded mb-4 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-5 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </Card>
        <Card className="mb-6">
          <div className="h-3 w-36 bg-gray-100 rounded mb-4 animate-pulse" />
          <div className="h-4 w-full bg-gray-100 rounded-full animate-pulse" />
        </Card>
        <Card>
          <div className="h-3 w-40 bg-gray-100 rounded mb-4 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-5 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Error state ─── */
function BriefError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Brief not found</h2>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-90 transition-opacity duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          New search
        </Link>
      </div>
    </div>
  );
}

/* ─── Sentiment Bar ─── */
function SentimentBar({ sentiment }: { sentiment: StructuredBrief["sentiment"] }) {
  const { positive, neutral, negative } = sentiment;
  return (
    <div>
      <div className="flex w-full h-3 rounded-full overflow-hidden">
        {positive > 0 && (
          <div
            className="h-full"
            style={{ width: `${positive}%`, backgroundColor: "#22c55e" }}
          />
        )}
        {neutral > 0 && (
          <div
            className="h-full"
            style={{ width: `${neutral}%`, backgroundColor: "#eab308" }}
          />
        )}
        {negative > 0 && (
          <div
            className="h-full"
            style={{ width: `${negative}%`, backgroundColor: "#ec4899" }}
          />
        )}
      </div>
      <div className="flex items-center gap-6 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#22c55e" }} />
          <span className="text-xs text-gray-600">{positive}% Positive</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#eab308" }} />
          <span className="text-xs text-gray-600">{neutral}% Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#ec4899" }} />
          <span className="text-xs text-gray-600">{negative}% Negative</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Content Drafts ─── */
function ContentDrafts({ topic, briefText }: { topic: string; briefText: string }) {
  const [activeDraft, setActiveDraft] = useState<string | null>(null)
  const [draftContent, setDraftContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const draftTypes = [
    { id: 'linkedin', label: 'LinkedIn Post', icon: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2V9zm2-4a2 2 0 110 4 2 2 0 010-4z' },
    { id: 'tweet', label: 'Tweet Thread', icon: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z' },
    { id: 'email', label: 'Email Snippet', icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm16 2l-8 5-8-5' },
  ]

  async function generateDraft(type: string) {
    setActiveDraft(type)
    setLoading(true)
    setDraftContent('')
    setCopied(false)

    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefText, topic, type }),
      })

      if (!res.ok) throw new Error('Failed to generate')
      const data = await res.json()
      setDraftContent(data.draft)
    } catch {
      setDraftContent('Failed to generate draft. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(draftContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <Card className="mb-6">
      <SectionHeader>Create Content</SectionHeader>
      <p className="text-sm text-gray-500 mb-4">Turn this research into ready-to-publish content.</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {draftTypes.map(dt => (
          <button
            key={dt.id}
            onClick={() => generateDraft(dt.id)}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all cursor-pointer disabled:opacity-50 ${
              activeDraft === dt.id
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={dt.icon} />
            </svg>
            {dt.label}
          </button>
        ))}
      </div>

      {/* Draft output */}
      {activeDraft && (
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              <span className="text-sm text-gray-500">Generating draft...</span>
            </div>
          ) : draftContent ? (
            <div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-900 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {draftContent}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  {copied ? 'Copied!' : 'Copy to clipboard'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  )
}

/* ─── Structured Brief Layout ─── */
function StructuredBriefView({
  data,
  topic,
  sourceCount,
  createdDate,
}: {
  data: StructuredBrief;
  topic: string;
  sourceCount: number;
  createdDate: string;
}) {
  const router = useRouter();

  return (
    <>
      {/* Topic Header */}
      <Card className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          &ldquo;{topic}&rdquo;
        </h1>
        <p className="text-sm text-gray-500">
          {sourceCount} sources analyzed · {createdDate}
        </p>
      </Card>

      {/* Executive Summary */}
      <Card className="mb-6">
        <SectionHeader>Executive Summary</SectionHeader>
        <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {data.executive_summary}
        </div>
      </Card>

      {/* Key Themes */}
      {data.key_themes.length > 0 && (
        <Card className="mb-6">
          <SectionHeader>Key Themes</SectionHeader>
          <ul className="space-y-3">
            {data.key_themes.map((theme, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                <span className="text-sm text-gray-900 font-medium">{theme}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Sentiment Analysis */}
      <Card className="mb-6">
        <SectionHeader>Sentiment Analysis</SectionHeader>
        <SentimentBar sentiment={data.sentiment} />
      </Card>

      {/* Recommended Actions */}
      {data.recommended_actions.length > 0 && (
        <Card className="mb-6">
          <SectionHeader>Recommended Actions</SectionHeader>
          <ul className="space-y-3">
            {data.recommended_actions.map((action, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded border-2 border-gray-300 shrink-0 mt-0.5" />
                <span className="text-sm text-gray-900">{action}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Want to go deeper? */}
      {data.follow_up_queries.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Want to go deeper?
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.follow_up_queries.map((query, i) => (
              <button
                key={i}
                onClick={() => router.push(`/search?q=${encodeURIComponent(query)}`)}
                className="border border-indigo-300 text-indigo-700 bg-white rounded-full px-4 py-2 text-sm hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Drafts */}
      <ContentDrafts
        topic={topic}
        briefText={`Executive Summary: ${data.executive_summary}\n\nKey Themes:\n${data.key_themes.map(t => `- ${t}`).join('\n')}\n\nRecommended Actions:\n${data.recommended_actions.map(a => `- ${a}`).join('\n')}`}
      />
    </>
  );
}

/* ─── Main brief page ─── */
export default function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [brief, setBrief] = useState<ResearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);

  // Check if brief is saved
  useEffect(() => {
    async function checkSaved() {
      if (id === "temp") return;
      const supabase = getAuthClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch(`/api/briefs/saved?briefId=${id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setIsSaved(data.saved);
        }
      } catch { /* ignore */ }
    }
    checkSaved();
  }, [id]);

  async function handleToggleSave() {
    if (id === "temp") return;
    const supabase = getAuthClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSavingBookmark(true);
    try {
      const method = isSaved ? 'DELETE' : 'POST';
      const res = await fetch('/api/briefs/save', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ briefId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsSaved(data.saved);
      }
    } catch { /* ignore */ }
    setSavingBookmark(false);
  }

  const fetchBrief = useCallback(async () => {
    if (id === "temp") {
      try {
        const stored = sessionStorage.getItem("pulse_temp_brief");
        if (stored) {
          setBrief(JSON.parse(stored));
          setLoading(false);
          return;
        }
      } catch {
        // fall through
      }
      setError("Brief not found. It may have expired.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/brief/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Brief not found" }));
        throw new Error(data.error || `Failed to load brief (${res.status})`);
      }
      const data: ResearchResponse = await res.json();
      setBrief(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load brief");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  const [showToast, setShowToast] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    const title = brief?.topic ? `${brief.topic} | Pulsed` : 'Pulsed Brief';

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User cancelled or not supported — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setShowToast(true);
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setShowToast(false), 3000);
    } catch {
      // fallback
    }
  }

  if (loading) return <BriefSkeleton />;
  if (error || !brief) return <BriefError message={error || "Brief not found"} />;

  const structuredData = parseStructuredBrief(brief.brief);

  const createdDate = brief.created_at
    ? new Date(brief.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto animate-stagger-in">
        {/* Top bar: back + share */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-500 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            New search
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSave}
              disabled={savingBookmark || id === "temp"}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 ${
                isSaved
                  ? 'text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                  : 'text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-900'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              {isSaved ? "Saved" : "Save"}
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-900 transition-all duration-200 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              {copied ? "Copied!" : "Share"}
            </button>
          </div>
        </div>

        {/* Render structured or fallback */}
        {structuredData ? (
          <StructuredBriefView
            data={structuredData}
            topic={brief.topic}
            sourceCount={brief.sources.length}
            createdDate={createdDate}
          />
        ) : (
          <>
            {/* Legacy: Topic Header */}
            <Card className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                &ldquo;{brief.topic}&rdquo;
              </h1>
              <p className="text-sm text-gray-500">
                {brief.sources.length} sources analyzed · {createdDate}
              </p>
            </Card>

            {/* Legacy: Markdown brief */}
            <Card className="mb-6">
              <SectionHeader>Analysis</SectionHeader>
              <BriefMarkdown text={brief.brief} />
            </Card>

            {/* Content Drafts */}
            <ContentDrafts topic={brief.topic} briefText={brief.brief} />
          </>
        )}

        {/* Bottom CTA */}
        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-medium text-white rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-90 transition-opacity duration-200 shadow-lg shadow-indigo-600/20"
          >
            Research another topic
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl shadow-lg animate-fade-in">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Link copied to clipboard
          </div>
        </div>
      )}
    </div>
  );
}
