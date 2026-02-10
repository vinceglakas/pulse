"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const SUGGESTED_TOPICS = [
  "AI in healthcare",
  "Salesforce alternatives",
  "Remote work tools 2026",
  "Sustainability in SaaS",
];

/* ─── Intersection Observer hook for scroll animations ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/* ─── Icons (inline SVG) ─── */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function AnalyzeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </svg>
  );
}

function BriefIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

/* ─── Step arrow divider ─── */
function StepArrow() {
  return (
    <div className="hidden md:flex items-center justify-center text-[#2A2A2D]">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const howItWorks = useInView();
  const briefPreview = useInView();
  const socialProof = useInView();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      {/* ══════ HERO ══════ */}
      <section className="flex flex-col items-center justify-center min-h-screen px-4 pt-16">
        <div className="w-full max-w-2xl mx-auto text-center">
          {/* Headline */}
          <h1
            className="text-[40px] sm:text-[56px] font-bold leading-[1.1] tracking-[-0.02em] text-[#F5F5F7] mb-4"
          >
            What&apos;s your market buzzing about?
          </h1>

          {/* Subheadline */}
          <p className="text-base text-[#8E8E93] mb-10 max-w-lg mx-auto leading-relaxed">
            AI-powered trend briefs from Reddit, HN, X, and YouTube. Know what
            people are actually saying — in 2 minutes.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="w-full mb-5">
            <div className="search-focus-gradient animate-pulse-glow rounded-[16px]">
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#636366] pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try 'AI in healthcare' or 'Salesforce alternatives'"
                  className="w-full h-[56px] bg-[#141415] border border-[#2A2A2D] rounded-[16px] pl-12 pr-4 text-base text-[#F5F5F7] placeholder:text-[#636366] outline-none focus:border-transparent transition-all duration-300"
                />
              </div>
            </div>
          </form>

          {/* Suggested topic pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTED_TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => setQuery(topic)}
                className="px-4 py-2 text-sm text-[#8E8E93] bg-[#141415] border border-[#2A2A2D] rounded-full hover:border-[#636366] hover:text-[#F5F5F7] transition-all duration-200 cursor-pointer"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section
        ref={howItWorks.ref}
        className={`py-24 px-4 transition-all duration-700 ${
          howItWorks.inView ? "animate-fade-in" : "opacity-0"
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-[#F5F5F7] mb-16">
            How it works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-6 md:gap-4 items-start">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-[#141415] border border-[#2A2A2D]">
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] mb-4">
                <SearchIcon />
              </div>
              <h3 className="text-lg font-semibold text-[#F5F5F7] mb-2">Search</h3>
              <p className="text-sm text-[#8E8E93] leading-relaxed">
                Enter any topic, product, or trend you want to research.
              </p>
            </div>

            <StepArrow />

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-[#141415] border border-[#2A2A2D]">
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB] mb-4">
                <AnalyzeIcon />
              </div>
              <h3 className="text-lg font-semibold text-[#F5F5F7] mb-2">Analyze</h3>
              <p className="text-sm text-[#8E8E93] leading-relaxed">
                We scan Reddit, HN, X, and YouTube for real-time conversations.
              </p>
            </div>

            <StepArrow />

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-[#141415] border border-[#2A2A2D]">
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#22C55E]/10 text-[#22C55E] mb-4">
                <BriefIcon />
              </div>
              <h3 className="text-lg font-semibold text-[#F5F5F7] mb-2">Brief</h3>
              <p className="text-sm text-[#8E8E93] leading-relaxed">
                Get a structured brief with themes, sentiment, and content ideas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ EXAMPLE BRIEF PREVIEW ══════ */}
      <section
        ref={briefPreview.ref}
        className={`py-24 px-4 transition-all duration-700 ${
          briefPreview.inView ? "animate-fade-in" : "opacity-0"
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-[#F5F5F7] mb-4">
            See what you get
          </h2>
          <p className="text-center text-[#8E8E93] mb-12 max-w-md mx-auto">
            Every brief gives you a full picture — themes, sentiment, top posts, and content ideas.
          </p>

          {/* Mock brief card */}
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-2xl p-6 sm:p-8 space-y-6">
            {/* Topic header */}
            <div className="border-b border-[#2A2A2D] pb-4">
              <p className="text-xs text-[#636366] uppercase tracking-wider mb-1">Trend Brief</p>
              <h3 className="text-xl font-bold text-[#F5F5F7]">&quot;AI in Healthcare&quot;</h3>
              <p className="text-sm text-[#8E8E93] mt-1">
                237 conversations analyzed · 48h window · Feb 2026
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Key Themes */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider">
                  Key Themes
                </h4>
                <div className="space-y-2">
                  {[
                    "FDA approval bottlenecks for AI diagnostics",
                    "GPT-4V in radiology — early results promising",
                    "Privacy concerns around patient data",
                    "Startup fundraising surge in Q1",
                  ].map((theme, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-[#0A0A0B] rounded-lg border border-[#2A2A2D]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] mt-1.5 shrink-0" />
                      <span className="text-sm text-[#F5F5F7]">{theme}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                {/* Sentiment */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider">
                    Sentiment
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-[#0A0A0B] overflow-hidden">
                      <div className="flex h-full">
                        <div className="bg-[#22C55E] h-full" style={{ width: "62%" }} />
                        <div className="bg-[#EAB308] h-full" style={{ width: "24%" }} />
                        <div className="bg-[#EF4444] h-full" style={{ width: "14%" }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-[#636366]">
                    <span>Positive 62%</span>
                    <span>Neutral 24%</span>
                    <span>Negative 14%</span>
                  </div>
                </div>

                {/* Top Posts */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider">
                    Top Posts
                  </h4>
                  <div className="space-y-2">
                    {[
                      { title: "AI diagnostics just got FDA clearance...", source: "r/medicine", score: "2.4k" },
                      { title: "We built an AI copilot for nurses", source: "Hacker News", score: "847" },
                      { title: "The real bottleneck isn't the AI...", source: "X/Twitter", score: "1.1k" },
                    ].map((post, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-[#0A0A0B] rounded-lg border border-[#2A2A2D]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-[#F5F5F7] truncate">{post.title}</p>
                          <p className="text-xs text-[#636366] mt-0.5">{post.source}</p>
                        </div>
                        <span className="text-xs text-[#8E8E93] ml-3 shrink-0">▲ {post.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Ideas */}
            <div className="border-t border-[#2A2A2D] pt-6">
              <h4 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider mb-3">
                Content Ideas
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Blog: 'FDA + AI: What 2026 approvals mean for healthtech'",
                  "LinkedIn post comparing GPT-4V radiology studies",
                  "Thread: Top 10 AI health startups to watch",
                  "Newsletter deep-dive on patient data privacy",
                ].map((idea, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 bg-[#0A0A0B] rounded-lg border border-[#2A2A2D]"
                  >
                    <span className="text-xs font-mono text-[#7C3AED] mt-0.5">{i + 1}.</span>
                    <span className="text-sm text-[#F5F5F7]">{idea}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ SOCIAL PROOF + CTA ══════ */}
      <section
        ref={socialProof.ref}
        className={`py-24 px-4 transition-all duration-700 ${
          socialProof.inView ? "animate-fade-in" : "opacity-0"
        }`}
      >
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-[#636366] mb-2 tracking-wide uppercase">Beta</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] mb-4">
            Join 500+ marketing &amp; sales teams in the beta
          </h2>
          <p className="text-[#8E8E93] mb-8 max-w-md mx-auto">
            Get trend briefs that actually help you create content, spot opportunities, and understand your market.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-medium text-white rounded-xl cursor-pointer bg-gradient-to-r from-[#7C3AED] to-[#2563EB] hover:opacity-90 transition-opacity duration-200 shadow-lg shadow-[#7C3AED]/20"
          >
            Start researching — it&apos;s free
            <ArrowRightIcon />
          </button>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="py-12 px-4 border-t border-[#2A2A2D]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#636366]">
          <p>&copy; 2026 Pulse. All rights reserved.</p>
          <a
            href="https://www.getsliq.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#8E8E93] transition-colors duration-200 flex items-center gap-1"
          >
            For procurement intelligence, try SLIQ
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
