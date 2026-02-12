import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { StructuredBrief, SourcePost } from "@/lib/types";
import { ShareButtons } from "./share-buttons";
// sources-collapsible removed — sources are hidden

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

  if (!data) {
    return { title: "Brief Not Found | Pulsed" };
  }

  const topic = data.topic ?? "Research Brief";
  const structured = parseStructuredBrief(data.brief_text as string);
  const description = structured
    ? structured.executive_summary.slice(0, 160)
    : (data.brief_text as string).slice(0, 160);

  const url = `https://pulsed.ai/brief/${id}`;
  const ogImageUrl = `https://pulsed.ai/api/og/${id}`;

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

/* ─── UI Components ─── */
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-gray-200 shadow-sm rounded-xl p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
      {children}
    </h2>
  );
}

function SentimentBar({
  sentiment,
}: {
  sentiment: StructuredBrief["sentiment"];
}) {
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
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: "#22c55e" }}
          />
          <span className="text-xs text-gray-600">{positive}% Positive</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: "#eab308" }}
          />
          <span className="text-xs text-gray-600">{neutral}% Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: "#ec4899" }}
          />
          <span className="text-xs text-gray-600">{negative}% Negative</span>
        </div>
      </div>
    </div>
  );
}

export default async function BriefPublicPage({ params }: Props) {
  const { id } = await params;
  const data = await getBrief(id);

  if (!data) {
    notFound();
  }

  const topic = data.topic ?? "Research Brief";
  const sources = (data.sources ?? []) as SourcePost[];
  const createdDate = data.created_at
    ? new Date(data.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const structured = parseStructuredBrief(data.brief_text as string);
  const briefUrl = `https://pulsed.ai/brief/${id}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">Pulsed</span>
          </a>
          <a
            href="/signup"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-90 transition-opacity"
          >
            Try Pulsed Free
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-10 pb-16">
        {/* Topic Header */}
        <Card className="mb-6">
          <SectionHeader>Research Brief</SectionHeader>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {topic}
          </h1>
          <p className="text-sm text-gray-500">
            {createdDate}
          </p>
        </Card>

        {structured ? (
          <>
            {/* Executive Summary */}
            <Card className="mb-6">
              <SectionHeader>Executive Summary</SectionHeader>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {structured.executive_summary}
              </div>
            </Card>

            {/* Key Themes */}
            {structured.key_themes.length > 0 && (
              <Card className="mb-6">
                <SectionHeader>Key Findings</SectionHeader>
                <ul className="space-y-3">
                  {structured.key_themes.map((theme, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <span className="text-sm text-gray-900 font-medium">
                        {theme}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Sentiment */}
            {structured.sentiment && (
              <Card className="mb-6">
                <SectionHeader>Sentiment Analysis</SectionHeader>
                <SentimentBar sentiment={structured.sentiment} />
              </Card>
            )}

            {/* Recommended Actions */}
            {structured.recommended_actions?.length > 0 && (
              <Card className="mb-6">
                <SectionHeader>Recommended Actions</SectionHeader>
                <ul className="space-y-3">
                  {structured.recommended_actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <span className="text-sm text-gray-900">{action}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        ) : (
          /* Fallback for unstructured briefs */
          <Card className="mb-6">
            <SectionHeader>Analysis</SectionHeader>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {data.brief_text as string}
            </div>
          </Card>
        )}

        {/* Share / Action buttons (client component) — ABOVE sources */}
        <ShareButtons url={briefUrl} topic={topic} briefText={structured?.executive_summary || (data.brief_text as string)} />

        {/* Sources hidden — secret sauce */}

        {/* CTA */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-8 text-white">
            <h2 className="text-xl font-bold mb-2">
              Get instant intelligence on any topic
            </h2>
            <p className="text-indigo-100 text-sm mb-6">
              Pulsed analyzes Reddit, Hacker News, X, and the web to create
              actionable research briefs in seconds.
            </p>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-indigo-600 bg-white rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Try Pulsed Free
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

        {/* Footer branding */}
        <footer className="mt-12 text-center text-xs text-gray-400">
          <p>
            Made with{" "}
            <a
              href="/"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Pulsed
            </a>{" "}
            — AI-powered market intelligence
          </p>
        </footer>
      </main>
    </div>
  );
}
