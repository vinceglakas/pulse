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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-end px-4 py-2 border-b border-gray-100">
        {editing ? (
          <div className="flex gap-2">
            <button onClick={() => { setText(content || ''); setEditing(false); }} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={save} className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors">Save</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <textarea
          className="w-full min-h-[400px] p-6 text-sm font-mono text-gray-800 focus:outline-none resize-y"
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
        />
      ) : (
        <div className="p-6 prose prose-sm prose-indigo max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-indigo-600 prose-strong:text-gray-800 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm">
          {text ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          ) : (
            <p className="text-gray-400 italic">Empty document. Click Edit to start writing.</p>
          )}
        </div>
      )}
    </div>
  );
}
