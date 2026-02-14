'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, getAccessToken } from '@/lib/auth';

interface UpdateItem {
  id: string;
  type: string;
  title: string;
  summary: string;
  source_url: string | null;
  is_read: boolean;
  created_at: string;
  accounts: { id: string; name: string } | null;
}

interface TodayItem {
  account: { id: string; name: string; state: string | null; status: string };
  lastActivity: { type: string; summary: string; outcome: string | null; created_at: string };
  follow_up_date: string;
}

const typeIcons: Record<string, string> = { call: '📞', email: '📧', meeting: '🤝', note: '📝', research: '🔬' };
const glassCard = { background: 'rgba(17,17,24,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)' };
const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' };
const activityTypes = ['call', 'email', 'meeting', 'note', 'research'];

export default function TodayPage() {
  const router = useRouter();
  const [items, setItems] = useState<TodayItem[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickLog, setQuickLog] = useState<string | null>(null);
  const [actForm, setActForm] = useState({ type: 'call', summary: '', outcome: '', follow_up_date: '' });
  const [saving, setSaving] = useState(false);
  const [updates, setUpdates] = useState<UpdateItem[]>([]);

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) { router.push('/login'); return; }
      setToken(await getAccessToken());
    });
  }, [router]);

  useEffect(() => { if (token) { fetchToday(); fetchUpdates(); } }, [token]);

  async function fetchToday() {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts/today', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setItems(await res.json());
    } catch {}
    setLoading(false);
  }

  async function fetchUpdates() {
    try {
      const res = await fetch('/api/accounts/updates?unread=true', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUpdates(await res.json());
    } catch {}
  }

  async function markRead(updateId: string) {
    await fetch('/api/accounts/updates', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [updateId] }),
    });
    setUpdates(prev => prev.filter(u => u.id !== updateId));
  }

  async function logActivity(accountId: string, e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/accounts/${accountId}/activities`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...actForm, follow_up_date: actForm.follow_up_date || null }),
    });
    setActForm({ type: 'call', summary: '', outcome: '', follow_up_date: '' });
    setQuickLog(null);
    setSaving(false);
    fetchToday();
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 50%)' }} />

      <nav className="sticky top-0 z-50" style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-bold" style={{ color: '#f0f0f5' }}>Pulsed</span>
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span></span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/search" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Research</Link>
            <Link href="/accounts" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Accounts</Link>
            <span className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>Today</span>
            <Link href="/dashboard" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#f0f0f5' }}>Today&apos;s Cockpit</h1>
          <p className="mt-1 text-sm" style={{ color: '#8b8b9e' }}>Who am I calling today and why?</p>
        </div>

        {/* Overnight Updates */}
        {updates.length > 0 && (
          <div className="rounded-2xl p-6 mb-8" style={{ ...glassCard, borderLeft: '3px solid #6366f1' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#f0f0f5' }}>🌙 Overnight Updates ({updates.length})</h2>
            <div className="space-y-3">
              {updates.map(u => (
                <div key={u.id} className="flex gap-3 p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.05)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: '#8b8b9e' }}>{u.type}</span>
                      {u.accounts && (
                        <Link href={`/accounts/${u.accounts.id}`} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">{u.accounts.name}</Link>
                      )}
                      <span className="text-xs" style={{ color: '#6b6b80' }}>{new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-medium" style={{ color: '#f0f0f5' }}>
                      {u.source_url ? <a href={u.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">{u.title}</a> : u.title}
                    </p>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#6b6b80' }}>{u.summary}</p>
                  </div>
                  <button onClick={() => markRead(u.id)} className="text-xs shrink-0 self-start px-2 py-1 rounded hover:bg-white/5 transition-colors" style={{ color: '#8b8b9e' }} title="Mark as read">✓</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 rounded-2xl" style={glassCard}>
            <p className="text-lg mb-2" style={{ color: '#f0f0f5' }}>🎉 All clear!</p>
            <p className="text-sm" style={{ color: '#6b6b80' }}>No follow-ups due today. <Link href="/accounts" className="text-indigo-400">View all accounts</Link></p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => {
              const overdue = item.follow_up_date < today;
              return (
                <div key={item.account.id} className="rounded-xl p-5" style={glassCard}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/accounts/${item.account.id}`} className="text-sm font-semibold hover:text-indigo-400 transition-colors" style={{ color: '#f0f0f5' }}>
                          {item.account.name}
                        </Link>
                        {overdue && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>Overdue</span>}
                        {!overdue && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>Due today</span>}
                      </div>
                      {item.account.state && <p className="text-xs mb-2" style={{ color: '#6b6b80' }}>{item.account.state}</p>}
                      <div className="flex items-center gap-2">
                        <span>{typeIcons[item.lastActivity.type] || '📌'}</span>
                        <p className="text-sm" style={{ color: '#8b8b9e' }}>{item.lastActivity.summary}</p>
                      </div>
                      {item.lastActivity.outcome && <p className="text-xs mt-0.5 italic ml-7" style={{ color: '#6b6b80' }}>→ {item.lastActivity.outcome}</p>}
                      <p className="text-xs mt-1 ml-7" style={{ color: '#6b6b80' }}>Last activity: {new Date(item.lastActivity.created_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => setQuickLog(quickLog === item.account.id ? null : item.account.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 ml-4 transition-colors"
                      style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                    >
                      Log Activity
                    </button>
                  </div>

                  {quickLog === item.account.id && (
                    <form onSubmit={e => logActivity(item.account.id, e)} className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex gap-3">
                        <select value={actForm.type} onChange={e => setActForm({ ...actForm, type: e.target.value })} className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
                          {activityTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                        </select>
                        <input type="date" value={actForm.follow_up_date} onChange={e => setActForm({ ...actForm, follow_up_date: e.target.value })} className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="Next follow-up" />
                      </div>
                      <textarea placeholder="What happened?" value={actForm.summary} onChange={e => setActForm({ ...actForm, summary: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={inputStyle} required />
                      <textarea placeholder="Outcome" value={actForm.outcome} onChange={e => setActForm({ ...actForm, outcome: e.target.value })} rows={1} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={inputStyle} />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setQuickLog(null)} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: '#8b8b9e' }}>Cancel</button>
                        <button type="submit" disabled={saving} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
