'use client';

import { useState, useEffect, useRef } from 'react';
import { Artifact, ArtifactRow } from '@/lib/artifacts';

interface Props {
  artifact: Artifact;
  onUpdate: (rows: ArtifactRow[]) => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
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
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {rows.length === 0 && !adding && (
        <div className="px-6 py-10 text-center text-sm text-gray-400">No items yet</div>
      )}
      {rows.map(row => (
        <div key={row.id} className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/30 transition-colors group">
          <button
            onClick={() => toggle(row.id)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              row.completed ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 hover:border-indigo-400'
            }`}
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
                className="w-full text-sm bg-white border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null); }}
              />
            ) : (
              <span
                className={`text-sm cursor-pointer ${row.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}
                onClick={() => startEdit(row.id, row.title || '')}
              >
                {row.title || 'Untitled'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {row.priority && PRIORITY_STYLES[row.priority?.toLowerCase()] && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLES[row.priority.toLowerCase()]}`}>
                {row.priority}
              </span>
            )}
            {row.dueDate && (
              <span className="text-[11px] text-gray-400">{formatDate(row.dueDate)}</span>
            )}
            <button
              onClick={() => deleteItem(row.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="px-4 py-3">
          <input
            ref={addRef}
            className="w-full text-sm border border-indigo-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="What needs to be done?"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') setAdding(false); }}
            onBlur={addItem}
          />
        </div>
      ) : (
        <div className="px-4 py-2">
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors py-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add item
          </button>
        </div>
      )}
    </div>
  );
}
