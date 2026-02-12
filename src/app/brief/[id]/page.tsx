import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { StructuredBrief, SourcePost } from "@/lib/types";
import { ShareButtons } from "./share-buttons";
import { DeeperSection } from "./deeper-section";

type Props = {
  params: Promise<{ id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseStructuredBrief(text: string): StructuredBrief | null {
  try {
    const cleaned = text
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (
      typeof parsed.executive_summary === "string" &&
      Array.isArray(parsed.key_themes)
    ) {
      return parsed as StructuredBrief;
    }
    return null;
  } catch {
    return null;
  }
}

async function getBrief(id: string) {
  if (!id || !UUID_REGEX.test(id)) return null;
  const { data } = await supabase
    .from("briefs")
    .select("id, topic, brief_text, sources, created_at")
    .eq("id", id)
    .single();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getBrief(id);
  if (!data) return { title: "Brief Not Found | Pulsed" };

  const topic = data.topic ?? "Research Brief";
  const structured = parseStructuredBrief(data.brief_text as string);
  const description = structured
    ? structured.executive_summary.slice(0, 160)
    : (data.brief_text as string).slice(0, 160);

  const url = `https://runpulsed.ai/brief/${id}`;
  const ogImageUrl = `https://runpulsed.ai/api/og/${id}`;

  return {
    title: `${topic} — Market Intelligence Brief | Pulsed`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${topic} — Market Intelligence Brief | Pulsed`,
      description,
      url,
      siteName: "Pulsed",
      type: "article",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${topic} — Market Intelligence Brief | Pulsed`,
      description,
      images: [ogImageUrl],
    },
  };
}

function SentimentBar({ sentiment }: { sentiment: StructuredBrief["sentiment"] }) {
  const { positive, neutral, negative } = sentiment;
  return (
    <div>
      <div className="flex w-full h-4 rounded-full overflow-hidden">
        {positive > 0 && (
          <div className="h-full" style={{ width: `${positive}%`, backgroundColor: "#22c55e" }} />
        )}
        {neutral > 0 && (
          <div className="h-full" style={{ width: `${neutral}%`, backgroundColor: "#eab308" }} />
        )}
        {negative > 0 && (
          <div className="h-full" style={{ width: `${negative}%`, backgroundColor: "#ec4899" }} />
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500">{positive}% Positive</span>
        <span className="text-xs text-gray-500">{neutral}% Neutral</span>
        <span className="text-xs text-gray-500">{negative}% Negative</span>
      </div>
    </div>
  );
}

export default async function BriefPublicPage({ params }: Props) {
  const { id } = await params;
  const data = await getBrief(id);
  if (!data) notFound();

  const topic = data.topic ?? "Research Brief";
  const sources = (data.sources ?? []) as SourcePost[];
  const createdDate = data.created_at
    ? new Date(data.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const structured = parseStructuredBrief(data.brief_text as string);
  const briefUrl = `https://runpulsed.ai/brief/${id}`;

  // Calculate total upvotes from sources
  const totalUpvotes = sources.reduce((sum, s) => sum + (s.score || 0), 0);

  // Estimate read time (~200 words/min)
  const briefLength = (data.brief_text as string).length;
  const readTime = Math.max(15, Math.round(briefLength / 800 * 60));

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal header */}
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">Pulsed</span>
          </a>
          <a
            href="/signup"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 transition-opacity"
          >
            Try Pulsed Free
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        {/* Title + Badge */}
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Brief: {topic}
          </h1>
          {sources.length > 0 && (
            <span className="shrink-0 ml-4 mt-1 px-3 py-1 text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded-full">
              {sources.length} sources analyzed
            </span>
          )}
        </div>

        {/* Meta line */}
        <p className="text-sm text-gray-400 mb-10">
          Generated {createdDate}
          {sources.length > 0 && ` · ${sources.length} sources`}
          {totalUpvotes > 0 && ` · ${totalUpvotes.toLocaleString()} upvotes analyzed`}
          {` · ${readTime} second read`}
        </p>

        {structured ? (
          <>
            {/* EXECUTIVE SUMMARY */}
            <div className="mb-10">
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-4">
                Executive Summary
              </h2>
              <p className="text-[15px] text-gray-700 leading-relaxed">
                {structured.executive_summary}
              </p>
            </div>

            {/* KEY THEMES */}
            {structured.key_themes.length > 0 && (
              <div className="mb-10">
                <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-4">
                  Key Themes
                </h2>
                <ul className="space-y-3">
                  {structured.key_themes.map((theme, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-purple-600 mt-2 shrink-0" />
                      <span className="text-[15px] text-gray-700">{theme}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SENTIMENT ANALYSIS */}
            {structured.sentiment && (
              <div className="mb-10">
                <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-4">
                  Sentiment Analysis
                </h2>
                <SentimentBar sentiment={structured.sentiment} />
              </div>
            )}

            {/* RECOMMENDED ACTIONS */}
            {structured.recommended_actions?.length > 0 && (
              <div className="mb-10">
                <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-4">
                  Recommended Actions
                </h2>
                <ul className="space-y-3">
                  {structured.recommended_actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 shrink-0" readOnly />
                      <span className="text-[15px] text-gray-700">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="mb-10">
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-4">
              Analysis
            </h2>
            <div className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-line">
              {data.brief_text as string}
            </div>
          </div>
        )}

        {/* Want to go deeper? */}
        <DeeperSection topic={topic} briefText={structured?.executive_summary || ""} keyThemes={structured?.key_themes || []} />

        {/* Share / Draft buttons */}
        <ShareButtons
          url={briefUrl}
          topic={topic}
          briefText={structured?.executive_summary || (data.brief_text as string)}
        />

        {/* CTA */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
            <h2 className="text-xl font-bold mb-2">
              Get instant intelligence on any topic
            </h2>
            <p className="text-purple-100 text-sm mb-6">
              Pulsed analyzes Reddit, Hacker News, X, and the web to create
              actionable research briefs in seconds.
            </p>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-purple-600 bg-white rounded-xl hover:bg-purple-50 transition-colors shadow-lg"
            >
              Try Pulsed Free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

        <footer className="mt-12 text-center text-xs text-gray-400">
          <p>
            Made with{" "}
            <a href="/" className="text-purple-600 hover:text-purple-700 font-medium">Pulsed</a>
            {" "}— AI-powered market intelligence
          </p>
        </footer>
      </main>
    </div>
  );
}
