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
      label: 'CRM',
      command: 'Build me a CRM that tracks my pipeline and sends follow-up reminders',
      agentHtml: (
        <div className="space-y-2">
          <p className="text-[#f0f0f5] font-medium text-sm">Done. I created your CRM:</p>
          <ul className="space-y-1.5 text-sm text-[#8b8b9e]">
            <li className="flex items-center gap-2"><svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg><span><strong className="text-[#c4c4d4]">Contact management</strong> — add, tag, search</span></li>
            <li className="flex items-center gap-2"><svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg><span><strong className="text-[#c4c4d4]">Deal pipeline</strong> — drag deals through stages</span></li>
            <li className="flex items-center gap-2"><svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg><span><strong className="text-[#c4c4d4]">Automated follow-ups</strong> — at your intervals</span></li>
            <li className="flex items-center gap-2"><svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg><span><strong className="text-[#c4c4d4]">Weekly pipeline report</strong> — every Monday 9am</span></li>
          </ul>
          <p className="text-xs text-[#6b6b80] mt-2">Your CRM is live. Try <span className="text-indigo-400 font-medium">&quot;Add a lead: John Smith, Acme Corp&quot;</span></p>
        </div>
      ),
    },
    {
      label: 'Research',
      command: 'Research every AI startup that raised Series A this quarter and find me the decision makers',
      agentHtml: (
        <div className="space-y-2">
          <p className="text-[#f0f0f5] font-medium text-sm">Found <strong>34 AI startups</strong> with Series A rounds in Q1 2026:</p>
          <ul className="space-y-1.5 text-sm text-[#8b8b9e]">
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span><strong className="text-[#c4c4d4]">NovaMind AI</strong> — $28M, CEO: Sarah Chen</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span><strong className="text-[#c4c4d4]">Axion Labs</strong> — $22M, CEO: James Park</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span><strong className="text-[#c4c4d4]">Cortex Systems</strong> — $19M, CTO: Priya Sharma</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0"></span><strong className="text-[#c4c4d4]">Synth AI</strong> — $15M, CEO: Marco Rossi</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0"></span><strong className="text-[#c4c4d4]">DeepForge</strong> — $14M, CEO: Lisa Wang</li>
          </ul>
          <p className="text-xs text-[#6b6b80] mt-2">Full brief with LinkedIn profiles ready. <span className="text-indigo-400 font-medium">View brief</span></p>
        </div>
      ),
    },
    {
      label: 'Workflows',
      command: 'Set up a workflow that monitors competitors and alerts me when they launch something new',
      agentHtml: (
        <div className="space-y-2">
          <p className="text-[#f0f0f5] font-medium text-sm">Monitoring configured. Now watching:</p>
          <ul className="space-y-1.5 text-sm text-[#8b8b9e]">
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span><strong className="text-[#c4c4d4]">3 competitor websites</strong> — product pages, pricing, blog</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span><strong className="text-[#c4c4d4]">Social media</strong> — Twitter/X, LinkedIn, Product Hunt</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span><strong className="text-[#c4c4d4]">Press releases</strong> — TechCrunch, VentureBeat</li>
          </ul>
          <p className="text-xs text-[#6b6b80] mt-2">Telegram alerts within minutes of any change. Ask for a weekly summary anytime.</p>
        </div>
      ),
    },
    {
      label: 'Automation',
      command: 'Automate lead enrichment for this list of 500 contacts — emails, company data, tech stack',
      agentHtml: (
        <div className="space-y-2">
          <p className="text-[#f0f0f5] font-medium text-sm">Enrichment complete. Processed <strong>500 leads</strong>:</p>
          <div className="rounded-lg p-3 text-xs font-mono text-[#8b8b9e] space-y-1 border border-white/[0.06] bg-white/[0.03]">
            <p className="flex items-center gap-2"><svg className="w-3 h-3 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>487/500 matched to companies</p>
            <p className="flex items-center gap-2"><svg className="w-3 h-3 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Added: email, title, company size, tech stack</p>
            <p className="flex items-center gap-2"><svg className="w-3 h-3 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Added: recent news, funding data, social links</p>
            <p className="flex items-center gap-2"><svg className="w-3 h-3 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>Flagged 23 high-priority leads (recent funding)</p>
          </div>
          <p className="text-xs text-[#6b6b80] mt-2">Spreadsheet exported. <span className="text-indigo-400 font-medium">Download enriched_leads.csv</span></p>
        </div>
      ),
    },
    {
      label: 'Analytics',
      command: 'Analyze the sentiment around our brand across every major platform this month',
      agentHtml: (
        <div className="space-y-2">
          <p className="text-[#f0f0f5] font-medium text-sm">Brand sentiment analysis complete. Scanned <strong>2,847 mentions</strong>:</p>
          <div className="space-y-2.5 mt-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[#8b8b9e] w-16 text-xs">Positive</span>
              <div className="flex-1 bg-white/[0.06] rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full" style={{ width: '64%' }}></div>
              </div>
              <span className="text-xs text-[#8b8b9e] font-medium w-8">64%</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[#8b8b9e] w-16 text-xs">Neutral</span>
              <div className="flex-1 bg-white/[0.06] rounded-full h-2 overflow-hidden">
                <div className="bg-violet-400/60 h-full rounded-full" style={{ width: '24%' }}></div>
              </div>
              <span className="text-xs text-[#8b8b9e] font-medium w-8">24%</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[#8b8b9e] w-16 text-xs">Negative</span>
              <div className="flex-1 bg-white/[0.06] rounded-full h-2 overflow-hidden">
                <div className="bg-[#3a3a4a] h-full rounded-full" style={{ width: '12%' }}></div>
              </div>
              <span className="text-xs text-[#8b8b9e] font-medium w-8">12%</span>
            </div>
          </div>
          <p className="text-xs text-[#6b6b80] mt-2">Top theme: <strong className="text-[#c4c4d4]">&quot;great support&quot;</strong> (89 mentions). <span className="text-indigo-400 font-medium">Full report</span></p>
        </div>
      ),
    },
  ];

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
    <div className="min-h-screen scroll-smooth" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      <ReferralCapture />

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
          content: '|';
          animation: blink 0.8s step-end infinite;
          color: #818cf8;
          margin-left: 1px;
          font-weight: 300;
        }
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .marquee-row:hover {
          animation-play-state: paused;
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.15), 0 0 60px rgba(139, 92, 246, 0.08); }
          50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.25), 0 0 80px rgba(139, 92, 246, 0.12); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .glass-card {
          background: rgba(17, 17, 24, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .glass-card:hover {
          border-color: rgba(99, 102, 241, 0.2);
          box-shadow: 0 0 30px rgba(99, 102, 241, 0.08);
        }
        .glow-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
          transition: all 0.3s ease;
        }
        .glow-btn:hover {
          box-shadow: 0 0 40px rgba(99, 102, 241, 0.5), 0 0 80px rgba(139, 92, 246, 0.2);
          transform: translateY(-1px);
        }
      ` }} />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: 'rgba(10, 10, 15, 0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold text-white">Pulsed</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </div>
          <div className="flex items-center gap-8">
            <button onClick={() => scrollTo('what-it-does')} className="hidden md:block text-sm text-[#8b8b9e] hover:text-white transition-colors">What it does</button>
            <button onClick={() => scrollTo('how-it-works')} className="hidden md:block text-sm text-[#8b8b9e] hover:text-white transition-colors">How it works</button>
            <div className="flex items-center gap-3">
              <a href="/pricing" className="text-sm text-[#8b8b9e] hover:text-white transition-colors">Pricing</a>
              <a href="/login" className="text-sm text-[#8b8b9e] hover:text-white transition-colors">Sign in</a>
              <a href="/signup" className="glow-btn text-sm font-semibold text-white px-4 py-2 rounded-lg">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 pb-20 md:pt-36 md:pb-32 overflow-hidden">
        {/* Animated gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 40%, transparent 70%)',
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-indigo-400/70 font-medium mb-6">The last software you will ever need</p>
          <h1 className="text-5xl md:text-[76px] font-extrabold tracking-[-0.04em] leading-[1.02] max-w-4xl mx-auto text-white">
            Your AI.{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Your rules.
            </span>
          </h1>
          <p className="mt-8 text-xl text-[#8b8b9e] leading-relaxed max-w-2xl mx-auto">
            One AI agent that builds, researches, and automates anything you describe. Powered by your own model. Controlled entirely by you.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <a href="/signup" className="glow-btn font-semibold rounded-lg px-8 py-4 text-base text-white">
              Start building now
            </a>
            <button
              onClick={() => scrollTo('what-it-does')}
              className="border border-white/10 text-white/80 font-semibold rounded-lg px-8 py-4 text-base hover:border-white/25 hover:text-white transition-all"
            >
              See what it can do
            </button>
          </div>
          <p className="mt-6 text-sm text-[#6b6b80]">Free to start. Bring your own API key. Cancel anytime.</p>
        </div>
      </section>

      {/* Stats bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap justify-center gap-8 md:gap-16 text-sm text-[#6b6b80]">
          <span>2,400+ agents created</span>
          <span className="hidden sm:inline text-white/10">|</span>
          <span>50+ countries</span>
          <span className="hidden sm:inline text-white/10">|</span>
          <span>99.9% uptime</span>
        </div>
      </div>

      {/* What It Does — Demo Section */}
      <section id="what-it-does" className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-400/60 font-medium mb-4">What it does</p>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight max-w-3xl mx-auto">You describe the outcome. Your agent figures out the rest.</h2>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Use case selector */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {useCases.map((uc, i) => (
                <button
                  key={uc.label}
                  onClick={() => handleUseCaseClick(i)}
                  className="text-sm px-5 py-2.5 rounded-lg font-medium transition-all duration-200"
                  style={{
                    background: activeUseCase === i ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.04)',
                    color: activeUseCase === i ? '#fff' : '#8b8b9e',
                    border: activeUseCase === i ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: activeUseCase === i ? '0 0 20px rgba(99, 102, 241, 0.2)' : 'none',
                  }}
                >
                  {uc.label}
                </button>
              ))}
            </div>

            {/* Chat mockup */}
            <div
              className="rounded-2xl overflow-hidden glass-card"
              style={{
                opacity: fadeIn ? 1 : 0,
                transform: fadeIn ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
                animation: 'glow-pulse 4s ease-in-out infinite',
              }}
            >
              {/* Chat header */}
              <div className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Pulsed Agent</p>
                  <p className="text-xs text-emerald-400">Online</p>
                </div>
              </div>
              {/* Chat messages */}
              <div className="px-5 py-6 space-y-4 min-h-[240px]">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-md text-white text-sm leading-relaxed" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    <span className="typing-cursor">{displayedCommand}</span>
                  </div>
                </div>
                {/* Agent message */}
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  </div>
                  <div className="max-w-[85%]">
                    <p className="text-[11px] text-[#6b6b80] mb-1.5 font-medium">Pulsed Agent</p>
                    <div className="px-4 py-3 rounded-2xl rounded-bl-md" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {useCases[activeUseCase].agentHtml}
                    </div>
                  </div>
                </div>
              </div>
              {/* Chat input */}
              <div className="px-5 pb-4">
                <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-sm text-[#6b6b80] flex-1">Type a message...</p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BYOLLM */}
      <section className="py-24 md:py-32" style={{ background: 'rgba(17, 17, 24, 0.6)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-indigo-400/60 font-medium mb-4">Your model. Your data. Your rules.</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Bring your own LLM</h2>
              <p className="mt-5 text-lg text-[#8b8b9e] leading-relaxed">
                Connect your API key from Anthropic, OpenAI, Google, or any provider. Your data never touches our servers. Swap models anytime. Zero vendor lock-in.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  'Your API key, your costs — we never mark up model usage',
                  'Switch between Claude, GPT, Gemini, Llama, Kimi anytime',
                  'Data stays in your environment — nothing stored on our side',
                  'Works with any OpenAI-compatible endpoint',
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="text-[#8b8b9e]">{point}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card rounded-2xl p-8 transition-all duration-300">
              <p className="text-sm text-[#6b6b80] uppercase tracking-wider mb-6">Supported providers</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Anthropic', sub: 'Claude Opus, Sonnet, Haiku', color: '#D97757' },
                  { name: 'OpenAI', sub: 'GPT-4.1, o4-mini, Codex', color: '#10A37F' },
                  { name: 'Google', sub: 'Gemini 2.5 Flash, Pro', color: '#4285F4' },
                  { name: 'Moonshot', sub: 'Kimi K2', color: '#8b8b9e' },
                  { name: 'Meta', sub: 'Llama 4 via OpenRouter', color: '#0668E1' },
                  { name: 'Any provider', sub: 'OpenAI-compatible API', color: '#6366f1' },
                ].map((p) => (
                  <div
                    key={p.name}
                    className="rounded-lg px-4 py-3 transition-all duration-200 hover:bg-white/[0.04]"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${p.color}` }}
                  >
                    <p className="font-semibold text-white text-sm">{p.name}</p>
                    <p className="text-xs text-[#6b6b80] mt-0.5">{p.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — Glass Cards */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Stop paying for software that does one thing</h2>
            <p className="mt-5 text-lg text-[#8b8b9e] max-w-2xl mx-auto">Every tool in your stack does a fraction of what one AI agent can do.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Your CRM',
                desc: 'Tracks contacts, manages pipeline, sends follow-ups, logs every interaction automatically.',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                ),
              },
              {
                title: 'Your research tools',
                desc: 'Scans the internet, synthesizes findings, delivers executive briefs in seconds.',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                ),
              },
              {
                title: 'Your data enrichment',
                desc: 'Takes a list of names or companies and fills in everything — emails, tech stack, funding, news.',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" /></svg>
                ),
              },
              {
                title: 'Your workflow automation',
                desc: 'Builds multi-step workflows on the fly. No drag-and-drop builders. Just describe what you want.',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ),
              },
              {
                title: 'Your analytics dashboards',
                desc: 'Analyzes your data, spots trends, generates reports. Ask questions in plain English.',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                ),
              },
              {
                title: 'Your project management',
                desc: 'Tracks tasks, sets deadlines, sends reminders, writes status updates. Manages itself.',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>
                ),
              },
            ].map((item) => (
              <div key={item.title} className="glass-card rounded-2xl p-8 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <span className="text-indigo-400">{item.icon}</span>
                </div>
                <p className="text-xs text-[#6b6b80] uppercase tracking-wider mb-2">Replaces</p>
                <h3 className="text-lg font-bold text-white mb-3">{item.title}</h3>
                <p className="text-[#8b8b9e] leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 md:py-32" style={{ background: 'rgba(17, 17, 24, 0.6)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-400/60 font-medium mb-4">How it works</p>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Three minutes from signup to your first agent</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create your account', desc: 'Sign up with Google or email. Takes 10 seconds.' },
              { step: '02', title: 'Add your API key', desc: 'Paste your key from Anthropic, OpenAI, or any supported provider. Your key, your model, your costs.' },
              { step: '03', title: 'Tell it what to build', desc: 'Describe what you need in plain English. Your agent handles the rest — research, code, files, automation.' },
            ].map((s) => (
              <div key={s.step} className="relative group">
                <span className="text-8xl font-bold leading-none transition-colors duration-300" style={{ color: 'rgba(99, 102, 241, 0.08)' }}>{s.step}</span>
                <h3 className="text-xl font-bold text-white mt-4 mb-2">{s.title}</h3>
                <p className="text-[#8b8b9e] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-400/60 font-medium mb-4">What people are saying</p>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Built for operators who ship fast</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: 'I replaced three SaaS tools in my first week. The research briefs alone are worth the subscription.',
                name: 'Sarah K.',
                role: 'Founder, B2B SaaS',
              },
              {
                quote: 'The BYOLLM approach is genius. I use Claude for strategy and GPT for code generation. Best of both worlds.',
                name: 'James P.',
                role: 'CTO, AI Startup',
              },
              {
                quote: 'My agent monitors competitors on autopilot and sends me Telegram alerts. It feels like having a full-time analyst.',
                name: 'Priya S.',
                role: 'Head of Growth',
              },
            ].map((t) => (
              <div key={t.name} className="glass-card rounded-2xl p-8 transition-all duration-300 flex flex-col">
                <p className="text-[#c4c4d4] leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-[#6b6b80] text-sm">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Connects to Everything */}
      <section className="py-24 md:py-32" style={{ background: 'rgba(17, 17, 24, 0.6)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-400/60 font-medium mb-4">Connects to your world</p>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Your agent works with the tools you already use</h2>
          </div>

          <div className="overflow-hidden mb-6">
            <div className="flex marquee-row" style={{ animation: 'scroll-left 30s linear infinite', width: 'max-content' }}>
              {[
                { name: 'Telegram', color: '#229ED9' },
                { name: 'Discord', color: '#5865F2' },
                { name: 'Slack', color: '#4A154B' },
                { name: 'WhatsApp', color: '#25D366' },
                { name: 'Google Sheets', color: '#0F9D58' },
                { name: 'Notion', color: '#ffffff' },
                { name: 'Salesforce', color: '#00A1E0' },
                { name: 'HubSpot', color: '#FF7A59' },
                { name: 'Telegram', color: '#229ED9' },
                { name: 'Discord', color: '#5865F2' },
                { name: 'Slack', color: '#4A154B' },
                { name: 'WhatsApp', color: '#25D366' },
                { name: 'Google Sheets', color: '#0F9D58' },
                { name: 'Notion', color: '#ffffff' },
                { name: 'Salesforce', color: '#00A1E0' },
                { name: 'HubSpot', color: '#FF7A59' },
              ].map((t, i) => (
                <span key={i} className="flex items-center gap-2 px-4 py-2 mx-1.5 rounded-full text-sm font-medium text-[#8b8b9e] whitespace-nowrap" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: t.color }}></span>
                  {t.name}
                </span>
              ))}
            </div>
            <div className="flex mt-3 marquee-row" style={{ animation: 'scroll-right 25s linear infinite', width: 'max-content' }}>
              {[
                { name: 'Gmail', color: '#EA4335' },
                { name: 'Google Calendar', color: '#4285F4' },
                { name: 'Jira', color: '#0052CC' },
                { name: 'Linear', color: '#5E6AD2' },
                { name: 'GitHub', color: '#8b949e' },
                { name: 'Stripe', color: '#635BFF' },
                { name: 'Zapier', color: '#FF4F00' },
                { name: 'Make', color: '#6D00CC' },
                { name: 'Gmail', color: '#EA4335' },
                { name: 'Google Calendar', color: '#4285F4' },
                { name: 'Jira', color: '#0052CC' },
                { name: 'Linear', color: '#5E6AD2' },
                { name: 'GitHub', color: '#8b949e' },
                { name: 'Stripe', color: '#635BFF' },
                { name: 'Zapier', color: '#FF4F00' },
                { name: 'Make', color: '#6D00CC' },
              ].map((t, i) => (
                <span key={i} className="flex items-center gap-2 px-4 py-2 mx-1.5 rounded-full text-sm font-medium text-[#8b8b9e] whitespace-nowrap" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: t.color }}></span>
                  {t.name}
                </span>
              ))}
            </div>
          </div>
          <p className="text-center text-sm text-[#6b6b80]">And thousands more via API</p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-400/60 font-medium mb-4">Pricing</p>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">The last subscription you will ever pay for</h2>
            <p className="mt-5 text-lg text-[#8b8b9e] max-w-2xl mx-auto">One agent replaces your entire tool stack. You pay for the platform. You control the AI costs.</p>
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
                className="rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: tier.highlight ? 'rgba(99, 102, 241, 0.06)' : 'rgba(17, 17, 24, 0.8)',
                  border: tier.highlight ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: tier.highlight ? '0 0 40px rgba(99, 102, 241, 0.1), 0 0 80px rgba(139, 92, 246, 0.05)' : 'none',
                  transform: tier.highlight ? 'scale(1.05)' : undefined,
                  position: tier.highlight ? 'relative' as const : undefined,
                }}
              >
                {tier.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="glow-btn text-xs font-bold text-white px-4 py-1.5 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{tier.price}</span>
                  <span className="text-[#6b6b80]">/mo</span>
                </div>
                <p className="mt-2 text-sm text-[#8b8b9e]">{tier.desc}</p>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[#8b8b9e]">
                      <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={tier.cta}
                  className={`mt-8 block w-full text-center py-3 px-6 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    tier.highlight ? 'glow-btn text-white' : 'text-[#8b8b9e] hover:text-white hover:border-white/20'
                  }`}
                  style={!tier.highlight ? { border: '1px solid rgba(255,255,255,0.1)' } : undefined}
                >
                  {tier.ctaText}
                </a>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-sm text-[#6b6b80]">All plans include a free tier with 3 research briefs per month. No credit card required to start.</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Stop subscribing to tools.<br />
            <span style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Start building with intelligence.
            </span>
          </h2>
          <p className="mt-6 text-lg text-[#8b8b9e]">One agent. Any task. Your model. Your data.</p>
          <div className="mt-10">
            <a href="/signup" className="glow-btn inline-block font-semibold rounded-lg px-10 py-4 text-base text-white">
              Get started free
            </a>
          </div>
          <p className="mt-6 text-sm text-[#6b6b80]">No credit card required. Set up in under 3 minutes.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-lg font-bold text-white">Pulsed</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              </div>
              <p className="text-sm text-[#6b6b80]">The last software you will ever need.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-[#6b6b80]">
                <li><a href="/signup" className="hover:text-white transition-colors">Research</a></li>
                <li><a href="/agent" className="hover:text-white transition-colors">Agent</a></li>
                <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-[#6b6b80]">
                <li><a href="/agent" className="hover:text-white transition-colors">Web Chat</a></li>
                <li><span>Telegram</span></li>
                <li><span>Discord</span></li>
                <li><span className="text-[#4a4a5a]">Slack (coming soon)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-[#6b6b80]">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 text-sm text-[#4a4a5a] text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            &copy; 2026 Pulsed. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
