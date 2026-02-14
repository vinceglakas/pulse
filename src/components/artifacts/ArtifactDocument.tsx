'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  onUpdate: (content: string) => void;
}

export default function ArtifactDocument({ content, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(content || '');

  useEffect(() => { setText(content || ''); }, [content]);

  const save = () => {
    onUpdate(text);
    setEditing(false);
  };

  return (
    <div style={{ background: 'rgba(17,17,24,0.8)', border: '1px solid rgba(255,255,255,0.06)' }} className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-end px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={() => { setText(content || ''); setEditing(false); }} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ color: '#6b6b80' }} onMouseEnter={e => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }} onMouseLeave={e => { e.currentTarget.style.color = '#6b6b80'; e.currentTarget.style.background = 'transparent'; }}>Cancel</button>
            <button onClick={save} className="text-xs text-white px-3 py-1.5 rounded-lg transition-colors" style={{ background: '#818cf8' }} onMouseEnter={e => { e.currentTarget.style.background = '#6366f1'; }} onMouseLeave={e => { e.currentTarget.style.background = '#818cf8'; }}>Save</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1" style={{ color: '#6b6b80' }} onMouseEnter={e => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }} onMouseLeave={e => { e.currentTarget.style.color = '#6b6b80'; e.currentTarget.style.background = 'transparent'; }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <textarea
          className="w-full min-h-[400px] p-6 text-sm font-mono focus:outline-none resize-y"
          style={{ background: '#1a1a2a', border: 'none', color: '#f0f0f5' }}
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
        />
      ) : (
        <div className="p-6 prose prose-sm prose-invert max-w-none" style={{ color: '#c0c0d0' }}>
          <style>{`
            .prose-invert h1, .prose-invert h2, .prose-invert h3, .prose-invert h4 { color: #f0f0f5 !important; }
            .prose-invert p { color: #c0c0d0 !important; }
            .prose-invert a { color: #818cf8 !important; }
            .prose-invert strong { color: #f0f0f5 !important; }
            .prose-invert code { background: rgba(255,255,255,0.06) !important; color: #c0c0d0 !important; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.875rem; }
            .prose-invert li { color: #c0c0d0 !important; }
          `}</style>
          {text ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          ) : (
            <p style={{ color: '#6b6b80', fontStyle: 'italic' }}>Empty document. Click Edit to start writing.</p>
          )}
        </div>
      )}
    </div>
  );
}
