'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Artifact, ArtifactColumn, ArtifactRow, getBadgeColor, formatCurrency } from '@/lib/artifacts';

interface Props {
  artifact: Artifact;
  onUpdate: (rows: ArtifactRow[]) => void;
}

type SortDir = 'asc' | 'desc' | null;

export default function ArtifactTable({ artifact, onUpdate }: Props) {
  const columns = artifact.columns || [];
  const [rows, setRows] = useState<ArtifactRow[]>(artifact.rows || []);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [editCell, setEditCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setRows(artifact.rows || []); }, [artifact.rows]);
  useEffect(() => { if (editCell && inputRef.current) inputRef.current.focus(); }, [editCell]);

  const commit = useCallback((newRows: ArtifactRow[]) => {
    setRows(newRows);
    onUpdate(newRows);
  }, [onUpdate]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...rows].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const startEdit = (rowId: string, colKey: string, value: any) => {
    setEditCell({ rowId, colKey });
    setEditValue(String(value ?? ''));
  };

  const saveEdit = () => {
    if (!editCell) return;
    const newRows = rows.map(r =>
      r.id === editCell.rowId ? { ...r, [editCell.colKey]: editValue } : r
    );
    commit(newRows);
    setEditCell(null);
  };

  const deleteRow = (id: string) => {
    commit(rows.filter(r => r.id !== id));
  };

  const addRow = () => {
    const newRow: ArtifactRow = { id: crypto.randomUUID() };
    columns.forEach(c => { newRow[c.key] = ''; });
    commit([...rows, newRow]);
  };

  const renderCell = (col: ArtifactColumn, value: any, rowId: string) => {
    if (editCell?.rowId === rowId && editCell?.colKey === col.key) {
      if (col.type === 'select' && col.options) {
        return (
          <select
            className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ background: '#1a1a2a', borderColor: 'rgba(99,102,241,0.4)', color: '#f0f0f5' }}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={saveEdit}
            autoFocus
          >
            <option value="">—</option>
            {col.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      }
      return (
        <input
          ref={inputRef}
          className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          style={{ background: '#1a1a2a', borderColor: 'rgba(99,102,241,0.4)', color: '#f0f0f5' }}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditCell(null); }}
        />
      );
    }

    const display = value ?? '';
    switch (col.type) {
      case 'badge':
        return display ? (
          <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${getBadgeColor(display)}`}>
            {display}
          </span>
        ) : null;
      case 'currency':
        return <span className="font-medium tabular-nums" style={{ color: '#a78bfa' }}>{formatCurrency(display)}</span>;
      case 'url':
        return display ? <a href={display} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline truncate block max-w-[200px]">{display}</a> : null;
      case 'email':
        return display ? <a href={`mailto:${display}`} className="text-indigo-400 hover:text-indigo-300 hover:underline">{display}</a> : null;
      case 'phone':
        return display ? <a href={`tel:${display}`} className="text-indigo-400 hover:text-indigo-300 hover:underline">{display}</a> : null;
      case 'date':
        if (!display) return null;
        try { return <span>{new Date(display).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>; }
        catch { return <span>{display}</span>; }
      default:
        return <span className="block" style={{ maxWidth: '350px', lineHeight: '1.5' }}>{String(display)}</span>;
    }
  };

  return (
    <div className="rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(17,17,24,0.8)' }}>
      <div className="overflow-x-auto overflow-y-auto artifact-table-scroll" style={{ maxHeight: '70vh', scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
        <style>{`
          .artifact-table-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
          .artifact-table-scroll::-webkit-scrollbar-track { background: transparent; }
          .artifact-table-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
          .artifact-table-scroll::-webkit-scrollbar-thumb:hover { background: #555; }
        `}</style>
        <table className="w-full text-sm" style={{ minWidth: `${columns.length * 180}px` }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors"
                  style={{ color: '#6b6b80', minWidth: '150px', ...(col.width ? { width: col.width } : {}) }}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5 hover:text-indigo-400">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-indigo-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-10 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr
                key={row.id}
                className="group transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className="px-4 py-3 cursor-pointer"
                    style={{ color: '#c0c0d0' }}
                    onClick={() => startEdit(row.id, col.key, row[col.key])}
                  >
                    {renderCell(col, row[col.key], row.id)}
                  </td>
                ))}
                <td className="px-2 py-3">
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                    style={{ color: '#555' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f43f5e'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
                    title="Delete row"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-sm py-1 transition-colors"
          style={{ color: '#6b6b80' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#818cf8'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6b6b80'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add row
        </button>
      </div>
    </div>
  );
}
