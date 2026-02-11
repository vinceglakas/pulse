'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showBanner, setShowBanner] = useState(true);
  const [activePersona, setActivePersona] = useState(0);

  const [exampleIndex, setExampleIndex] = useState(0);
  const [pillSet, setPillSet] = useState(0);

  const personas = [
    { role: 'Sales Teams', desc: 'Research prospects, track competitor moves, and find market signals before your next call.', examples: [
      '"What are healthcare CIOs prioritizing this quarter?"',
      '"How are mid-market companies evaluating CRM platforms?"',
      '"What objections are buyers raising about cloud migration?"',
    ]},
    { role: 'Marketing Teams', desc: 'Spot trending topics, understand audience sentiment, and find content gaps in your market.', examples: [
      '"What content is resonating in the fitness industry right now?"',
      '"How is Gen Z talking about sustainable fashion?"',
      '"What marketing channels are DTC brands shifting budget to?"',
    ]},
    { role: 'Content Creators', desc: 'Find what people actually care about, discover underserved topics, and validate ideas fast.', examples: [
      '"What personal finance topics are trending on YouTube?"',
      '"What questions are home cooks asking about meal prep?"',
      '"What are people saying about the best productivity apps?"',
    ]},
    { role: 'Founders & VCs', desc: 'Validate markets, track emerging trends, and research competitors before making your next move.', examples: [
      '"What\'s the sentiment around climate tech funding?"',
      '"What are people saying about Cursor vs Windsurf for coding?"',
      '"What problems are small business owners facing with payments?"',
    ]},
    { role: 'Product Teams', desc: 'Understand user pain points, track feature requests, and monitor industry shifts.', examples: [
      '"What features are Figma users requesting the most?"',
      '"What are teachers saying about EdTech tools in 2026?"',
      '"How are remote teams dealing with async communication?"',
    ]},
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePersona((prev) => (prev + 1) % personas.length);
      setExampleIndex(0);
    }, 6000);
    return () => clearInterval(interval);
  }, [personas.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setExampleIndex((prev) => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, [activePersona]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPillSet((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleTopic = (topic: string) => {
    router.push(`/search?q=${encodeURIComponent(topic)}`);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Announcement Bar */}
      {showBanner && (
        <div className="bg-indigo-600 text-white text-sm text-center py-2.5 px-4 relative">
          <span>Pulsed is in beta — get 3 free searches. No credit card needed.</span>
          <button
            onClick={() => setShowBanner(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold text-gray-900">Pulsed</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </div>
          <div className="flex items-center gap-8">
            <button onClick={() => scrollTo('how-it-works')} className="hidden md:block text-sm text-gray-500 hover:text-gray-900 transition-colors">How it works</button>
            <button onClick={() => scrollTo('why-pulsed')} className="hidden md:block text-sm text-gray-500 hover:text-gray-900 transition-colors">Why Pulsed</button>
            <div className="flex items-center gap-3">
              <a href="/sign-in" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign in</a>
              <a href="/search" className="text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">Get Started</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-14 md:pt-28 md:pb-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-[60px] font-extrabold text-gray-900 tracking-[-0.04em] leading-[1.05]">
            Research any topic.<br />Get answers in 30 seconds.
          </h1>
          <p className="mt-6 text-lg text-gray-500 leading-relaxed max-w-xl mx-auto">
            AI-powered intelligence briefs on any topic — key themes, sentiment analysis, and actionable insights from across the internet.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-10 max-w-[640px] mx-auto">
            <div className="flex items-center h-[52px] bg-white border border-gray-200 rounded-xl shadow-sm focus-within:border-indigo-300 focus-within:shadow-md transition-all">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you want to research?"
                className="flex-1 h-full px-5 bg-transparent text-gray-900 placeholder-gray-400 text-base outline-none rounded-l-xl"
              />
              <button
                type="submit"
                className="h-[40px] px-5 mr-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 shrink-0"
              >
                Search
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          </form>

          {/* Suggested Topics — rotating sets */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {[
              ['AI agents in enterprise', 'Remote work trends', 'Climate tech funding', 'Developer tools market'],
              ['Best CRM for startups', 'Plant-based food trends', 'TikTok marketing strategies', 'EV market sentiment'],
              ['Freelancer tax tools', 'Mental health apps', 'Real estate market 2026', 'Podcast growth tactics'],
            ][pillSet].map((topic) => (
              <button
                key={topic}
                onClick={() => handleTopic(topic)}
                className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Built For — Persona Rotator */}
      <section className="py-14 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm text-gray-400 uppercase tracking-widest text-center mb-8">Built for every team that needs to stay informed</p>
          {/* Persona tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {personas.map((p, i) => (
              <button
                key={p.role}
                onClick={() => setActivePersona(i)}
                className={`text-sm px-4 py-2 rounded-lg font-medium transition-all ${
                  activePersona === i
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {p.role}
              </button>
            ))}
          </div>
          {/* Active persona content */}
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-lg text-gray-700 leading-relaxed">{personas[activePersona].desc}</p>
            <div className="mt-4 h-8 flex items-center justify-center">
              <p key={`${activePersona}-${exampleIndex}`} className="text-sm text-indigo-600 font-medium italic animate-fade-example">
                {personas[activePersona].examples[exampleIndex]}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-20 bg-[#F9FAFB]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm uppercase tracking-widest text-indigo-600 font-semibold">HOW IT WORKS</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900">From question to insight in three steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Enter your topic', desc: 'Type any trend, market, technology, or question you want to research.', iconPath: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
              { step: '02', title: 'AI analyzes the landscape', desc: 'Two-phase deep search: discover key voices and communities, then drill into what they\'re actually saying.', iconPath: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              { step: '03', title: 'Get your brief', desc: 'A structured intelligence report with key themes, sentiment, and actionable insights.', iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            ].map((s) => (
              <div key={s.step} className="relative bg-white rounded-2xl p-8 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all">
                <span className="absolute top-6 right-8 text-5xl font-bold text-gray-100">{s.step}</span>
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={s.iconPath} /></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Demo / Brief Preview */}
      <section id="demo" className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm uppercase tracking-widest text-indigo-600 font-semibold">SEE IT IN ACTION</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900">Intelligence reports, not just search results</h2>
          </div>
          <div className="max-w-3xl mx-auto rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            {/* Window Chrome */}
            <div className="bg-gray-50 px-4 py-3 flex items-center gap-2 border-b border-gray-100">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <div className="flex-1 mx-8">
                <div className="bg-white rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-400 text-center max-w-xs mx-auto">pulsed.ai/brief/ai-agents-enterprise</div>
              </div>
            </div>
            {/* Brief Content */}
            <div className="bg-white p-6 md:p-10">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
                <h3 className="text-xl font-bold text-gray-900">Brief: AI Agents in Enterprise SaaS</h3>
                <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full whitespace-nowrap">30 sources analyzed</span>
              </div>
              <p className="text-sm text-gray-400 mb-5">Generated Feb 10, 2026 · 47 sources · 1,240 upvotes analyzed · 30 second read</p>
              <hr className="border-gray-100 mb-6" />

              {/* Executive Summary */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Executive Summary</h4>
                <p className="text-sm text-gray-500 leading-relaxed">AI agents are rapidly moving from experimental to production-ready in enterprise SaaS. Adoption is accelerating across customer support, sales development, and internal operations, with a projected 340% increase in enterprise spending by 2027.</p>
              </div>

              {/* Key Themes */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Key Themes</h4>
                <ul className="space-y-2">
                  {[
                    'Autonomous agents replacing traditional SaaS workflows in support & SDR roles',
                    'Enterprise buyers demanding SOC 2 compliance and audit trails for AI agents',
                    'Multi-agent orchestration emerging as the next platform paradigm',
                    'Open-source agent frameworks (CrewAI, AutoGen) gaining enterprise traction',
                  ].map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sentiment Analysis */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Sentiment Analysis</h4>
                <div className="flex rounded-full overflow-hidden h-3">
                  <div className="bg-emerald-400" style={{ width: '62%' }}></div>
                  <div className="bg-yellow-400" style={{ width: '25%' }}></div>
                  <div className="bg-red-400" style={{ width: '13%' }}></div>
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                  <span>62% Positive</span>
                  <span>25% Neutral</span>
                  <span>13% Negative</span>
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Recommended Actions</h4>
                <ul className="space-y-2">
                  {[
                    'Evaluate CrewAI and AutoGen for internal automation use cases',
                    'Monitor SOC 2 certification progress among top AI agent vendors',
                    'Brief leadership on the multi-agent orchestration trend by Q2',
                  ].map((a, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <div className="w-4 h-4 rounded border border-gray-300 shrink-0"></div>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Follow-up */}
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-indigo-900 mb-2">Want to go deeper?</p>
                <div className="flex flex-wrap gap-2">
                  {['Compare agent frameworks', 'Enterprise adoption timeline', 'Pricing models analysis'].map((q, i) => (
                    <span key={i} className="text-xs bg-white text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100">{q}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Pulsed */}
      <section id="why-pulsed" className="py-16 md:py-20 bg-[#F9FAFB]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm uppercase tracking-widest text-indigo-600 font-semibold">WHY PULSED</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900">Stop drowning in tabs. Start making decisions.</h2>
            <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">Traditional research takes hours of reading, bookmarking, and synthesizing. Pulsed does it in seconds.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Hours → Seconds', desc: 'What used to take a morning of research now takes 30 seconds. Get the full picture instantly.', iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              { title: 'Comprehensive Coverage', desc: "Our AI doesn't just search — it reads, analyzes, and synthesizes from hundreds of sources.", iconPath: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
              { title: 'Actionable Intelligence', desc: 'Not just data — structured briefs with themes, sentiment, and recommended next steps.', iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath} /></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Google gives you links. Pulsed gives you answers.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-200 p-6">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Traditional research</p>
              <ul className="space-y-3">
                {['Open 20+ tabs', 'Skim articles for relevant info', 'Cross-reference multiple sources', 'Manually synthesize findings', 'Write up your own summary', 'Hope you didn\'t miss anything'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-500">
                    <span className="text-red-400">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm font-semibold text-gray-400">~2-4 hours</p>
            </div>
            <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/30 p-6">
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-4">With Pulsed</p>
              <ul className="space-y-3">
                {['Type your topic', 'AI reads hundreds of sources for you', 'Key themes extracted automatically', 'Sentiment analysis included', 'Actionable recommendations ready', 'Shareable brief with one click'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <span className="text-emerald-500">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm font-semibold text-indigo-600">~30 seconds</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x divide-gray-100">
            {[
              { num: '100s', label: 'Sources analyzed per query' },
              { num: '30s', label: 'Average brief generation time' },
              { num: '500+', label: 'Beta users and counting' },
              { num: '30 days', label: 'Of trend data analyzed' },
            ].map((stat) => (
              <div key={stat.num} className="text-center px-4">
                <p className="text-4xl font-bold text-gray-900">{stat.num}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Start making smarter decisions</h2>
          <p className="mt-4 text-gray-400 text-lg">Join 500+ researchers using Pulsed to stay ahead.</p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <a href="/search" className="bg-white text-gray-900 font-semibold rounded-lg px-8 py-3 hover:bg-gray-50 transition-colors">Get Started Free</a>
            <button onClick={() => scrollTo('demo')} className="border border-gray-600 text-gray-300 rounded-lg px-8 py-3 hover:border-gray-400 hover:text-white transition-colors">See an example brief →</button>
          </div>
          <p className="mt-6 text-sm text-gray-500">No credit card required · 3 free searches per month</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-lg font-bold text-gray-900">Pulsed</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              </div>
              <p className="text-sm text-gray-400">AI-powered market intelligence</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><button onClick={() => scrollTo('how-it-works')} className="hover:text-gray-900 transition-colors">How it works</button></li>
                <li><button onClick={() => scrollTo('why-pulsed')} className="hover:text-gray-900 transition-colors">Why Pulsed</button></li>
                <li><span className="text-gray-300">Pricing (Coming Soon)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-6 text-sm text-gray-400 text-center">
            © 2026 Pulsed. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
