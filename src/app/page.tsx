'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReferralCapture from './components/ReferralCapture';

export default function Home() {
  const router = useRouter();
  const [activeUseCase, setActiveUseCase] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [displayedCommand, setDisplayedCommand] = useState('');
  const typingRef = useRef<NodeJS.Timeout | null>(null);

  const useCases = [
    {
      command: 'Build me a CRM that tracks my pipeline and sends follow-up reminders',
      agentHtml: (
        <div className="space-y-1.5">
          <p className="text-gray-800 font-medium">Done! I&apos;ve created your CRM with:</p>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>✅ <strong>Contact management</strong> — add, tag, and search contacts</li>
            <li>✅ <strong>Deal pipeline</strong> — drag deals through stages</li>
            <li>✅ <strong>Automated follow-ups</strong> — reminders at your intervals</li>
            <li>✅ <strong>Weekly pipeline report</strong> — every Monday at 9am</li>
          </ul>
          <p className="text-sm text-gray-500 mt-2">Your CRM is live. Try saying <span className="text-indigo-600 font-medium">&quot;Add a lead: John Smith, Acme Corp&quot;</span></p>
        </div>
      ),
    },
    {
      command: 'Research every AI startup that raised Series A this quarter and find me the decision makers',
      agentHtml: (
        <div className="space-y-1.5">
          <p className="text-gray-800 font-medium">Found <strong>34 AI startups</strong> with Series A rounds in Q1 2026. Here are the top 5:</p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <li>• <strong>NovaMind AI</strong> — $28M, CEO: Sarah Chen <span className="text-indigo-500">↗</span></li>
            <li>• <strong>Axion Labs</strong> — $22M, CEO: James Park <span className="text-indigo-500">↗</span></li>
            <li>• <strong>Cortex Systems</strong> — $19M, CTO: Priya Sharma <span className="text-indigo-500">↗</span></li>
            <li>• <strong>Synth AI</strong> — $15M, CEO: Marco Rossi <span className="text-indigo-500">↗</span></li>
            <li>• <strong>DeepForge</strong> — $14M, CEO: Lisa Wang <span className="text-indigo-500">↗</span></li>
          </ul>
          <p className="text-sm text-gray-500 mt-2">Full brief with LinkedIn profiles and talking points ready. <span className="text-indigo-600 font-medium">View brief →</span></p>
        </div>
      ),
    },
    {
      command: 'Set up a workflow that monitors competitors and alerts me when they launch something new',
      agentHtml: (
        <div className="space-y-1.5">
          <p className="text-gray-800 font-medium">🔔 Monitoring set up! I&apos;m now watching:</p>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• <strong>3 competitor websites</strong> — product pages, pricing, blog</li>
            <li>• <strong>Social media</strong> — Twitter/X, LinkedIn, Product Hunt</li>
            <li>• <strong>Press releases</strong> — PR Newswire, TechCrunch, VentureBeat</li>
          </ul>
          <p className="text-sm text-gray-500 mt-2">I&apos;ll send you a <strong>Telegram alert</strong> within minutes of any change. You can also ask me for a weekly summary.</p>
        </div>
      ),
    },
    {
      command: 'Automate lead enrichment for this list of 500 contacts — emails, company data, tech stack, everything',
      agentHtml: (
        <div className="space-y-1.5">
          <p className="text-gray-800 font-medium">Enrichment complete! Processed <strong>500 leads</strong>:</p>
          <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 space-y-0.5 border border-gray-100">
            <p>✓ 487/500 matched to companies</p>
            <p>✓ Added: email, title, company size, tech stack</p>
            <p>✓ Added: recent news, funding data, social links</p>
            <p>✓ Flagged 23 high-priority leads (recent funding)</p>
          </div>
          <p className="text-sm text-gray-500 mt-2">Spreadsheet exported. <span className="text-indigo-600 font-medium">Download enriched_leads.csv →</span></p>
        </div>
      ),
    },
    {
      command: 'Analyze the sentiment around our brand across every major platform this month',
      agentHtml: (
        <div className="space-y-1.5">
          <p className="text-gray-800 font-medium">Brand sentiment analysis complete. Scanned <strong>2,847 mentions</strong>:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Positive</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '64%' }}></div>
              </div>
              <span className="text-xs text-gray-500 font-medium">64%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Neutral</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-violet-400 h-full rounded-full" style={{ width: '24%' }}></div>
              </div>
              <span className="text-xs text-gray-500 font-medium">24%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Negative</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-gray-400 h-full rounded-full" style={{ width: '12%' }}></div>
              </div>
              <span className="text-xs text-gray-500 font-medium">12%</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Top theme: <strong>&quot;great support&quot;</strong> (mentioned 89 times). <span className="text-indigo-600 font-medium">Full report →</span></p>
        </div>
      ),
    },
  ];

  // Handle use case transitions with fade + typing
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setActiveUseCase((prev) => (prev + 1) % useCases.length);
        setFadeIn(true);
      }, 300);
    }, 8000);
    return () => clearInterval(interval);
  }, [useCases.length]);

  // Typing animation for command text
  useEffect(() => {
    if (typingRef.current) clearTimeout(typingRef.current);
    setDisplayedCommand('');
    const fullCommand = useCases[activeUseCase].command;
    let i = 0;
    const type = () => {
      if (i <= fullCommand.length) {
        setDisplayedCommand(fullCommand.slice(0, i));
        i++;
        typingRef.current = setTimeout(type, 18);
      }
    };
    type();
    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [activeUseCase]);

  const handleUseCaseClick = (i: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setActiveUseCase(i);
      setFadeIn(true);
    }, 200);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white scroll-smooth">
      <ReferralCapture />

      {/* Keyframe animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .typing-cursor::after {
          content: '▊';
          animation: blink 0.8s step-end infinite;
          color: #818cf8;
          margin-left: 1px;
        }
      ` }} />

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
              <a href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign in</a>
              <a
                href="/signup"
                className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  boxShadow: '0 0 0px rgba(124, 58, 237, 0)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(124, 58, 237, 0.4)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #4338ca, #6d28d9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0px rgba(124, 58, 237, 0)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5, #7c3aed)';
                }}
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 70%, #4c1d95 100%)',
          backgroundSize: '300% 300%',
          animation: 'gradient-shift 12s ease infinite',
        }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-indigo-300/70 font-medium mb-6">THE LAST SOFTWARE YOU WILL EVER NEED</p>
          <h1 className="text-5xl md:text-[72px] font-extrabold tracking-[-0.04em] leading-[1.02] max-w-4xl mx-auto text-white">
            One AI agent that{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              replaces everything
            </span>
          </h1>
          <p className="mt-8 text-xl text-indigo-200/70 leading-relaxed max-w-2xl mx-auto">
            Tell it what you need. It builds it. CRM, research, workflows, automation, analytics — powered by your own AI model, controlled entirely by you.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <a href="/signup" className="bg-white text-gray-900 font-semibold rounded-lg px-8 py-4 text-base hover:bg-gray-100 transition-colors">Start building now</a>
            <button onClick={() => scrollTo('what-it-does')} className="border border-white/20 text-white/90 font-semibold rounded-lg px-8 py-4 text-base hover:border-white/40 hover:text-white transition-all">See what it can do</button>
          </div>
          <p className="mt-6 text-sm text-indigo-300/50">Free to start. Bring your own API key. Cancel anytime.</p>
        </div>
      </section>

      {/* Social proof stats bar */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap justify-center gap-6 md:gap-12 text-sm text-gray-400">
          <span>2,400+ agents created</span>
          <span className="hidden sm:inline text-gray-200">·</span>
          <span>50+ countries</span>
          <span className="hidden sm:inline text-gray-200">·</span>
          <span>99.9% uptime</span>
        </div>
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
              {['CRM', 'Research', 'Workflows', 'Automation', 'Analytics'].map((label, i) => (
                <button
                  key={label}
                  onClick={() => handleUseCaseClick(i)}
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

            {/* Chat mockup with fade transition */}
            <div
              className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm"
              style={{
                opacity: fadeIn ? 1 : 0,
                transform: fadeIn ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
              }}
            >
              {/* Chat header */}
              <div className="bg-gray-50 px-5 py-3 flex items-center gap-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  <span className="text-white text-xs">⚡</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Pulsed Agent</p>
                  <p className="text-xs text-emerald-500">Online</p>
                </div>
              </div>
              {/* Chat messages */}
              <div className="px-5 py-5 space-y-4 min-h-[220px]">
                {/* User message — right aligned */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-md text-white text-sm leading-relaxed" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                    {useCases[activeUseCase].command}
                  </div>
                </div>
                {/* Agent message — left aligned */}
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                    <span className="text-white text-[10px]">⚡</span>
                  </div>
                  <div className="max-w-[85%]">
                    <p className="text-[11px] text-gray-400 mb-1 font-medium">Pulsed Agent</p>
                    <div className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                      {useCases[activeUseCase].agentHtml}
                    </div>
                  </div>
                </div>
              </div>
              {/* Chat input bar */}
              <div className="px-5 pb-4">
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50">
                  <p className="text-sm text-gray-400 flex-1">Type a message...</p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BYOLLM — moved up to second section */}
      <section className="py-20 md:py-28 bg-gray-50">
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
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-400 uppercase tracking-wider mb-6">Supported providers</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Anthropic', sub: 'Claude Opus, Sonnet, Haiku', color: '#D97757' },
                  { name: 'OpenAI', sub: 'GPT-4.1, o4-mini, Codex', color: '#10A37F' },
                  { name: 'Google', sub: 'Gemini 2.5 Flash, Pro', color: '#4285F4' },
                  { name: 'Moonshot', sub: 'Kimi K2', color: '#1a1a2e' },
                  { name: 'Meta', sub: 'Llama 4 via OpenRouter', color: '#0668E1' },
                  { name: 'Any provider', sub: 'OpenAI-compatible API', color: '#6366f1' },
                ].map((p) => (
                  <div
                    key={p.name}
                    className="rounded-lg px-4 py-3 border border-gray-100 transition-all duration-200 hover:border-gray-200 hover:shadow-sm cursor-default"
                    style={{ borderLeft: `3px solid ${p.color}` }}
                  >
                    <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Replaces Everything */}
      <section className="py-20 md:py-28 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Stop paying for software that does one thing</h2>
            <p className="mt-5 text-lg text-gray-400 max-w-2xl mx-auto">Every tool in your stack does a fraction of what one AI agent can do. And your agent gets smarter every time you use it.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 rounded-2xl overflow-hidden">
            {[
              { replaces: 'Your CRM', desc: 'Tracks contacts, manages pipeline, sends follow-ups, logs every interaction automatically.' },
              { replaces: 'Your research tools', desc: 'Scans the entire internet, synthesizes findings, delivers executive briefs in seconds.' },
              { replaces: 'Your data enrichment', desc: 'Takes a list of names or companies and fills in everything — emails, tech stack, funding, news.' },
              { replaces: 'Your workflow automation', desc: 'Builds multi-step workflows on the fly. No drag-and-drop builders. Just describe what you want.' },
              { replaces: 'Your analytics dashboards', desc: 'Analyzes your data, spots trends, generates reports. Ask questions in plain English.' },
              { replaces: 'Your project management', desc: 'Tracks tasks, sets deadlines, sends reminders, writes status updates. Manages itself.' },
            ].map((item) => (
              <div key={item.replaces} className="p-8 transition-all duration-200 hover:bg-white/5" style={{ background: 'rgba(15, 23, 42, 0.85)' }}>
                <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">Replaces</p>
                <h3 className="text-xl font-bold text-white mb-3">{item.replaces}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28 bg-white">
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
              <div key={s.step} className="relative group">
                <span className="text-8xl font-bold text-gray-100 leading-none transition-colors duration-200 group-hover:text-indigo-50">{s.step}</span>
                <h3 className="text-xl font-bold text-gray-900 mt-4 mb-2">{s.title}</h3>
                <p className="text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* See It In Action — Product Mockups */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 font-medium mb-4">SEE IT IN ACTION</p>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">Real results. Not marketing fluff.</h2>
            <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto">Here&apos;s what your agent actually delivers — research, alerts, and tools built on demand.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Research Brief Mockup */}
            <div className="group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                {/* Mini browser chrome */}
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-1.5 flex items-center gap-1.5 border-b border-gray-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                    <div className="flex-1 mx-4">
                      <div className="bg-white rounded border border-gray-200 px-2 py-0.5 text-[9px] text-gray-400 text-center">pulsed.ai/brief/ai-agents</div>
                    </div>
                  </div>
                  <div className="bg-white p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-gray-900 leading-tight">AI Agents in Enterprise</h4>
                      <span className="text-[9px] font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full whitespace-nowrap">247 sources</span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Key Themes</p>
                      <ul className="space-y-1">
                        <li className="flex items-start gap-1.5 text-[10px] text-gray-600">
                          <span className="w-1 h-1 rounded-full bg-indigo-500 mt-1 shrink-0"></span>
                          Autonomous agents replacing traditional SaaS
                        </li>
                        <li className="flex items-start gap-1.5 text-[10px] text-gray-600">
                          <span className="w-1 h-1 rounded-full bg-indigo-500 mt-1 shrink-0"></span>
                          Multi-agent orchestration emerging
                        </li>
                        <li className="flex items-start gap-1.5 text-[10px] text-gray-600">
                          <span className="w-1 h-1 rounded-full bg-indigo-500 mt-1 shrink-0"></span>
                          340% projected spending increase by 2027
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Sentiment</p>
                      <div className="flex rounded-full overflow-hidden h-1.5">
                        <div className="bg-indigo-500" style={{ width: '62%' }}></div>
                        <div className="bg-violet-400" style={{ width: '25%' }}></div>
                        <div className="bg-gray-300" style={{ width: '13%' }}></div>
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[8px] text-gray-400">Positive 62%</span>
                        <span className="text-[8px] text-gray-400">Neutral 25%</span>
                        <span className="text-[8px] text-gray-400">Negative 13%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="px-5 pb-5 text-sm text-gray-500">Deep research on any topic in seconds</p>
            </div>

            {/* Card 2: Telegram Alert Mockup */}
            <div className="group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="rounded-lg overflow-hidden border border-gray-200" style={{ background: '#e8ddd3' }}>
                  {/* Telegram header */}
                  <div className="px-3 py-2 flex items-center gap-2" style={{ background: '#517da2' }}>
                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                      <span className="text-white text-[8px]">⚡</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] font-semibold text-white">Pulsed AI</p>
                        <span className="text-[7px] bg-white/25 text-white px-1 rounded font-medium">bot</span>
                      </div>
                      <p className="text-[8px] text-white/70">online</p>
                    </div>
                  </div>
                  {/* Telegram messages */}
                  <div className="px-3 py-3 space-y-2">
                    {/* Bot message */}
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg rounded-bl-sm px-3 py-2 max-w-[88%] shadow-sm">
                        <p className="text-[10px] text-gray-800 leading-relaxed">🔔 <strong>New competitor alert:</strong> Acme Corp just launched an AI assistant product. Here&apos;s what I found:</p>
                        <ul className="mt-1 space-y-0.5 text-[10px] text-gray-600">
                          <li>• Targets mid-market SaaS teams</li>
                          <li>• Priced at $39/seat/month</li>
                          <li>• Limited to GPT-4 only</li>
                        </ul>
                        <p className="text-[8px] text-gray-400 text-right mt-1">2:34 PM</p>
                      </div>
                    </div>
                    {/* User reply */}
                    <div className="flex justify-end">
                      <div className="rounded-lg rounded-br-sm px-3 py-2 max-w-[75%] shadow-sm" style={{ background: '#dcf8c6' }}>
                        <p className="text-[10px] text-gray-800">Draft a response strategy</p>
                        <p className="text-[8px] text-gray-400 text-right mt-0.5">2:35 PM ✓✓</p>
                      </div>
                    </div>
                    {/* Bot reply */}
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg rounded-bl-sm px-3 py-2 max-w-[88%] shadow-sm">
                        <p className="text-[10px] text-gray-800">On it. I&apos;ll have a brief ready in 2 minutes. ⏳</p>
                        <p className="text-[8px] text-gray-400 text-right mt-0.5">2:35 PM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="px-5 pb-5 text-sm text-gray-500">Proactive alerts on Telegram</p>
            </div>

            {/* Card 3: Agent Building Mockup */}
            <div className="group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                  {/* Chat header */}
                  <div className="bg-gray-50 px-3 py-2 flex items-center gap-2 border-b border-gray-100">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                      <span className="text-white text-[7px]">⚡</span>
                    </div>
                    <p className="text-[10px] font-semibold text-gray-700">Pulsed Agent</p>
                  </div>
                  {/* Messages */}
                  <div className="px-3 py-3 space-y-2">
                    {/* User */}
                    <div className="flex justify-end">
                      <div className="px-3 py-2 rounded-xl rounded-br-sm text-white text-[10px]" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                        Build me a lead tracker for my sales pipeline
                      </div>
                    </div>
                    {/* Agent */}
                    <div className="flex items-start gap-1.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                        <span className="text-white text-[6px]">⚡</span>
                      </div>
                      <div className="bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl rounded-bl-sm max-w-[88%]">
                        <p className="text-[10px] text-gray-800 font-medium">Done! I&apos;ve created a lead tracker with:</p>
                        <ul className="mt-1 space-y-0.5 text-[10px] text-gray-600">
                          <li>✅ Contact management</li>
                          <li>✅ Deal stages</li>
                          <li>✅ Follow-up reminders</li>
                          <li>✅ Weekly pipeline report</li>
                        </ul>
                      </div>
                    </div>
                    {/* Mini table preview */}
                    <div className="ml-5 rounded-lg border border-gray-200 overflow-hidden bg-white">
                      <div className="bg-gray-50 px-2 py-1 border-b border-gray-100">
                        <p className="text-[8px] text-gray-500 font-medium">📊 Lead Tracker Preview</p>
                      </div>
                      <div className="px-2 py-1.5">
                        <div className="grid grid-cols-3 gap-1 text-[7px]">
                          <div className="font-semibold text-gray-700 pb-0.5 border-b border-gray-100">Lead</div>
                          <div className="font-semibold text-gray-700 pb-0.5 border-b border-gray-100">Stage</div>
                          <div className="font-semibold text-gray-700 pb-0.5 border-b border-gray-100">Value</div>
                          <div className="text-gray-600">Sarah K.</div>
                          <div><span className="bg-indigo-100 text-indigo-700 px-1 rounded text-[6px]">Proposal</span></div>
                          <div className="text-gray-600">$12k</div>
                          <div className="text-gray-600">Mike R.</div>
                          <div><span className="bg-violet-100 text-violet-700 px-1 rounded text-[6px]">Demo</span></div>
                          <div className="text-gray-600">$8k</div>
                          <div className="text-gray-600">Lisa W.</div>
                          <div><span className="bg-emerald-100 text-emerald-700 px-1 rounded text-[6px]">Closed</span></div>
                          <div className="text-gray-600">$24k</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="px-5 pb-5 text-sm text-gray-500">Build anything with plain English</p>
            </div>
          </div>
        </div>
      </section>

      {/* Connects to Everything */}
      <section id="connects" className="py-20 md:py-28 bg-white border-t border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 font-medium mb-4">CONNECTS TO YOUR WORLD</p>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">Your agent works with the tools you already use</h2>
            <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto">From messaging to productivity to CRM — your agent fits into your workflow.</p>
          </div>

          {/* Tool pills */}
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto mb-6">
            {[
              'Telegram', 'Discord', 'Slack', 'WhatsApp',
              'Google Sheets', 'Notion', 'Salesforce', 'HubSpot',
              'Gmail', 'Google Calendar', 'Jira', 'Linear',
              'GitHub', 'Stripe', 'Zapier', 'Make',
            ].map((tool) => (
              <span
                key={tool}
                className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-default"
              >
                {tool}
              </span>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mb-14">And thousands more via API</p>

          {/* Two-column cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Messaging card */}
            <div className="rounded-2xl border border-gray-200 p-6 bg-white hover:shadow-md transition-all duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Messaging</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">Your agent lives where you chat. Get alerts, ask questions, and run tasks from any messaging platform.</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#229ED912' }}>
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#229ED9"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Telegram</span>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Live</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#5865F212' }}>
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.12-.094.246-.194.373-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Discord</span>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Live</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#4A154B12' }}>
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#4A154B"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/></svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Slack</span>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Coming soon</span>
                </div>
              </div>
            </div>

            {/* Productivity card */}
            <div className="rounded-2xl border border-gray-200 p-6 bg-white hover:shadow-md transition-all duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Productivity</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">Your agent reads your docs, updates your sheets, and manages your tasks.</p>
              <div className="space-y-3">
                {[
                  { name: 'Google Sheets', color: '#0F9D58' },
                  { name: 'Notion', color: '#000000' },
                  { name: 'Google Calendar', color: '#4285F4' },
                  { name: 'Jira', color: '#0052CC' },
                ].map((tool) => (
                  <div key={tool.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${tool.color}12` }}>
                        <div className="w-4 h-4 rounded-sm" style={{ background: tool.color, opacity: 0.8 }}></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{tool.name}</span>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Via API</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 font-medium mb-4">PRICING</p>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">The last subscription you will ever pay for</h2>
            <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto">One agent replaces your entire tool stack. You pay for the platform. You control the AI costs.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto items-start">
            {[
              {
                name: 'Pro',
                price: '$19',
                desc: 'AI-powered research briefs',
                features: ['50 research briefs per month', 'All personas and search modes', 'Search history and bookmarks'],
                cta: '/signup?plan=pro',
                ctaText: 'Get Pro',
                highlight: false,
              },
              {
                name: 'Agent',
                price: '$49',
                desc: 'Your personal AI that builds anything',
                features: ['Everything in Pro', 'Personal AI agent', 'BYOLLM — any model, any provider', 'Web search, code, file management', 'Telegram and Discord integrations'],
                cta: '/signup?plan=agent',
                ctaText: 'Get Agent',
                highlight: true,
              },
              {
                name: 'Ultra',
                price: '$99',
                desc: 'Unlimited power. Full autonomy.',
                features: ['Everything in Agent', 'Unlimited research briefs', 'Autonomous scheduled tasks', 'All integrations', 'Priority support'],
                cta: '/signup?plan=ultra',
                ctaText: 'Get Ultra',
                highlight: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-8 border transition-all duration-200 hover:-translate-y-1 ${
                  tier.highlight
                    ? 'scale-105 relative'
                    : 'border-gray-200 bg-white hover:shadow-md'
                }`}
                style={
                  tier.highlight
                    ? {
                        background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7) border-box',
                        border: '2px solid transparent',
                        boxShadow: '0 0 40px rgba(124, 58, 237, 0.15), 0 0 80px rgba(124, 58, 237, 0.05)',
                      }
                    : undefined
                }
              >
                {tier.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className="text-xs font-bold text-white px-4 py-1.5 rounded-full"
                      style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                    >
                      Most Popular
                    </span>
                  </div>
                )}
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
                <a
                  href={tier.cta}
                  className={`mt-8 block w-full text-center py-3 px-6 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    tier.highlight
                      ? 'text-white hover:opacity-90'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  style={
                    tier.highlight
                      ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }
                      : undefined
                  }
                >
                  {tier.ctaText}
                </a>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-sm text-gray-400">All plans include a free tier with 3 research briefs per month. No credit card required to start.</p>

          {/* Research Engine mention */}
          <div className="mt-12 max-w-xl mx-auto">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  <span className="text-white text-[8px]">⚡</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">Every plan includes the Pulsed Research Engine</p>
              </div>
              <p className="text-xs text-gray-400">Scans thousands of sources in real time. Delivers executive briefs, competitive intel, and verified data in seconds.</p>
              {/* Mini brief preview */}
              <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 max-w-xs mx-auto">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold text-gray-700">Brief: AI Agents in Enterprise</span>
                  <span className="text-[7px] font-semibold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">247 sources</span>
                </div>
                <div className="filter blur-[3px] select-none pointer-events-none space-y-1">
                  <div className="h-1.5 bg-gray-200 rounded-full w-full"></div>
                  <div className="h-1.5 bg-gray-200 rounded-full w-4/5"></div>
                  <div className="h-1.5 bg-gray-200 rounded-full w-3/5"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' }}>
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
      <footer className="py-10" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-lg font-bold text-white">Pulsed</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              </div>
              <p className="text-sm text-gray-400">The last software you will ever need.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/signup" className="hover:text-white transition-colors">Research</a></li>
                <li><a href="/agent" className="hover:text-white transition-colors">Agent</a></li>
                <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/agent" className="hover:text-white transition-colors">Web Chat</a></li>
                <li><span>Telegram</span></li>
                <li><span>Discord</span></li>
                <li><span className="text-gray-500">Slack (coming soon)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-sm text-gray-500 text-center">
            &copy; 2026 Pulsed. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
