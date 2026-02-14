'use client';

import { useState, useEffect, useRef } from 'react';
import { Artifact, ArtifactRow, getBadgeColor } from '@/lib/artifacts';

interface Props {
  artifact: Artifact;
  onUpdate: (rows: ArtifactRow[]) => void;
}

export default function ArtifactKanban({ artifact, onUpdate }: Props) {
  const columns = artifact.columns || [];
  const groupCol = columns.find(c => c.key === artifact.groupBy);
  const groups = groupCol?.options || [...new Set((artifact.rows || []).map(r => r[artifact.groupBy || '']))].filter(Boolean) as string[];
  const displayCols = columns.filter(c => c.key !== artifact.groupBy).slice(0, 3);

  const [rows, setRows] = useState<ArtifactRow[]>(artifact.rows || []);
  const [dragId, setDragId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setRows(artifact.rows || []); }, [artifact.rows]);
  useEffect(() => { if (addingTo && addRef.current) addRef.current.focus(); }, [addingTo]);

  const commit = (newRows: ArtifactRow[]) => {
    setRows(newRows);
    onUpdate(newRows);
  };

  const groupKey = artifact.groupBy || '';

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetGroup: string) => {
    e.preventDefault();
    if (!dragId) return;
    const newRows = rows.map(r => r.id === dragId ? { ...r, [groupKey]: targetGroup } : r);
    commit(newRows);
    setDragId(null);
  };

  const addCard = (group: string) => {
    if (!newName.trim()) { setAddingTo(null); return; }
    const newRow: ArtifactRow = { id: crypto.randomUUID(), [groupKey]: group };
    if (displayCols[0]) newRow[displayCols[0].key] = newName.trim();
    columns.forEach(c => { if (!(c.key in newRow)) newRow[c.key] = ''; });
    commit([...rows, newRow]);
    setNewName('');
    setAddingTo(null);
  };

  const deleteCard = (id: string) => {
    commit(rows.filter(r => r.id !== id));
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {groups.map(group => {
        const groupRows = rows.filter(r => r[groupKey] === group);
        return (
          <div
            key={group}
            className="flex-shrink-0 w-72 rounded-xl p-3 flex flex-col"
            style={{ background: 'rgba(17,17,24,0.5)' }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, group)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>{group}</h3>
                <span className="text-xs font-medium rounded-full px-2 py-0.5" style={{ background: 'rgba(255,255,255,0.06)', color: '#8b8b9e' }}>
                  {groupRows.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-2 min-h-[40px]">
              {groupRows.map(row => (
                <div
                  key={row.id}
                  draggable
                  onDragStart={e => handleDragStart(e, row.id)}
                  className={`rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all group ${
                    dragId === row.id ? 'opacity-50' : ''
                  }`}
                  style={{ background: 'rgba(17,17,24,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {displayCols.map((col, i) => {
                        const val = row[col.key];
                        if (!val && val !== 0) return null;
                        if (i === 0) return (
                          <p key={col.key} className="text-sm font-medium truncate" style={{ color: '#f0f0f5' }}>{val}</p>
                        );
                        if (col.type === 'badge') return (
                          <span key={col.key} className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1.5 ${getBadgeColor(val)}`}>{val}</span>
                        );
                        if (col.type === 'currency') return (
                          <p key={col.key} className="text-xs mt-1" style={{ color: '#8b8b9e' }}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val) || 0)}</p>
                        );
                        return <p key={col.key} className="text-xs mt-1 truncate" style={{ color: '#8b8b9e' }}>{val}</p>;
                      })}
                    </div>
                    <button
                      onClick={() => deleteCard(row.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all ml-2 shrink-0"
                      style={{ color: '#6b6b80' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#6b6b80'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Add card input */}
              {addingTo === group ? (
                <div className="rounded-lg p-2" style={{ background: 'rgba(17,17,24,0.8)', border: '1px solid rgba(99,102,241,0.4)' }}>
                  <input
                    ref={addRef}
                    className="w-full text-sm px-2 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    style={{ background: '#1a1a2a', border: '1px solid rgba(99,102,241,0.4)', color: '#f0f0f5' }}
                    placeholder={displayCols[0]?.label || 'Name'}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addCard(group); if (e.key === 'Escape') setAddingTo(null); }}
                    onBlur={() => addCard(group)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => { setAddingTo(group); setNewName(''); }}
                  className="w-full text-left text-sm px-2 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                  style={{ color: '#6b6b80' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#6b6b80'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  Add card
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
