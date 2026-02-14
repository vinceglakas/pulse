'use client';

import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getSession, getAccessToken } from '@/lib/auth';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

interface FileAttachment {
  name: string;
  type: string;
  data: string;
  size: number;
}

const MODEL_OPTIONS = [
  { value: 'Claude', label: 'Claude', provider: 'anthropic', desc: 'Anthropic' },
  { value: 'GPT-4', label: 'GPT-4', provider: 'openai', desc: 'OpenAI' },
  { value: 'Gemini', label: 'Gemini', provider: 'google', desc: 'Google' },
  { value: 'Kimi', label: 'Kimi', provider: 'moonshot', desc: 'Moonshot' },
];

function getPreferredProvider(model: string): string | undefined {
  return MODEL_OPTIONS.find((m) => m.value === model)?.provider;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = '.pdf,.csv,.txt,.md,.json,.png,.jpg,.gif,.xlsx,.doc,.docx';

const HIDDEN_PATHS = ['/agent', '/login', '/signup', '/pricing', '/terms', '/privacy'];
const HIDDEN_PREFIXES = ['/brief/'];
const AUTHENTICATED_PATHS = ['/workspace', '/accounts', '/history', '/dashboard', '/settings', '/search'];

function shouldShow(pathname: string): boolean {
  if (pathname === '/') return false;
  if (HIDDEN_PATHS.includes(pathname)) return false;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  return AUTHENTICATED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default function FloatingChat() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('pulsed-selected-model') || 'Claude';
    return 'Claude';
  });
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  // Restore open state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pulsed-floating-chat-open');
    if (saved === 'true') setIsOpen(true);
  }, []);

  // Save open state
  useEffect(() => {
    localStorage.setItem('pulsed-floating-chat-open', String(isOpen));
  }, [isOpen]);

  // Auth check
  useEffect(() => {
    getSession().then(async (session) => {
      if (session) {
        setAuthenticated(true);
        const token = await getAccessToken();
        setAccessToken(token);
      }
    });
  }, []);

  // Load history when opened
  useEffect(() => {
    if (!isOpen || !authenticated || !accessToken || historyLoaded) return;
    (async () => {
      try {
        const res = await fetch('/api/agent/history?sessionKey=default&limit=50', {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.messages?.length > 0) {
            const deduped: any[] = [];
            for (const m of data.messages) {
              const prev = deduped[deduped.length - 1];
              if (prev && prev.role === m.role && prev.content === m.content) continue;
              deduped.push(m);
            }
            setMessages(deduped.map((m: any) => ({
              id: m.id,
              role: m.role === 'user' ? 'user' : 'agent',
              content: m.content,
              timestamp: new Date(m.created_at),
            })));
          }
        }
      } catch {}
      setHistoryLoaded(true);
    })();
  }, [isOpen, authenticated, accessToken, historyLoaded]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist model
  useEffect(() => {
    localStorage.setItem('pulsed-selected-model', selectedModel);
  }, [selectedModel]);

  // Close model dropdown on outside click
  useEffect(() => {
    if (!modelDropdownOpen) return;
    const handler = () => setModelDropdownOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [modelDropdownOpen]);

  // File handling
  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) { alert(`File "${file.name}" exceeds 10MB limit.`); continue; }
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
        reader.readAsDataURL(file);
      });
      setAttachments((prev) => [...prev, { name: file.name, type: file.type, data, size: file.size }]);
    }
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    const currentAttachments = [...attachments];
    const fileNames = currentAttachments.map((a) => a.name);
    const displayContent = fileNames.length > 0 ? `${text}\n\n📎 ${fileNames.join(', ')}` : text;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: displayContent, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setIsStreaming(true);

    const agentMsgId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: agentMsgId, role: 'agent', content: '', timestamp: new Date() }]);

    const provider = getPreferredProvider(selectedModel);
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          sessionKey: 'default',
          context: { currentPage: pathname },
          ...(provider ? { preferredProvider: provider, model: selectedModel, provider } : {}),
          ...(currentAttachments.length > 0 ? { attachments: currentAttachments.map(({ name, type, data }) => ({ name, type, data })) } : {}),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error('No response body');

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
              if (parsed.tool_start) {
                setToolStatus(parsed.status || `Running ${parsed.tool_start}...`);
              } else if (parsed.tool_done) {
                setToolStatus(null);
              } else if (parsed.status && !parsed.tool_start) {
                setToolStatus(parsed.status);
              }
              if (parsed.text) {
                setToolStatus(null);
                setMessages((prev) =>
                  prev.map((m) => m.id === agentMsgId ? { ...m, content: m.content + parsed.text } : m)
                );
              }
            } catch {
              setMessages((prev) =>
                prev.map((m) => m.id === agentMsgId ? { ...m, content: m.content + data } : m)
              );
            }
          }
        }
      }

      // Mark unread if chat is collapsed
      if (!isOpen) setHasUnread(true);
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsgId ? { ...m, content: `Something went wrong: ${err?.message || 'Unknown error'}` } : m
        )
      );
    } finally {
      setIsStreaming(false);
      setToolStatus(null);
    }
  };

  if (!authenticated || !shouldShow(pathname)) return null;

  return (
    <>
      <style>{`
        @keyframes float-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
          50% { box-shadow: 0 0 20px 6px rgba(99,102,241,0.15); }
        }
        @keyframes float-chat-in {
          0% { opacity: 0; transform: translateY(16px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes float-chat-out {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(16px) scale(0.95); }
        }
        .floating-chat-panel {
          animation: float-chat-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .floating-chat-panel.closing {
          animation: float-chat-out 0.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="floating-chat-panel fixed z-[9998] flex flex-col"
          style={{
            bottom: '88px',
            right: '20px',
            width: '400px',
            height: '520px',
            maxHeight: 'calc(100vh - 120px)',
            background: 'rgba(10,10,15,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <span className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>Pulsed Agent</span>
              {toolStatus && (
                <span className="text-xs ml-1" style={{ color: '#818cf8' }}>{toolStatus}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#8b8b9e' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#f0f0f5'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#8b8b9e'; e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={chatBodyRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            {messages.length === 0 && historyLoaded && (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-center" style={{ color: '#5a5a6e' }}>Ask your agent anything...</p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed"
                  style={
                    m.role === 'user'
                      ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', borderBottomRightRadius: '4px' }
                      : { background: 'rgba(255,255,255,0.05)', color: '#f0f0f5', borderBottomLeftRadius: '4px' }
                  }
                >
                  {m.role === 'agent' ? (
                    <div className="prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || '...'}</ReactMarkdown>
                    </div>
                  ) : (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-3 pb-3 pt-1 shrink-0">
            {/* File chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1 pb-2">
                {attachments.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                    <span className="max-w-[80px] truncate">{file.name}</span>
                    <button type="button" onClick={() => removeAttachment(idx)} className="hover:text-white"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
                  </div>
                ))}
              </div>
            )}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files); }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
            >
              <div className="flex items-end gap-2 px-3 py-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Message your agent..."
                  rows={1}
                  className="flex-1 bg-transparent outline-none text-sm resize-none"
                  style={{ color: '#f0f0f5', maxHeight: '80px', scrollbarWidth: 'none' }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className="p-1.5 rounded-lg transition-all shrink-0 disabled:opacity-30"
                  style={{ background: input.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent', color: '#fff' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
              {/* Toolbar */}
              <div className="flex items-center gap-1 px-2 py-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_FILE_TYPES} className="hidden" onChange={(e) => { if (e.target.files) handleFileSelect(e.target.files); e.target.value = ''; }} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-md transition-colors" style={{ color: '#8b8b9e' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#f0f0f5'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#8b8b9e'; }} title="Attach file">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                </button>
                <div className="relative">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setModelDropdownOpen(!modelDropdownOpen); }} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors" style={{ color: '#8b8b9e' }} onMouseEnter={(e) => e.currentTarget.style.color = '#f0f0f5'} onMouseLeave={(e) => e.currentTarget.style.color = '#8b8b9e'}>
                    {selectedModel}
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  {modelDropdownOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl py-1.5 z-50" style={{ background: 'rgba(17,17,24,0.95)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}>
                      {MODEL_OPTIONS.map((opt) => (
                        <button key={opt.value} type="button" onClick={(e) => { e.stopPropagation(); setSelectedModel(opt.value); setModelDropdownOpen(false); }} className="w-full text-left px-3 py-2 transition-colors flex items-center justify-between" style={{ color: selectedModel === opt.value ? '#a5b4fc' : '#f0f0f5', background: selectedModel === opt.value ? 'rgba(99,102,241,0.1)' : 'transparent' }} onMouseEnter={(e) => { if (selectedModel !== opt.value) e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }} onMouseLeave={(e) => { if (selectedModel !== opt.value) e.currentTarget.style.background = 'transparent'; }}>
                          <div className="flex flex-col"><span className="text-xs font-medium">{opt.label}</span><span className="text-[10px]" style={{ color: '#5a5a6e' }}>{opt.desc}</span></div>
                          {selectedModel === opt.value && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => { setIsOpen(!isOpen); setHasUnread(false); }}
        className="fixed z-[9999] flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
        style={{
          bottom: '20px',
          right: '20px',
          width: '56px',
          height: '56px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
          animation: hasUnread ? 'float-pulse 2s ease-in-out infinite' : undefined,
        }}
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {hasUnread && (
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-red-500 border-2" style={{ borderColor: '#6366f1' }} />
            )}
          </>
        )}
      </button>

      {/* Mobile fullscreen override */}
      <style>{`
        @media (max-width: 480px) {
          .floating-chat-panel {
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
