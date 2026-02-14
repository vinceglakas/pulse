'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, getAccessToken } from '@/lib/auth';

interface Account {
  id: string;
  name: string;
  state: string | null;
  status: string;
  website: string | null;
  updated_at: string;
  account_activities?: { created_at: string; summary: string; follow_up_date: string | null }[];
}

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: 'rgba(16,185,129,0.15)', text: '#34d399' },
  paused: { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
  'closed-won': { bg: 'rgba(99,102,241,0.15)', text: '#818cf8' },
  'closed-lost': { bg: 'rgba(239,68,68,0.15)', text: '#f87171' },
};

const glassCard = {
  background: 'rgba(17,17,24,0.8)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.06)',
};

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', state: '', website: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) { router.push('/login'); return; }
      const t = await getAccessToken();
      setToken(t);
    });
  }, [router]);

  useEffect(() => {
    if (!token) return;
    fetchAccounts();
  }, [token, filter, search]);

  async function fetchAccounts() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    if (search) params.set('search', search);
    try {
      const res = await fetch(`/api/accounts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAccounts(await res.json());
    } catch {}
    setLoading(false);
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccount.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount),
      });
      if (res.ok) {
        setNewAccount({ name: '', state: '', website: '' });
        setShowAdd(false);
        fetchAccounts();
      }
    } catch {}
    setSaving(false);
  }

  function getLastActivity(acc: Account) {
    const acts = acc.account_activities || [];
    if (!acts.length) return null;
    return acts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  }

  function getNextFollowUp(acc: Account) {
    const acts = (acc.account_activities || []).filter(a => a.follow_up_date);
    if (!acts.length) return null;
    return acts.sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime())[0].follow_up_date;
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 50%)' }} />

      <nav className="sticky top-0 z-50" style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-bold" style={{ color: '#f0f0f5' }}>Pulsed</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/search" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Research</Link>
            <Link href="/agent" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Agent</Link>
            <Link href="/workspace" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Workspace</Link>
            <span className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>Accounts</span>
            <Link href="/accounts/today" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Today</Link>
            <Link href="/dashboard" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#f0f0f5' }}>Accounts</h1>
            <p className="mt-1 text-sm" style={{ color: '#8b8b9e' }}>Your sales pipeline</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            + Add Account
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            {['active', 'all', 'paused', 'closed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-2 text-xs font-medium capitalize transition-colors"
                style={{
                  background: filter === f ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: filter === f ? '#818cf8' : '#8b8b9e',
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search accounts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 max-w-xs px-4 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#f0f0f5' }}
          />
        </div>

        {/* Add Account Modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAdd(false)}>
            <div className="w-full max-w-md rounded-2xl p-6" style={glassCard} onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-4" style={{ color: '#f0f0f5' }}>New Account</h2>
              <form onSubmit={createAccount} className="space-y-4">
                <input
                  type="text"
                  placeholder="Account name *"
                  value={newAccount.name}
                  onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}
                  required
                />
                <input
                  type="text"
                  placeholder="State (e.g. California)"
                  value={newAccount.state}
                  onChange={e => setNewAccount({ ...newAccount, state: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}
                />
                <input
                  type="text"
                  placeholder="Website"
                  value={newAccount.website}
                  onChange={e => setNewAccount({ ...newAccount, website: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}
                />
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm rounded-lg" style={{ color: '#8b8b9e' }}>Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    {saving ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Account Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-20">
            <p style={{ color: '#6b6b80' }}>No accounts yet. Add your first one to get started.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(acc => {
              const last = getLastActivity(acc);
              const nextFu = getNextFollowUp(acc);
              const sc = statusColors[acc.status] || statusColors.active;
              return (
                <Link
                  key={acc.id}
                  href={`/accounts/${acc.id}`}
                  className="rounded-xl p-5 transition-all duration-200 hover:border-indigo-500/20"
                  style={glassCard}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-semibold leading-tight" style={{ color: '#f0f0f5' }}>{acc.name}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2" style={{ background: sc.bg, color: sc.text }}>
                      {acc.status}
                    </span>
                  </div>
                  {acc.state && <p className="text-xs mb-3" style={{ color: '#6b6b80' }}>{acc.state}</p>}
                  <div className="space-y-1.5">
                    {last && (
                      <p className="text-xs truncate" style={{ color: '#8b8b9e' }}>
                        Last: {last.summary} · {new Date(last.created_at).toLocaleDateString()}
                      </p>
                    )}
                    {nextFu && (
                      <p className="text-xs" style={{ color: new Date(nextFu) <= new Date() ? '#f87171' : '#8b8b9e' }}>
                        Follow-up: {new Date(nextFu).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
