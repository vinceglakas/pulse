"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import type { ResearchResponse, SourcePost } from "@/lib/types";

/* ─── Helper: source display info ─── */
function getSourceName(source: SourcePost): string {
  // Extract domain from URL for display
  try {
    const url = new URL(source.url);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return "Source";
  }
}

function formatScore(score: number): string {
  if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
  return String(score);
}

/* ─── Markdown-ish renderer ─── */
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

    // H1
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

    // H2
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

    // H3
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

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushList();
      flushNumberedList();
      elements.push(
        <hr key={`hr-${i}`} className="border-gray-200 my-6" />
      );
      continue;
    }

    // Unordered list
    if (/^[-*•]\s/.test(trimmed)) {
      flushNumberedList();
      listItems.push(trimmed.replace(/^[-*•]\s+/, ""));
      continue;
    }

    // Numbered list
    if (/^\d+[.)]\s/.test(trimmed)) {
      flushList();
      numberedItems.push(trimmed.replace(/^\d+[.)]\s+/, ""));
      continue;
    }

    // Paragraph
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
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
          <div className="h-3 w-16 bg-gray-100 rounded mb-4 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </Card>
        <Card>
          <div className="h-3 w-16 bg-gray-100 rounded mb-4 animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
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
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#EF4444]/10 flex items-center justify-center">
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

/* ─── Main brief page ─── */
export default function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [brief, setBrief] = useState<ResearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchBrief = useCallback(async () => {
    // Handle temp briefs stored in sessionStorage
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

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback - do nothing
    }
  }

  if (loading) return <BriefSkeleton />;
  if (error || !brief) return <BriefError message={error || "Brief not found"} />;

  const topSources = brief.sources
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const createdDate = brief.created_at
    ? new Date(brief.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto animate-stagger-in">
        {/* Top bar: back + actions */}
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

        {/* Topic Header */}
        <Card className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Trend Brief</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            &ldquo;{brief.topic}&rdquo;
          </h1>
          <p className="text-sm text-gray-500">
            {brief.sources.length} sources analyzed · {createdDate}
          </p>
        </Card>

        {/* Brief Content */}
        <Card className="mb-6">
          <SectionTitle>Analysis</SectionTitle>
          <BriefMarkdown text={brief.brief} />
        </Card>

        {/* Sources */}
        {topSources.length > 0 && (
          <Card className="mb-6">
            <SectionTitle>Top Sources</SectionTitle>
            <div className="space-y-2">
              {topSources.map((source, i) => (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 group-hover:text-gray-900 truncate">
                      {source.title}
                    </p>
                    <p className="text-xs text-indigo-600 mt-1">{getSourceName(source)}</p>
                  </div>
                  {source.score > 0 && (
                    <span className="text-xs text-gray-500 ml-4 shrink-0 font-mono">
                      ▲ {formatScore(source.score)}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* CTA */}
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
    </div>
  );
}
