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

/* ── Greeting helper ── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
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

/* ── Welcome suggestion cards ── */
const WELCOME_CARDS = [
  { emoji: '🔍', title: 'Deep Research', desc: 'Analyze any topic with real-time data', prompt: 'Help me do deep research on ' },
  { emoji: '🏗️', title: 'Build Something', desc: 'Create tools, trackers, and workflows', prompt: 'Help me build a ' },
  { emoji: '📊', title: 'Analyze Data', desc: 'Get insights from any dataset', prompt: 'Analyze this data for me: ' },
  { emoji: '✍️', title: 'Write Content', desc: 'Draft emails, posts, and documents', prompt: 'Help me write a ' },
];

/* ── Placeholder sidebar conversations ── */
const SIDEBAR_CONVERSATIONS = [
  { id: 'default', title: 'Current conversation', time: 'Now', group: 'Today' },
  { id: 'conv-2', title: 'Competitor analysis for Q1 launch', time: '2h ago', group: 'Today' },
  { id: 'conv-3', title: 'Draft investor update email', time: '5h ago', group: 'Today' },
  { id: 'conv-4', title: 'Market sizing for Southeast Asia', time: 'Yesterday', group: 'Yesterday' },
  { id: 'conv-5', title: 'Product roadmap brainstorm', time: 'Yesterday', group: 'Yesterday' },
  { id: 'conv-6', title: 'Sales pipeline review', time: 'Mon', group: 'This Week' },
  { id: 'conv-7', title: 'Content calendar planning', time: 'Mon', group: 'This Week' },
];

/* ── Copy to clipboard helper ── */
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

/* ── Code block with copy button ── */
function CodeBlockWithCopy({ children, className, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const codeText = typeof children === 'string' ? children : String(children).replace(/\n$/, '');

  const handleCopy = () => {
    copyToClipboard(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if it's an inline code block (no className with language-)
  if (!className) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white text-[11px] font-medium transition-all opacity-0 group-hover:opacity-100"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
      <code className={className} {...props}>
        {children}
      </code>
    </div>
  );
}


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
  const [userName, setUserName] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ── Sidebar state ── */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── Input toolbar state ── */
  const [searchToggled, setSearchToggled] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Auto');

  /* ── Message action state ── */
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

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
  const [onboardingProvider, setOnboardingProvider] = useState('anthropic');
  const [onboardingApiKey, setOnboardingApiKey] = useState('');
  const [expandedProvider, setExpandedProvider] = useState<number | null>(0);
  const [onboardingTelegram, setOnboardingTelegram] = useState('');
  const [onboardingDiscord, setOnboardingDiscord] = useState('');

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
          if (profileData?.name) setUserName(profileData.name);
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

  /* ── Close model dropdown on outside click ── */
  useEffect(() => {
    if (!modelDropdownOpen) return;
    const handler = () => setModelDropdownOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [modelDropdownOpen]);

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
            ...(onboardingTelegram.trim() ? { telegram_username: onboardingTelegram.trim() } : {}),
            ...(onboardingDiscord.trim() ? { discord_username: onboardingDiscord.trim() } : {}),
          }),
        });
      } catch {}
    }

    const firstMessage = `My name is ${onboardingName}. I'm a ${onboardingRole} in ${onboardingIndustry}. I'm currently working on: ${onboardingFocus}. Say hello and tell me how you can help.`;

    setOnboardingExiting(true);
    setTimeout(() => {
      setOnboardingComplete(true);
      setOnboardingExiting(false);
      setOnboardingTransition(false);
      setUserName(onboardingName);

      setInput(firstMessage);
      setTimeout(() => {
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

  /* ── Clear chat ── */
  const handleClearChat = () => {
    setMessages([]);
  };

  /* ── Loading spinner ── */
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Group sidebar conversations ── */
  const sidebarGroups: { label: string; items: typeof SIDEBAR_CONVERSATIONS }[] = [];
  const groupOrder = ['Today', 'Yesterday', 'This Week'];
  for (const g of groupOrder) {
    const items = SIDEBAR_CONVERSATIONS.filter((c) => c.group === g);
    if (items.length > 0) sidebarGroups.push({ label: g, items });
  }

  const isAgentPlan = userPlan === 'agent' || userPlan === 'ultra';
  const showChat = isAgentPlan && !showOnboarding;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Keyframes */}
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
        .shimmer-bg {
          background: linear-gradient(90deg, transparent 25%, rgba(99,102,241,0.08) 50%, transparent 75%);
          background-size: 200% 100%;
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
        @keyframes msg-fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .msg-enter {
          animation: msg-fade-in 0.2s ease-out forwards;
        }
        @keyframes dot-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle (hamburger) */}
            {isAgentPlan && !showOnboarding && (
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                title="Toggle sidebar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </button>
            )}
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-gray-900">Pulsed</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/search" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Research</Link>
            <span className="text-sm font-semibold text-indigo-600">Agent</span>
            <Link href="/history" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">History</Link>
          </div>
        </div>
      </nav>

      {/* Plan Gate */}
      {!isAgentPlan && (
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
      {isAgentPlan && !hasApiKey && (
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
      {isAgentPlan && showOnboarding && (
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
                    onClick={advanceStep}
                    className="mt-6 w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Step 4: API Key Walkthrough */}
              {onboardingStep === 3 && (
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Connect your AI 🔑</h1>
                  <p className="text-gray-500 mb-6">Your agent needs an API key to think. Here&apos;s how to get one in 60 seconds.</p>

                  <div className="space-y-3 mb-6">
                    {/* Anthropic */}
                    <div
                      className="rounded-xl border border-gray-200 overflow-hidden transition-all"
                      style={{ borderLeftWidth: '4px', borderLeftColor: '#D97757' }}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedProvider(expandedProvider === 0 ? null : 0)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm font-semibold text-gray-900">Anthropic (Claude)</span>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`text-gray-400 transition-transform duration-200 ${expandedProvider === 0 ? 'rotate-180' : ''}`}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      <div
                        className="transition-all duration-300 ease-in-out overflow-hidden"
                        style={{ maxHeight: expandedProvider === 0 ? '200px' : '0px', opacity: expandedProvider === 0 ? 1 : 0 }}
                      >
                        <div className="px-4 pb-3">
                          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                            <li>Go to console.anthropic.com</li>
                            <li>Sign up or log in</li>
                            <li>Click &apos;API Keys&apos; in the sidebar</li>
                            <li>Click &apos;Create Key&apos; and copy it</li>
                          </ol>
                          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-2">
                            Open Anthropic Console <span>→</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* OpenAI */}
                    <div
                      className="rounded-xl border border-gray-200 overflow-hidden transition-all"
                      style={{ borderLeftWidth: '4px', borderLeftColor: '#10A37F' }}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedProvider(expandedProvider === 1 ? null : 1)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm font-semibold text-gray-900">OpenAI (GPT)</span>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`text-gray-400 transition-transform duration-200 ${expandedProvider === 1 ? 'rotate-180' : ''}`}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      <div
                        className="transition-all duration-300 ease-in-out overflow-hidden"
                        style={{ maxHeight: expandedProvider === 1 ? '200px' : '0px', opacity: expandedProvider === 1 ? 1 : 0 }}
                      >
                        <div className="px-4 pb-3">
                          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                            <li>Go to platform.openai.com</li>
                            <li>Sign up or log in</li>
                            <li>Go to API Keys in settings</li>
                            <li>Click &apos;Create new secret key&apos; and copy it</li>
                          </ol>
                          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-2">
                            Open OpenAI Dashboard <span>→</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Google */}
                    <div
                      className="rounded-xl border border-gray-200 overflow-hidden transition-all"
                      style={{ borderLeftWidth: '4px', borderLeftColor: '#4285F4' }}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedProvider(expandedProvider === 2 ? null : 2)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm font-semibold text-gray-900">Google (Gemini)</span>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`text-gray-400 transition-transform duration-200 ${expandedProvider === 2 ? 'rotate-180' : ''}`}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      <div
                        className="transition-all duration-300 ease-in-out overflow-hidden"
                        style={{ maxHeight: expandedProvider === 2 ? '200px' : '0px', opacity: expandedProvider === 2 ? 1 : 0 }}
                      >
                        <div className="px-4 pb-3">
                          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                            <li>Go to aistudio.google.com</li>
                            <li>Sign in with Google</li>
                            <li>Click &apos;Get API Key&apos;</li>
                            <li>Create key and copy it</li>
                          </ol>
                          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-2">
                            Open Google AI Studio <span>→</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">Paste your API key</label>
                  <div className="flex gap-2 mb-3">
                    {[
                      { value: 'anthropic', label: 'Anthropic' },
                      { value: 'openai', label: 'OpenAI' },
                      { value: 'google', label: 'Google' },
                    ].map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setOnboardingProvider(p.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          onboardingProvider === p.value
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="password"
                    value={onboardingApiKey}
                    onChange={(e) => setOnboardingApiKey(e.target.value)}
                    placeholder="sk-..."
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
                  />

                  <button
                    type="button"
                    disabled={!onboardingApiKey.trim()}
                    onClick={async () => {
                      if (accessToken && onboardingApiKey.trim()) {
                        try {
                          await fetch('/api/keys', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${accessToken}`,
                            },
                            body: JSON.stringify({
                              provider: onboardingProvider,
                              key: onboardingApiKey.trim(),
                              name: 'Default',
                            }),
                          });
                          setHasApiKey(true);
                        } catch {}
                      }
                      advanceStep();
                    }}
                    className="mt-5 w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
                  >
                    Save key &amp; continue
                  </button>
                  <button
                    type="button"
                    onClick={() => advanceStep()}
                    className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
                  >
                    Skip for now
                  </button>
                </div>
              )}

              {/* Step 5: Connect your channels */}
              {onboardingStep === 4 && (
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Stay connected 📱</h1>
                  <p className="text-gray-500 mb-6">Chat with your agent from anywhere. Set up takes 2 minutes.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {/* Telegram Card */}
                    <div
                      className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3"
                      style={{ borderLeftWidth: '4px', borderLeftColor: '#229ED9' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="#229ED9">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                          </svg>
                          <span className="text-sm font-semibold text-gray-900">Telegram</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">Coming Soon</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">Message your agent from Telegram. Get alerts, research updates, and task completions on mobile.</p>
                      <p className="text-[10px] text-gray-400">We&apos;ll notify you when Telegram integration is ready.</p>
                      <input
                        type="text"
                        value={onboardingTelegram}
                        onChange={(e) => setOnboardingTelegram(e.target.value)}
                        placeholder="@username"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                      />
                    </div>

                    {/* Discord Card */}
                    <div
                      className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3"
                      style={{ borderLeftWidth: '4px', borderLeftColor: '#5865F2' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="#5865F2">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                          </svg>
                          <span className="text-sm font-semibold text-gray-900">Discord</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">Coming Soon</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">Add your agent to any Discord server. Works in DMs and channels.</p>
                      <p className="text-[10px] text-gray-400">We&apos;ll notify you when Discord integration is ready.</p>
                      <input
                        type="text"
                        value={onboardingDiscord}
                        onChange={(e) => setOnboardingDiscord(e.target.value)}
                        placeholder="username#1234"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => finishOnboarding()}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-indigo-200"
                  >
                    Finish setup
                  </button>
                  <button
                    type="button"
                    onClick={() => finishOnboarding()}
                    className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
                  >
                    Skip
                  </button>
                </div>
              )}
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {[0, 1, 2, 3, 4].map((dot) => (
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

      {/* ════════════════════════ Main Chat Layout ════════════════════════ */}
      {showChat && (
        <div className="flex-1 flex overflow-hidden relative">

          {/* ── Sidebar Overlay (mobile) ── */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/20 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* ── Sidebar ── */}
          <aside
            className={`
              fixed lg:relative z-50 lg:z-auto top-0 left-0 h-full
              w-[280px] bg-white border-r border-gray-100
              flex flex-col
              transition-transform duration-200 ease-in-out
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:hidden'}
            `}
            style={{ paddingTop: sidebarOpen ? '0' : undefined }}
          >
            {/* Sidebar header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Conversations</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* New chat button */}
            <div className="p-3">
              <button
                type="button"
                onClick={() => {
                  handleClearChat();
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New chat
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {sidebarGroups.map((group) => (
                <div key={group.label} className="mb-3">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider px-3 py-1.5">{group.label}</p>
                  {group.items.map((conv) => (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setSidebarOpen(false)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm truncate ${
                        conv.id === 'default'
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="truncate text-[13px]">{conv.title}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{conv.time}</div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </aside>

          {/* ── Chat Column ── */}
          <div className="flex-1 flex flex-col min-w-0">

            {/* Agent Identity Header */}
            {messages.length > 0 && (
              <div className="border-b border-gray-100 bg-white px-4 sm:px-6 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm ${isStreaming ? 'shimmer-bg' : ''}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Pulsed Agent</span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-[11px] text-gray-400">Online</span>
                    </span>
                    <span className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 ml-1">AI Agent</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                  title="Clear chat"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            )}

            {/* Chat messages area */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto relative">
              {/* Streaming progress bar */}
              {isStreaming && (
                <div className="sticky top-0 z-40 h-0.5 w-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full w-1/2 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 rounded-full"
                    style={{ animation: 'progress-slide 1.5s ease-in-out infinite' }}
                  />
                </div>
              )}

              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-1">
                {/* ── Welcome State (no messages) ── */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center pt-16 sm:pt-24 text-center px-2">
                    {/* Greeting */}
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                      {getGreeting()}, {userName || 'there'} ✨
                    </h1>
                    <p className="text-gray-500 text-base sm:text-lg mb-10">
                      What would you like to work on?
                    </p>

                    {/* 2x2 Suggestion card grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
                      {WELCOME_CARDS.map((card) => (
                        <button
                          key={card.title}
                          type="button"
                          onClick={() => {
                            setInput(card.prompt);
                            inputRef.current?.focus();
                          }}
                          className="flex flex-col items-start gap-1.5 text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 transition-all shadow-sm hover:shadow group"
                        >
                          <span className="text-2xl">{card.emoji}</span>
                          <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{card.title}</span>
                          <span className="text-xs text-gray-500 leading-relaxed">{card.desc}</span>
                        </button>
                      ))}
                    </div>

                    <p className="text-xs text-gray-400 mt-8">or just start typing...</p>
                  </div>
                )}

                {/* ── Messages ── */}
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const isAgent = msg.role === 'agent';
                  const toolUse = isAgent && isStreaming && msg.content ? detectToolUse(msg.content) : null;
                  const isLastAgent = isAgent && idx === messages.length - 1;
                  const isComplete = isAgent && msg.content && !isStreaming;
                  const isStreamingThis = isAgent && isStreaming && isLastAgent;

                  return (
                    <div key={msg.id} className="msg-enter">
                      {/* User Message */}
                      {isUser && (
                        <div className="flex justify-end mb-4">
                          <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
                            <div
                              className="rounded-2xl px-5 py-3 bg-indigo-600 text-white"
                              style={{ fontSize: '15px', lineHeight: '1.6' }}
                            >
                              <span>{msg.content}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1.5 mr-1">
                              {relativeTime(msg.timestamp)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Agent Message */}
                      {isAgent && (
                        <div className="flex gap-3 mb-4">
                          {/* Avatar */}
                          <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 mt-1 shadow-sm ${isStreamingThis ? 'shimmer-bg' : ''}`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                            </svg>
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Agent label */}
                            <span className={`text-[12px] text-gray-400 font-medium mb-1 block ${isStreamingThis ? 'shimmer-text' : ''}`}>
                              Pulsed Agent
                            </span>

                            {msg.content ? (
                              <div
                                className="bg-white rounded-2xl rounded-tl-md px-5 py-4 border-l-2 border-indigo-500 shadow-sm"
                                style={{ fontSize: '15px', lineHeight: '1.7' }}
                              >
                                {/* Tool use indicator */}
                                {toolUse && (
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full px-2.5 py-1">
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

                                <div className="prose prose-sm max-w-none text-gray-900
                                  [&_pre]:bg-[#1e1e2e] [&_pre]:text-gray-100 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:relative
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
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      code: CodeBlockWithCopy as any,
                                    }}
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ) : (
                              /* Streaming placeholder — "Thinking..." */
                              <div className="bg-white rounded-2xl rounded-tl-md px-5 py-4 border-l-2 border-indigo-500 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium shimmer-text">Thinking</span>
                                  <span className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" style={{ animation: 'dot-pulse 1.4s ease-in-out infinite' }} />
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" style={{ animation: 'dot-pulse 1.4s ease-in-out 0.2s infinite' }} />
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" style={{ animation: 'dot-pulse 1.4s ease-in-out 0.4s infinite' }} />
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Timestamp + Action buttons for completed agent messages */}
                            <div className="flex items-center gap-1 mt-1.5 ml-1">
                              <span className="text-[10px] text-gray-400">
                                {relativeTime(msg.timestamp)}
                              </span>

                              {isComplete && (
                                <div className="flex items-center gap-0.5 ml-2">
                                  {/* Copy */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      copyToClipboard(msg.content);
                                      setCopiedMessageId(msg.id);
                                      setTimeout(() => setCopiedMessageId(null), 2000);
                                    }}
                                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                                    title="Copy response"
                                  >
                                    {copiedMessageId === msg.id ? (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 6 9 17l-5-5" />
                                      </svg>
                                    ) : (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                      </svg>
                                    )}
                                  </button>
                                  {/* Regenerate */}
                                  <button
                                    type="button"
                                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                                    title="Regenerate"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M1 4v6h6M23 20v-6h-6" />
                                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
                                    </svg>
                                  </button>
                                  {/* Thumbs up */}
                                  <button
                                    type="button"
                                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                                    title="Good response"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                                    </svg>
                                  </button>
                                  {/* Thumbs down */}
                                  <button
                                    type="button"
                                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                                    title="Poor response"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
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
                  className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 transition-all hover:shadow-xl"
                >
                  <span>↓</span>
                  <span>New messages</span>
                </button>
              )}
            </div>

            {/* ════════════════════════ Input Bar ════════════════════════ */}
            <div className="bg-gray-50/80 backdrop-blur-sm border-t border-gray-100 px-4 py-3 sm:py-4">
              <form
                onSubmit={handleSubmit}
                className="max-w-3xl mx-auto"
              >
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
                  {/* Textarea */}
                  <div className="px-4 pt-3">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Message Pulsed Agent..."
                      rows={1}
                      className="w-full resize-none bg-transparent text-gray-900 placeholder-gray-400 outline-none"
                      style={{ maxHeight: '120px', fontSize: '15px', lineHeight: '1.6' }}
                      onInput={(e) => {
                        const el = e.target as HTMLTextAreaElement;
                        el.style.height = 'auto';
                        el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                      }}
                    />
                  </div>

                  {/* Toolbar row */}
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-1">
                      {/* Attach file (disabled) */}
                      <button
                        type="button"
                        disabled
                        className="p-2 rounded-lg text-gray-300 cursor-not-allowed"
                        title="Attach file — Coming soon"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                      </button>

                      {/* Web search toggle */}
                      <button
                        type="button"
                        onClick={() => setSearchToggled(!searchToggled)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          searchToggled
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                        }`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.3-4.3" />
                        </svg>
                        Search
                      </button>

                      {/* Model selector */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModelDropdownOpen(!modelDropdownOpen);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 text-xs font-medium transition-all"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10a7 7 0 0 1-14 0" />
                            <path d="M12 17v5" />
                            <path d="M8 22h8" />
                          </svg>
                          {selectedModel}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>

                        {modelDropdownOpen && (
                          <div className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50">
                            {['Auto', 'Claude', 'GPT-4', 'Gemini'].map((model) => (
                              <button
                                key={model}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedModel(model);
                                  setModelDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                  selectedModel === model
                                    ? 'text-indigo-600 bg-indigo-50 font-medium'
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {model}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Character count */}
                      {input.length > 100 && (
                        <span className="text-[11px] text-gray-400">{input.length}</span>
                      )}

                      {/* Send button */}
                      <button
                        type="submit"
                        disabled={!input.trim() || isStreaming}
                        className="h-10 w-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 hover:scale-105 active:scale-95 shadow-sm"
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
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 text-center mt-2">
                  Shift + Enter for new line
                </p>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
