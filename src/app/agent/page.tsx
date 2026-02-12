'use client';

import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getSession, getAccessToken } from '@/lib/auth';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

/* ── Relative timestamp helper ── */
function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleDateString();
}

/* ── Tool‑use pattern detector ── */
const TOOL_PATTERNS = [
  { pattern: /Searching\.\.\./i, label: 'Searching…', icon: '🔍' },
  { pattern: /Analyzing\.\.\./i, label: 'Analyzing…', icon: '📊' },
  { pattern: /Generating\.\.\./i, label: 'Generating…', icon: '✨' },
  { pattern: /Fetching\.\.\./i, label: 'Fetching…', icon: '📡' },
  { pattern: /Processing\.\.\./i, label: 'Processing…', icon: '⚙️' },
  { pattern: /Thinking\.\.\./i, label: 'Thinking…', icon: '🧠' },
  { pattern: /Reading\.\.\./i, label: 'Reading…', icon: '📖' },
  { pattern: /Writing\.\.\./i, label: 'Writing…', icon: '✍️' },
];

function detectToolUse(content: string): { label: string; icon: string } | null {
  for (const t of TOOL_PATTERNS) {
    if (t.pattern.test(content)) return { label: t.label, icon: t.icon };
  }
  return null;
}

/* ── Suggestion chips ── */
const SUGGESTIONS = [
  { emoji: '🔎', text: 'Research my competitors' },
  { emoji: '🏗️', text: 'Build me a CRM' },
  { emoji: '📈', text: 'Analyze market trends' },
  { emoji: '📝', text: 'Draft a sales strategy' },
];

export default function AgentPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ── Onboarding state ── */
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingTransition, setOnboardingTransition] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingRole, setOnboardingRole] = useState('');
  const [onboardingIndustry, setOnboardingIndustry] = useState('');
  const [onboardingFocus, setOnboardingFocus] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [onboardingExiting, setOnboardingExiting] = useState(false);

  /* ── Auth + load history ── */
  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) {
        router.push('/login');
      } else {
        setAuthChecked(true);
        const token = await getAccessToken();
        setAccessToken(token);
        try {
          const profileRes = await fetch('/api/profile', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const profileData = await profileRes.json();
          setUserPlan(profileData?.plan || 'free');
        } catch {
          setUserPlan('free');
        }
        try {
          const res = await fetch('/api/keys', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const data = await res.json();
          setHasApiKey(Array.isArray(data) && data.length > 0);
        } catch {
          setHasApiKey(false);
        }
        try {
          const histRes = await fetch('/api/agent/history?sessionKey=default&limit=100', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (histRes.ok) {
            const histData = await histRes.json();
            if (histData.messages && histData.messages.length > 0) {
              setMessages(histData.messages.map((m: any) => ({
                id: m.id,
                role: m.role === 'user' ? 'user' : 'agent',
                content: m.content,
                timestamp: new Date(m.created_at),
              })));
            }
          }
        } catch {}
        setHistoryLoaded(true);
      }
    });
  }, [router]);

  /* ── Auto‑scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Scroll detection for "scroll to bottom" button ── */
  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }, []);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ── Relative timestamp ticker ── */
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  /* ── Submit handler ── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    if (accessToken) {
      fetch('/api/agent/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ role: 'user', content: text, sessionKey: 'default' }),
      }).catch(() => {});
    }

    const agentMsgId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: agentMsgId, role: 'agent', content: '', timestamp: new Date() },
    ]);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ message: text, sessionKey: 'default' }),
      });

      if (!res.ok || !res.body) throw new Error('Failed to connect');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentMsgId
                      ? { ...m, content: m.content + parsed.text }
                      : m
                  )
                );
              }
            } catch {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId
                    ? { ...m, content: m.content + data }
                    : m
                )
              );
            }
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsgId
            ? { ...m, content: 'Something went wrong. Please try again.' }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      if (accessToken) {
        setMessages((prev) => {
          const agentMsg = prev.find((m) => m.id === agentMsgId);
          if (agentMsg && agentMsg.content && agentMsg.content !== 'Something went wrong. Please try again.') {
            fetch('/api/agent/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({ role: 'agent', content: agentMsg.content, sessionKey: 'default' }),
            }).catch(() => {});
          }
          return prev;
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  /* ── Onboarding helpers ── */
  const showOnboarding =
    (userPlan === 'agent' || userPlan === 'ultra') &&
    historyLoaded &&
    messages.length === 0 &&
    !onboardingComplete &&
    !isStreaming;

  const advanceStep = () => {
    setOnboardingTransition(true);
    setTimeout(() => {
      setOnboardingStep((s) => s + 1);
      setOnboardingTransition(false);
    }, 300);
  };

  const finishOnboarding = async () => {
    setOnboardingTransition(true);

    // Save profile (best-effort — might 400 if fields don't exist yet)
    if (accessToken) {
      try {
        await fetch('/api/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: onboardingName,
            role: onboardingRole,
            industry: onboardingIndustry,
            current_focus: onboardingFocus,
          }),
        });
      } catch {
        // swallow — profile API may not support these fields yet
      }
    }

    // Build the first message
    const firstMessage = `My name is ${onboardingName}. I'm a ${onboardingRole} in ${onboardingIndustry}. I'm currently working on: ${onboardingFocus}. Say hello and tell me how you can help.`;

    // Exit animation
    setOnboardingExiting(true);
    setTimeout(() => {
      setOnboardingComplete(true);
      setOnboardingExiting(false);
      setOnboardingTransition(false);

      // Auto-send the first message by injecting into input and submitting
      setInput(firstMessage);
      // Use a micro-delay so state settles before we submit
      setTimeout(() => {
        // Directly trigger the send logic (can't use handleSubmit since input state won't be settled)
        const text = firstMessage;
        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: text,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsStreaming(true);

        if (accessToken) {
          fetch('/api/agent/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ role: 'user', content: text, sessionKey: 'default' }),
          }).catch(() => {});
        }

        const agentMsgId = crypto.randomUUID();
        setMessages((prev) => [
          ...prev,
          { id: agentMsgId, role: 'agent', content: '', timestamp: new Date() },
        ]);

        (async () => {
          try {
            const res = await fetch('/api/agent/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              },
              body: JSON.stringify({ message: text, sessionKey: 'default' }),
            });

            if (!res.ok || !res.body) throw new Error('Failed to connect');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') break;
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.text) {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === agentMsgId
                            ? { ...m, content: m.content + parsed.text }
                            : m
                        )
                      );
                    }
                  } catch {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === agentMsgId
                          ? { ...m, content: m.content + data }
                          : m
                      )
                    );
                  }
                }
              }
            }
          } catch {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentMsgId
                  ? { ...m, content: 'Something went wrong. Please try again.' }
                  : m
              )
            );
          } finally {
            setIsStreaming(false);
            if (accessToken) {
              setMessages((prev) => {
                const agentMsg = prev.find((m) => m.id === agentMsgId);
                if (agentMsg && agentMsg.content && agentMsg.content !== 'Something went wrong. Please try again.') {
                  fetch('/api/agent/history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                    body: JSON.stringify({ role: 'agent', content: agentMsg.content, sessionKey: 'default' }),
                  }).catch(() => {});
                }
                return prev;
              });
            }
          }
        })();
      }, 50);
    }, 400);
  };

  /* ── Loading spinner ── */
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Keyframes injected via style tag — no deps needed */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
          50% { box-shadow: 0 0 24px 8px rgba(99,102,241,0.15); }
        }
        @keyframes progress-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #6366f1 25%, #a78bfa 50%, #6366f1 75%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 2s ease-in-out infinite;
        }
        @keyframes onboard-in {
          0% { opacity: 0; transform: translateY(16px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes onboard-out {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-12px) scale(0.97); }
        }
        .onboard-step-enter {
          animation: onboard-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .onboard-step-exit {
          animation: onboard-out 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .onboard-card-exit {
          animation: onboard-out 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-bold text-gray-900">Pulsed</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/search" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Research</Link>
            <span className="text-sm font-semibold text-indigo-600">Agent</span>
            <Link href="/history" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">History</Link>
          </div>
        </div>
      </nav>

      {/* Plan Gate */}
      {userPlan !== 'agent' && userPlan !== 'ultra' && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-6 mx-auto shadow-lg">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10a7 7 0 0 1-14 0" />
                <path d="M12 17v5" />
                <path d="M8 22h8" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Unlock Your AI Agent</h2>
            <p className="text-gray-500 mb-6">
              Get a personal AI research agent powered by your own API key. Ask anything — market research, competitive analysis, trend reports, and more.
            </p>
            <Link
              href="/pricing"
              className="inline-block bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 px-8 rounded-xl hover:opacity-90 transition-opacity"
            >
              Upgrade to Agent — $49/mo
            </Link>
            <p className="mt-3 text-xs text-gray-400">BYOLLM — bring your own API key. You control the model and costs.</p>
          </div>
        </div>
      )}

      {/* API Key Banner */}
      {(userPlan === 'agent' || userPlan === 'ultra') && !hasApiKey && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </div>
              <p className="text-sm text-indigo-800">
                Add your API key to activate your AI agent.
              </p>
            </div>
            <Link
              href="/settings/keys"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors whitespace-nowrap"
            >
              Add Key →
            </Link>
          </div>
        </div>
      )}

      {/* ════════════════════════ Onboarding Wizard ════════════════════════ */}
      {(userPlan === 'agent' || userPlan === 'ultra') && showOnboarding && (
        <div className={`flex-1 flex items-center justify-center px-4 ${onboardingExiting ? 'onboard-card-exit' : ''}`}>
          <div className="w-full max-w-md">
            <div
              className={`bg-white rounded-2xl shadow-xl border border-gray-100 p-8 ${
                onboardingTransition ? 'onboard-step-exit' : 'onboard-step-enter'
              }`}
            >
              {/* Step 1: Name */}
              {onboardingStep === 0 && (
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Pulsed 👋</h1>
                  <p className="text-gray-500 mb-8">Let&apos;s set up your agent. This takes 30 seconds.</p>
                  <label className="block text-sm font-medium text-gray-700 mb-2">What should I call you?</label>
                  <input
                    type="text"
                    value={onboardingName}
                    onChange={(e) => setOnboardingName(e.target.value)}
                    placeholder="Your first name"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && onboardingName.trim()) advanceStep();
                    }}
                  />
                  <button
                    type="button"
                    disabled={!onboardingName.trim()}
                    onClick={advanceStep}
                    className="mt-6 w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Step 2: Role + Industry */}
              {onboardingStep === 1 && (
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Nice to meet you, {onboardingName} 🤝</h1>
                  <p className="text-gray-500 mb-8">Help your agent understand what you do.</p>
                  <label className="block text-sm font-medium text-gray-700 mb-2">What&apos;s your role?</label>
                  <input
                    type="text"
                    value={onboardingRole}
                    onChange={(e) => setOnboardingRole(e.target.value)}
                    placeholder="e.g. Sales Director, Founder, Product Manager"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all mb-4"
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-2">What industry?</label>
                  <input
                    type="text"
                    value={onboardingIndustry}
                    onChange={(e) => setOnboardingIndustry(e.target.value)}
                    placeholder="e.g. SaaS, Healthcare, Government"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && onboardingRole.trim() && onboardingIndustry.trim()) advanceStep();
                    }}
                  />
                  <button
                    type="button"
                    disabled={!onboardingRole.trim() || !onboardingIndustry.trim()}
                    onClick={advanceStep}
                    className="mt-6 w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Step 3: Current focus */}
              {onboardingStep === 2 && (
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">One more thing ✨</h1>
                  <p className="text-gray-500 mb-8">What are you working on right now? Your agent will remember this.</p>
                  <textarea
                    value={onboardingFocus}
                    onChange={(e) => setOnboardingFocus(e.target.value)}
                    placeholder="e.g. Building outbound sequences for Q1, researching competitors in the AI space..."
                    autoFocus
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                  />
                  <button
                    type="button"
                    disabled={!onboardingFocus.trim()}
                    onClick={finishOnboarding}
                    className="mt-6 w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
                  >
                    Start chatting
                  </button>
                </div>
              )}
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {[0, 1, 2].map((dot) => (
                <div
                  key={dot}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    dot === onboardingStep
                      ? 'w-6 bg-indigo-500'
                      : dot < onboardingStep
                      ? 'w-2 bg-indigo-400'
                      : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════ Chat Area ════════════════════════ */}
      {(userPlan === 'agent' || userPlan === 'ultra') && !showOnboarding && (
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto relative">
          {/* Streaming progress bar at top */}
          {isStreaming && (
            <div className="sticky top-0 z-40 h-0.5 w-full bg-gray-100 overflow-hidden">
              <div
                className="h-full w-1/2 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 rounded-full"
                style={{ animation: 'progress-slide 1.5s ease-in-out infinite' }}
              />
            </div>
          )}

          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {/* ── Empty state ── */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center pt-20 text-center">
                {/* Large pulsing icon */}
                <div
                  className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-8 shadow-xl"
                  style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}
                >
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10a7 7 0 0 1-14 0" />
                    <path d="M12 17v5" />
                    <path d="M8 22h8" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Ultron Agent</h2>
                <p className="text-gray-500 max-w-md mb-10">
                  Your personal AI agent powered by OpenClaw. Ask anything — research, analysis, tasks, and more.
                </p>

                {/* Suggestion chips */}
                <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.text}
                      type="button"
                      onClick={() => {
                        setInput(s.text);
                        inputRef.current?.focus();
                      }}
                      className="flex items-center gap-2.5 text-left px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-sm text-gray-700 hover:text-indigo-700 shadow-sm hover:shadow"
                    >
                      <span className="text-base shrink-0">{s.emoji}</span>
                      <span>{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Messages ── */}
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isAgent = msg.role === 'agent';
              const toolUse = isAgent && isStreaming && msg.content ? detectToolUse(msg.content) : null;

              return (
                <div key={msg.id}>
                  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2.5`}>
                    {/* Agent avatar */}
                    {isAgent && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                      </div>
                    )}

                    <div className="flex flex-col">
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          isUser
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
                            : 'bg-gray-50 text-gray-900'
                        }`}
                      >
                        {isAgent && msg.content ? (
                          <>
                            {/* Tool use indicator */}
                            {toolUse && (
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-full px-2.5 py-1"
                                >
                                  <svg
                                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    style={{ animation: 'spin-slow 1s linear infinite' }}
                                  >
                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                  </svg>
                                  <span>{toolUse.icon} {toolUse.label}</span>
                                </span>
                              </div>
                            )}
                            <div className="prose prose-sm max-w-none
                              [&_pre]:bg-[#1e1e2e] [&_pre]:text-gray-100 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre]:font-mono [&_pre]:text-sm
                              [&_code]:bg-violet-100 [&_code]:text-violet-800 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:font-mono
                              [&_pre_code]:bg-transparent [&_pre_code]:text-gray-100 [&_pre_code]:p-0 [&_pre_code]:rounded-none
                              [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2
                              [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2
                              [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1
                              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2
                              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2
                              [&_li]:my-0.5
                              [&_a]:text-indigo-600 [&_a]:underline [&_a]:hover:text-indigo-800
                              [&_table]:border-collapse [&_table]:w-full [&_table]:my-3
                              [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold
                              [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-sm
                              [&_tr:nth-child(even)]:bg-gray-50
                              [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0
                              [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-2
                              [&_hr]:my-4 [&_hr]:border-gray-200
                            ">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                          </>
                        ) : msg.content ? (
                          <span>{msg.content}</span>
                        ) : (
                          /* Streaming placeholder with "Thinking..." shimmer */
                          <div className="flex flex-col items-start gap-2">
                            <span className="text-xs font-medium shimmer-text">Thinking...</span>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce [animation-delay:0ms]" />
                              <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce [animation-delay:150ms]" />
                              <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce [animation-delay:300ms]" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className={`text-[10px] text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left ml-1'}`}>
                        {relativeTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Scroll to bottom FAB ── */}
          {showScrollBtn && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 transition-all hover:shadow-xl"
            >
              <span>↓</span>
              <span>New messages</span>
            </button>
          )}
        </div>
      )}

      {/* ════════════════════════ Input Bar ════════════════════════ */}
      {(userPlan === 'agent' || userPlan === 'ultra') && !showOnboarding && (
        <div className="sticky bottom-0 bg-gray-50/80 backdrop-blur-sm border-t border-gray-100 px-4 py-4">
          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto"
          >
            <div className="flex items-end gap-3 bg-white rounded-2xl shadow-lg border border-gray-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all px-4 py-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Ultron..."
                rows={1}
                className="flex-1 resize-none bg-transparent py-2 text-gray-900 placeholder-gray-400 text-sm outline-none"
                style={{ maxHeight: '120px' }}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="h-10 w-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 hover:scale-110 active:scale-95"
              >
                {isStreaming ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4z" />
                    <path d="M22 2 11 13" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 text-center mt-2">
              Shift + Enter for new line
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
