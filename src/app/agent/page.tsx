'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
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

export default function AgentPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>('free');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) {
        router.push('/login');
      } else {
        setAuthChecked(true);
        const token = await getAccessToken();
        setAccessToken(token);
        // Check user plan
        try {
          const profileRes = await fetch('/api/profile', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const profileData = await profileRes.json();
          setUserPlan(profileData?.plan || 'free');
        } catch {
          setUserPlan('free');
        }
        // Check if user has API keys
        try {
          const res = await fetch('/api/keys', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const data = await res.json();
          setHasApiKey(Array.isArray(data) && data.length > 0);
        } catch {
          setHasApiKey(false);
        }
        // Load conversation history
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
      }
    });
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    // Save user message to history (fire and forget)
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
              // non-JSON data line, append as text
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
      // Save agent response to history
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

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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

      {/* Chat Area */}
      {(userPlan === 'agent' || userPlan === 'ultra') && <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-6 shadow-lg">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10a7 7 0 0 1-14 0" />
                  <path d="M12 17v5" />
                  <path d="M8 22h8" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ultron Agent</h2>
              <p className="text-gray-500 max-w-md">
                Your personal AI agent powered by OpenClaw. Ask anything — research, analysis, tasks, and more.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                {msg.role === 'agent' && msg.content ? (
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
                ) : msg.content ? (
                  <span>{msg.content}</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>}

      {/* Input Bar */}
      {(userPlan === 'agent' || userPlan === 'ultra') &&
      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-end gap-3"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Ultron..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
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
            className="h-[44px] w-[44px] rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
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
        </form>
      </div>}
    </div>
  );
}
