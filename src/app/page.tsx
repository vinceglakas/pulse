'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReferralCapture from './components/ReferralCapture';

export default function Home() {
  const router = useRouter();
  const [activeUseCase, setActiveUseCase] = useState(0);

  const useCases = [
    {
      command: '"Build me a CRM that tracks my pipeline and sends follow-up reminders"',
      result: 'Your agent creates a full CRM with contact management, deal tracking, automated follow-ups, and weekly pipeline reports. No code. No setup. Just tell it what you need.',
    },
    {
      command: '"Research every AI startup that raised Series A this quarter and find me the decision makers"',
      result: 'Your agent searches the web, cross-references Crunchbase data, identifies key contacts, and delivers a structured brief with names, roles, LinkedIn profiles, and talking points.',
    },
    {
      command: '"Monitor my competitors and alert me when they launch something new"',
      result: 'Your agent watches competitor websites, social media, press releases, and product pages. When something changes, it sends you a Telegram message with a summary and recommended response.',
    },
    {
      command: '"Create a Clay-style enrichment workflow for this list of 500 leads"',
      result: 'Your agent takes your CSV, enriches each lead with company data, tech stack, recent news, and social profiles. Outputs a clean spreadsheet ready for outreach.',
    },
    {
      command: '"Analyze the sentiment around our brand across Reddit, Twitter, and HN this month"',
      result: 'Your agent scans thousands of posts, extracts themes, measures sentiment, identifies influencers, and delivers an executive brief with actionable recommendations.',
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUseCase((prev) => (prev + 1) % useCases.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [useCases.length]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      <ReferralCapture />

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
            <button onClick={() => scrollTo('what-it-does')} className="hidden md:block text-sm text-gray-500 hover:text-gray-900 transition-colors">What it does</button>
            <button onClick={() => scrollTo('how-it-works')} className="hidden md:block text-sm text-gray-500 hover:text-gray-900 transition-colors">How it works</button>
            <div className="flex items-center gap-3">
              <a href="/pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="/search" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Research</a>
              <a href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign in</a>
              <a href="/signup" className="text-sm font-semibold text-white bg-gray-900 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">Get Started</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-400 font-medium mb-6">THE LAST SOFTWARE YOU WILL EVER NEED</p>
          <h1 className="text-5xl md:text-[72px] font-extrabold text-gray-900 tracking-[-0.04em] leading-[1.02] max-w-4xl mx-auto">
            One AI agent that replaces everything
          </h1>
          <p className="mt-8 text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Tell it what you need. It builds it. CRM, research, workflows, automation, analytics — powered by your own AI model, controlled entirely by you.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <a href="/signup" className="bg-gray-900 text-white font-semibold rounded-lg px-8 py-4 text-base hover:bg-gray-800 transition-colors">Start building now</a>
            <button onClick={() => scrollTo('what-it-does')} className="border border-gray-300 text-gray-700 font-semibold rounded-lg px-8 py-4 text-base hover:border-gray-400 hover:text-gray-900 transition-all">See what it can do</button>
          </div>
          <p className="mt-6 text-sm text-gray-400">Free to start. Bring your own API key. Cancel anytime.</p>
        </div>
      </section>

      {/* The line */}
      <div className="max-w-6xl mx-auto px-6">
        <hr className="border-gray-100" />
      </div>

      {/* What It Does — Use Case Rotator */}
      <section id="what-it-does" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 font-medium mb-4">WHAT IT DOES</p>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight max-w-3xl mx-auto">You describe the outcome. Your agent figures out the rest.</h2>
          </div>

          {/* Use case selector */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {['Build a CRM', 'Research leads', 'Monitor competitors', 'Enrich data', 'Analyze sentiment'].map((label, i) => (
                <button
                  key={label}
                  onClick={() => setActiveUseCase(i)}
                  className={`text-sm px-5 py-2.5 rounded-lg font-medium transition-all ${
                    activeUseCase === i
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Command + Result */}
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              {/* Terminal-style command */}
              <div className="bg-gray-950 px-6 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                </div>
                <p className="text-gray-400 text-sm font-mono">
                  <span className="text-indigo-400">you</span>
                  <span className="text-gray-600"> &gt; </span>
                  <span className="text-gray-200">{useCases[activeUseCase].command}</span>
                </p>
              </div>
              {/* Result */}
              <div className="bg-white px-6 py-6">
                <p className="text-gray-600 leading-relaxed">{useCases[activeUseCase].result}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Replaces Everything */}
      <section className="py-20 md:py-28 bg-gray-950">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Stop paying for software that does one thing</h2>
            <p className="mt-5 text-lg text-gray-400 max-w-2xl mx-auto">Every tool in your stack does a fraction of what one AI agent can do. And your agent gets smarter every time you use it.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-800 rounded-2xl overflow-hidden">
            {[
              { replaces: 'Your CRM', desc: 'Tracks contacts, manages pipeline, sends follow-ups, logs every interaction automatically.' },
              { replaces: 'Your research tools', desc: 'Scans the entire internet, synthesizes findings, delivers executive briefs in seconds.' },
              { replaces: 'Your data enrichment', desc: 'Takes a list of names or companies and fills in everything — emails, tech stack, funding, news.' },
              { replaces: 'Your workflow automation', desc: 'Builds multi-step workflows on the fly. No drag-and-drop builders. Just describe what you want.' },
              { replaces: 'Your analytics dashboards', desc: 'Analyzes your data, spots trends, generates reports. Ask questions in plain English.' },
              { replaces: 'Your project management', desc: 'Tracks tasks, sets deadlines, sends reminders, writes status updates. Manages itself.' },
            ].map((item) => (
              <div key={item.replaces} className="bg-gray-950 p-8">
                <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">Replaces</p>
                <h3 className="text-xl font-bold text-white mb-3">{item.replaces}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BYOLLM */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-gray-400 font-medium mb-4">YOUR MODEL. YOUR DATA. YOUR RULES.</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Bring your own LLM</h2>
              <p className="mt-5 text-lg text-gray-500 leading-relaxed">
                Connect your API key from Anthropic, OpenAI, Google, or any provider. Your data never touches our servers. Swap models as better ones drop. Zero vendor lock-in.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  'Your API key, your costs — we never mark up model usage',
                  'Switch between Claude, GPT, Gemini, Llama, Kimi anytime',
                  'Data stays in your environment — nothing stored on our side',
                  'Works with any OpenAI-compatible endpoint',
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center mt-0.5 shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="text-gray-600">{point}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <p className="text-sm text-gray-400 uppercase tracking-wider mb-6">Supported providers</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'Anthropic', sub: 'Claude Opus, Sonnet, Haiku' },
                  { name: 'OpenAI', sub: 'GPT-4.1, o4-mini, Codex' },
                  { name: 'Google', sub: 'Gemini 2.5 Flash, Pro' },
                  { name: 'Moonshot', sub: 'Kimi K2' },
                  { name: 'Meta', sub: 'Llama 4 via OpenRouter' },
                  { name: 'Any provider', sub: 'OpenAI-compatible API' },
                ].map((p) => (
                  <div key={p.name} className="bg-white rounded-xl p-4 border border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 font-medium mb-4">HOW IT WORKS</p>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">Three minutes from signup to your first agent</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create your account', desc: 'Sign up with Google or email. Takes 10 seconds.' },
              { step: '02', title: 'Add your API key', desc: 'Paste your key from Anthropic, OpenAI, or any supported provider. Your key, your model, your costs.' },
              { step: '03', title: 'Tell it what to build', desc: 'Describe what you need in plain English. Your agent handles the rest — research, code, files, automation, everything.' },
            ].map((s) => (
              <div key={s.step} className="relative">
                <span className="text-8xl font-bold text-gray-100 leading-none">{s.step}</span>
                <h3 className="text-xl font-bold text-gray-900 mt-4 mb-2">{s.title}</h3>
                <p className="text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 font-medium mb-4">INTEGRATIONS</p>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">Your agent works where you work</h2>
            <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto">Chat with your agent from any platform. Get alerts, updates, and reports delivered wherever you are.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Web Chat', desc: 'Full-featured chat interface at pulsed.ai/agent. Rich markdown, code blocks, file attachments.', status: 'Live' },
              { name: 'Telegram', desc: 'Message your agent from Telegram. Get proactive alerts, research updates, and task completions on mobile.', status: 'Live' },
              { name: 'Discord', desc: 'Add your agent to any Discord server. Works in DMs and channels. Perfect for team workflows.', status: 'Live' },
              { name: 'Slack', desc: 'Install your agent in your Slack workspace. Mention it in any channel or DM for instant help.', status: 'Coming soon' },
            ].map((integration) => (
              <div key={integration.name} className="rounded-2xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{integration.name}</h3>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    integration.status === 'Live'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>{integration.status}</span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{integration.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Research Engine */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 font-medium mb-4">BUILT-IN RESEARCH ENGINE</p>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">Every agent comes with a superpower</h2>
            <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto">The Pulsed research engine scans Reddit, Hacker News, X, YouTube, Google Trends, and the open web. Your agent uses it to answer any question with real, current data.</p>
          </div>
          <div className="max-w-3xl mx-auto rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex items-center gap-2 border-b border-gray-100">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <div className="flex-1 mx-8">
                <div className="bg-white rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-400 text-center max-w-xs mx-auto">pulsed.ai/brief/ai-agents-enterprise</div>
              </div>
            </div>
            <div className="bg-white p-6 md:p-10">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
                <h3 className="text-xl font-bold text-gray-900">Brief: AI Agents in Enterprise SaaS</h3>
                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full whitespace-nowrap">247 sources analyzed</span>
              </div>
              <p className="text-sm text-gray-400 mb-5">Generated in 28 seconds</p>
              <hr className="border-gray-100 mb-6" />
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">EXECUTIVE SUMMARY</h4>
                <p className="text-sm text-gray-500 leading-relaxed">AI agents are rapidly moving from experimental to production-ready in enterprise SaaS. Adoption is accelerating across customer support, sales development, and internal operations, with a projected 340% increase in enterprise spending by 2027.</p>
              </div>
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">KEY THEMES</h4>
                <ul className="space-y-2">
                  {[
                    'Autonomous agents replacing traditional SaaS workflows in support and SDR roles',
                    'Enterprise buyers demanding SOC 2 compliance and audit trails for AI agents',
                    'Multi-agent orchestration emerging as the next platform paradigm',
                    'Open-source agent frameworks gaining enterprise traction',
                  ].map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-900 mt-1.5 shrink-0"></span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">SENTIMENT</h4>
                <div className="flex rounded-full overflow-hidden h-2.5">
                  <div className="bg-gray-900" style={{ width: '62%' }}></div>
                  <div className="bg-gray-400" style={{ width: '25%' }}></div>
                  <div className="bg-gray-200" style={{ width: '13%' }}></div>
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                  <span>62% Positive</span>
                  <span>25% Neutral</span>
                  <span>13% Negative</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">RECOMMENDED ACTIONS</h4>
                <ul className="space-y-2">
                  {[
                    'Evaluate agent frameworks for internal automation use cases',
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
            </div>
          </div>
          <div className="text-center mt-10">
            <a href="/search" className="text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600 transition-colors">Try a free research brief</a>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 font-medium mb-4">PRICING</p>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">The last subscription you will ever pay for</h2>
            <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto">One agent replaces your entire tool stack. You pay for the platform. You control the AI costs.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: 'Pro',
                price: '$19',
                desc: 'AI-powered research briefs',
                features: ['50 research briefs per month', 'All personas and search modes', 'Search history and bookmarks'],
                cta: '/pricing',
                ctaText: 'Get Pro',
                highlight: false,
              },
              {
                name: 'Agent',
                price: '$49',
                desc: 'Your personal AI that builds anything',
                features: ['Everything in Pro', 'Personal AI agent', 'BYOLLM — any model, any provider', 'Web search, code, file management', 'Telegram and Discord integrations'],
                cta: '/pricing',
                ctaText: 'Get Agent',
                highlight: true,
              },
              {
                name: 'Ultra',
                price: '$99',
                desc: 'Unlimited power. Full autonomy.',
                features: ['Everything in Agent', 'Unlimited research briefs', 'Autonomous scheduled tasks', 'All integrations', 'Priority support'],
                cta: '/pricing',
                ctaText: 'Get Ultra',
                highlight: false,
              },
            ].map((tier) => (
              <div key={tier.name} className={`rounded-2xl p-8 border ${tier.highlight ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'}`}>
                <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">{tier.price}</span>
                  <span className="text-gray-500">/mo</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">{tier.desc}</p>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-gray-900 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={tier.cta} className={`mt-8 block w-full text-center py-3 px-6 rounded-lg text-sm font-semibold transition-colors ${
                  tier.highlight
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}>{tier.ctaText}</a>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-sm text-gray-400">All plans include a free tier with 3 research briefs per month. No credit card required to start.</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gray-950 py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Stop subscribing to tools.<br />Start building with intelligence.
          </h2>
          <p className="mt-6 text-lg text-gray-400">One agent. Any task. Your model. Your data.</p>
          <div className="mt-10">
            <a href="/signup" className="inline-block bg-white text-gray-900 font-semibold rounded-lg px-10 py-4 text-base hover:bg-gray-100 transition-colors">Get started free</a>
          </div>
          <p className="mt-6 text-sm text-gray-500">No credit card required. Set up in under 3 minutes.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-lg font-bold text-gray-900">Pulsed</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              </div>
              <p className="text-sm text-gray-400">The last software you will ever need.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="/search" className="hover:text-gray-900 transition-colors">Research</a></li>
                <li><a href="/agent" className="hover:text-gray-900 transition-colors">Agent</a></li>
                <li><a href="/pricing" className="hover:text-gray-900 transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="/agent" className="hover:text-gray-900 transition-colors">Web Chat</a></li>
                <li><span className="text-gray-400">Telegram</span></li>
                <li><span className="text-gray-400">Discord</span></li>
                <li><span className="text-gray-400">Slack (coming soon)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</a></li>
                <li><a href="/terms" className="hover:text-gray-900 transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-6 text-sm text-gray-400 text-center">
            &copy; 2026 Pulsed. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
