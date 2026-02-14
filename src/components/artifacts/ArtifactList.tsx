'use client';

import { useState, useEffect, useRef } from 'react';
import { Artifact, ArtifactRow } from '@/lib/artifacts';

interface Props {
  artifact: Artifact;
  onUpdate: (rows: ArtifactRow[]) => void;
}

const PRIORITY_STYLES: Record<string, { background: string; color: string }> = {
  high: { background: 'rgba(239,68,68,0.15)', color: '#f87171' },
  medium: { background: 'rgba(234,179,8,0.15)', color: '#facc15' },
  low: { background: 'rgba(34,197,94,0.15)', color: '#4ade80' },
};

export default function ArtifactList({ artifact, onUpdate }: Props) {
  const [rows, setRows] = useState<ArtifactRow[]>(artifact.rows || []);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const editRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setRows(artifact.rows || []); }, [artifact.rows]);
  useEffect(() => { if (editId && editRef.current) editRef.current.focus(); }, [editId]);
  useEffect(() => { if (adding && addRef.current) addRef.current.focus(); }, [adding]);

  const commit = (newRows: ArtifactRow[]) => {
    setRows(newRows);
    onUpdate(newRows);
  };

  const toggle = (id: string) => {
    commit(rows.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  const startEdit = (id: string, text: string) => {
    setEditId(id);
    setEditValue(text);
  };

  const saveEdit = () => {
    if (!editId) return;
    commit(rows.map(r => r.id === editId ? { ...r, title: editValue || r.title } : r));
    setEditId(null);
  };

  const deleteItem = (id: string) => commit(rows.filter(r => r.id !== id));

  const addItem = () => {
    if (!newText.trim()) { setAdding(false); return; }
    commit([...rows, { id: crypto.randomUUID(), title: newText.trim(), completed: false, priority: '', dueDate: '' }]);
    setNewText('');
    setAdding(false);
  };

  const formatDate = (d: string) => {
    if (!d) return null;
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch { return d; }
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(17,17,24,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {rows.length === 0 && !adding && (
        <div className="px-6 py-10 text-center text-sm" style={{ color: '#6b6b80' }}>No items yet</div>
      )}
      {rows.map((row, i) => (
        <div key={row.id} className="flex items-center gap-3 px-4 py-3 transition-colors group" style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          <button
            onClick={() => toggle(row.id)}
            className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors"
            style={{
              border: row.completed ? '2px solid #818cf8' : '2px solid rgba(255,255,255,0.15)',
              background: row.completed ? '#818cf8' : 'transparent',
            }}
          >
            {row.completed && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            {editId === row.id ? (
              <input
                ref={editRef}
                className="w-full text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ background: '#1a1a2a', border: '1px solid rgba(99,102,241,0.4)', color: '#f0f0f5' }}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null); }}
              />
            ) : (
              <span
                className="text-sm cursor-pointer"
                style={{ color: row.completed ? '#6b6b80' : '#f0f0f5', textDecoration: row.completed ? 'line-through' : 'none' }}
                onClick={() => startEdit(row.id, row.title || '')}
              >
                {row.title || 'Untitled'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {row.priority && PRIORITY_STYLES[row.priority?.toLowerCase()] && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={PRIORITY_STYLES[row.priority.toLowerCase()]}>
                {row.priority}
              </span>
            )}
            {row.dueDate && (
              <span className="text-[11px]" style={{ color: '#6b6b80' }}>{formatDate(row.dueDate)}</span>
            )}
            <button
              onClick={() => deleteItem(row.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
              style={{ color: '#6b6b80' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#6b6b80'; e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            ref={addRef}
            className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ background: '#1a1a2a', border: '1px solid rgba(99,102,241,0.4)', color: '#f0f0f5' }}
            placeholder="What needs to be done?"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') setAdding(false); }}
            onBlur={addItem}
          />
        </div>
      ) : (
        <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-sm transition-colors py-1"
            style={{ color: '#6b6b80' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#818cf8'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6b6b80'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add item
          </button>
        </div>
      )}
    </div>
  );
}
