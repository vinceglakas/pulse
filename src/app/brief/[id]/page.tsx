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
      <div className="flex w-full h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
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
        <span className="text-xs" style={{ color: '#4ade80' }}>{positive}% Positive</span>
        <span className="text-xs" style={{ color: '#facc15' }}>{neutral}% Neutral</span>
        <span className="text-xs" style={{ color: '#f472b6' }}>{negative}% Negative</span>
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

  const totalUpvotes = sources.reduce((sum, s) => sum + (s.score || 0), 0);
  const briefLength = (data.brief_text as string).length;
  const readTime = Math.max(15, Math.round(briefLength / 800 * 60));

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-lg font-bold" style={{ color: '#f0f0f5' }}>Pulsed</span>
          </a>
          <a
            href="/signup"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            Try Pulsed Free
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        {/* Title */}
        <div className="mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#f0f0f5' }}>
            Brief: {topic}
          </h1>
        </div>

        <p className="text-sm mb-10" style={{ color: '#6b6b80' }}>
          Generated {createdDate}
        </p>

        {structured ? (
          <>
            {/* EXECUTIVE SUMMARY */}
            <div className="mb-10">
              <h2 className="text-sm font-extrabold uppercase tracking-wider mb-4" style={{ color: '#8b8b9e' }}>
                Executive Summary
              </h2>
              <p className="text-[15px] leading-relaxed" style={{ color: '#c0c0d0' }}>
                {structured.executive_summary}
              </p>
            </div>

            {/* KEY THEMES */}
            {structured.key_themes.length > 0 && (
              <div className="mb-10">
                <h2 className="text-sm font-extrabold uppercase tracking-wider mb-4" style={{ color: '#8b8b9e' }}>
                  Key Themes
                </h2>
                <ul className="space-y-3">
                  {structured.key_themes.map((theme, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: '#6366f1' }} />
                      <span className="text-[15px]" style={{ color: '#c0c0d0' }}>{theme}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SENTIMENT ANALYSIS */}
            {structured.sentiment && (
              <div className="mb-10">
                <h2 className="text-sm font-extrabold uppercase tracking-wider mb-4" style={{ color: '#8b8b9e' }}>
                  Sentiment Analysis
                </h2>
                <SentimentBar sentiment={structured.sentiment} />
              </div>
            )}

            {/* RECOMMENDED ACTIONS */}
            {structured.recommended_actions?.length > 0 && (
              <div className="mb-10">
                <h2 className="text-sm font-extrabold uppercase tracking-wider mb-4" style={{ color: '#8b8b9e' }}>
                  Recommended Actions
                </h2>
                <ul className="space-y-3">
                  {structured.recommended_actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 shrink-0 bg-transparent" readOnly />
                      <span className="text-[15px]" style={{ color: '#c0c0d0' }}>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="mb-10">
            <h2 className="text-sm font-extrabold uppercase tracking-wider mb-4" style={{ color: '#8b8b9e' }}>
              Analysis
            </h2>
            <div className="text-[15px] leading-relaxed whitespace-pre-line" style={{ color: '#c0c0d0' }}>
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
          <div className="rounded-2xl p-8 text-white" style={{ background: 'rgba(17,17,24,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#f0f0f5' }}>
              Get instant intelligence on any topic
            </h2>
            <p className="text-sm mb-6" style={{ color: '#8b8b9e' }}>
              AI-powered research briefs on any topic in seconds.
            </p>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white rounded-xl hover:opacity-90 transition-colors shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              Try Pulsed Free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

        <footer className="mt-12 text-center text-xs" style={{ color: '#6b6b80' }}>
          <p>
            Made with{" "}
            <a href="/" className="text-indigo-400 hover:text-indigo-300 font-medium">Pulsed</a>
            {" "}&mdash; AI-powered market intelligence
          </p>
        </footer>
      </main>
    </div>
  );
}
