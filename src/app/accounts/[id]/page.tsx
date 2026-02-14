'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, getAccessToken } from '@/lib/auth';

interface Contact { id: string; name: string; title: string | null; email: string | null; phone: string | null; notes: string | null; }
interface Activity { id: string; type: string; summary: string; outcome: string | null; follow_up_date: string | null; created_at: string; }
interface Research { id: string; title: string | null; content: string | null; source: string | null; created_at: string; }
interface Update { id: string; type: string; title: string; summary: string; source_url: string | null; is_read: boolean; created_at: string; }
interface Account { id: string; name: string; state: string | null; website: string | null; notes: string | null; status: string; account_contacts: Contact[]; account_activities: Activity[]; account_research: Research[]; }

const typeIcons: Record<string, string> = { call: '📞', email: '📧', meeting: '🤝', note: '📝', research: '🔬' };
const statuses = ['active', 'paused', 'closed-won', 'closed-lost'];
const activityTypes = ['call', 'email', 'meeting', 'note', 'research'];

const glassCard = { background: 'rgba(17,17,24,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)' };
const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' };

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showActivity, setShowActivity] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [editContact, setEditContact] = useState<Contact | null>(null);

  const [actForm, setActForm] = useState({ type: 'call', summary: '', outcome: '', follow_up_date: '' });
  const [contactForm, setContactForm] = useState({ name: '', title: '', email: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [updates, setUpdates] = useState<Update[]>([]);

  const headers = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) { router.push('/login'); return; }
      setToken(await getAccessToken());
    });
  }, [router]);

  useEffect(() => { if (token) { fetchAccount(); fetchUpdates(); } }, [token]);

  async function fetchAccount() {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAccount(data);
        setNotesValue(data.notes || '');
      }
    } catch {}
    setLoading(false);
  }

  async function fetchUpdates() {
    try {
      const res = await fetch(`/api/accounts/updates?account_id=${id}&unread=false`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUpdates(await res.json());
    } catch {}
  }

  async function markUpdateRead(updateId: string) {
    await fetch('/api/accounts/updates', { method: 'PUT', headers: headers(), body: JSON.stringify({ ids: [updateId] }) });
    setUpdates(prev => prev.map(u => u.id === updateId ? { ...u, is_read: true } : u));
  }

  async function updateStatus(status: string) {
    await fetch(`/api/accounts/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status }) });
    fetchAccount();
  }

  async function saveNotes() {
    await fetch(`/api/accounts/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ notes: notesValue }) });
    setEditingNotes(false);
    fetchAccount();
  }

  async function logActivity(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/accounts/${id}/activities`, { method: 'POST', headers: headers(), body: JSON.stringify({ ...actForm, follow_up_date: actForm.follow_up_date || null }) });
    setActForm({ type: 'call', summary: '', outcome: '', follow_up_date: '' });
    setShowActivity(false);
    setSaving(false);
    fetchAccount();
  }

  async function saveContact(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editContact) {
      await fetch(`/api/accounts/${id}/contacts/${editContact.id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(contactForm) });
    } else {
      await fetch(`/api/accounts/${id}/contacts`, { method: 'POST', headers: headers(), body: JSON.stringify(contactForm) });
    }
    setContactForm({ name: '', title: '', email: '', phone: '', notes: '' });
    setShowContact(false);
    setEditContact(null);
    setSaving(false);
    fetchAccount();
  }

  async function deleteContact(cid: string) {
    if (!confirm('Delete this contact?')) return;
    await fetch(`/api/accounts/${id}/contacts/${cid}`, { method: 'DELETE', headers: headers() });
    fetchAccount();
  }

  async function deleteAccount() {
    if (!confirm('Delete this account and all related data?')) return;
    await fetch(`/api/accounts/${id}`, { method: 'DELETE', headers: headers() });
    router.push('/accounts');
  }

  if (loading || !account) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activities = [...(account.account_activities || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const contacts = account.account_contacts || [];
  const research = account.account_research || [];

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
            <Link href="/accounts" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>← Accounts</Link>
            <Link href="/accounts/today" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Today</Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="rounded-2xl p-6 mb-6" style={glassCard}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#f0f0f5' }}>{account.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                {account.state && <span className="text-sm" style={{ color: '#8b8b9e' }}>{account.state}</span>}
                {account.website && (
                  <a href={account.website.startsWith('http') ? account.website : `https://${account.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                    {account.website}
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={account.status}
                onChange={e => updateStatus(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold outline-none cursor-pointer"
                style={inputStyle}
              >
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={deleteAccount} className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-red-500/10" style={{ color: '#f87171' }}>Delete</button>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-2xl p-6 mb-6" style={glassCard}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>Notes</h2>
            {editingNotes ? (
              <div className="flex gap-2">
                <button onClick={() => setEditingNotes(false)} className="text-xs" style={{ color: '#8b8b9e' }}>Cancel</button>
                <button onClick={saveNotes} className="text-xs font-semibold text-indigo-400">Save</button>
              </div>
            ) : (
              <button onClick={() => setEditingNotes(true)} className="text-xs text-indigo-400">Edit</button>
            )}
          </div>
          {editingNotes ? (
            <textarea
              value={notesValue}
              onChange={e => setNotesValue(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={inputStyle}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap" style={{ color: account.notes ? '#8b8b9e' : '#6b6b80' }}>
              {account.notes || 'No notes yet.'}
            </p>
          )}
        </div>

        {/* What's New */}
        {updates.length > 0 && (
          <div className="rounded-2xl p-6 mb-6" style={glassCard}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#f0f0f5' }}>What&apos;s New ({updates.filter(u => !u.is_read).length} unread)</h2>
            <div className="space-y-3">
              {updates.map(u => (
                <div key={u.id} className="flex gap-3 p-3 rounded-lg" style={{ background: u.is_read ? 'transparent' : 'rgba(99,102,241,0.05)', borderLeft: u.is_read ? '2px solid transparent' : '2px solid #6366f1' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: '#8b8b9e' }}>{u.type}</span>
                      <span className="text-xs" style={{ color: '#6b6b80' }}>{new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-medium mt-1" style={{ color: u.is_read ? '#8b8b9e' : '#f0f0f5' }}>
                      {u.source_url ? <a href={u.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">{u.title}</a> : u.title}
                    </p>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#6b6b80' }}>{u.summary}</p>
                  </div>
                  {!u.is_read && (
                    <button onClick={() => markUpdateRead(u.id)} className="text-xs shrink-0 self-start px-2 py-1 rounded" style={{ color: '#8b8b9e' }} title="Mark as read">✓</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Contacts */}
          <div className="rounded-2xl p-6" style={glassCard}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>Contacts ({contacts.length})</h2>
              <button onClick={() => { setEditContact(null); setContactForm({ name: '', title: '', email: '', phone: '', notes: '' }); setShowContact(true); }} className="text-xs text-indigo-400">+ Add</button>
            </div>
            {contacts.length === 0 ? (
              <p className="text-sm" style={{ color: '#6b6b80' }}>No contacts yet.</p>
            ) : (
              <div className="space-y-3">
                {contacts.map(c => (
                  <div key={c.id} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#f0f0f5' }}>{c.name}</p>
                        {c.title && <p className="text-xs" style={{ color: '#8b8b9e' }}>{c.title}</p>}
                        <div className="flex gap-3 mt-1">
                          {c.email && <a href={`mailto:${c.email}`} className="text-xs text-indigo-400">{c.email}</a>}
                          {c.phone && <span className="text-xs" style={{ color: '#8b8b9e' }}>{c.phone}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditContact(c); setContactForm({ name: c.name, title: c.title || '', email: c.email || '', phone: c.phone || '', notes: c.notes || '' }); setShowContact(true); }} className="text-xs text-indigo-400">Edit</button>
                        <button onClick={() => deleteContact(c.id)} className="text-xs" style={{ color: '#f87171' }}>×</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Research */}
          <div className="rounded-2xl p-6" style={glassCard}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>Research ({research.length})</h2>
            </div>
            {research.length === 0 ? (
              <p className="text-sm" style={{ color: '#6b6b80' }}>No research saved. Use the &quot;Save to Account&quot; button from briefs.</p>
            ) : (
              <div className="space-y-3">
                {research.map(r => (
                  <div key={r.id} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-sm font-medium" style={{ color: '#f0f0f5' }}>{r.title || 'Untitled'}</p>
                    {r.source && <p className="text-xs mt-0.5" style={{ color: '#6b6b80' }}>Source: {r.source}</p>}
                    {r.content && <p className="text-xs mt-1 line-clamp-3" style={{ color: '#8b8b9e' }}>{r.content}</p>}
                    <p className="text-xs mt-1" style={{ color: '#6b6b80' }}>{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="rounded-2xl p-6 mt-6" style={glassCard}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>Activity Timeline ({activities.length})</h2>
            <button onClick={() => setShowActivity(true)} className="text-xs font-semibold text-indigo-400">+ Log Activity</button>
          </div>
          {activities.length === 0 ? (
            <p className="text-sm" style={{ color: '#6b6b80' }}>No activities logged yet.</p>
          ) : (
            <div className="space-y-3">
              {activities.map(a => (
                <div key={a.id} className="flex gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-lg">{typeIcons[a.type] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold capitalize" style={{ color: '#f0f0f5' }}>{a.type}</span>
                      <span className="text-xs" style={{ color: '#6b6b80' }}>{new Date(a.created_at).toLocaleDateString()}</span>
                      {a.follow_up_date && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                          Follow-up: {new Date(a.follow_up_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: '#8b8b9e' }}>{a.summary}</p>
                    {a.outcome && <p className="text-xs mt-0.5 italic" style={{ color: '#6b6b80' }}>→ {a.outcome}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Activity Modal */}
      {showActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowActivity(false)}>
          <div className="w-full max-w-md rounded-2xl p-6" style={glassCard} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#f0f0f5' }}>Log Activity</h2>
            <form onSubmit={logActivity} className="space-y-4">
              <select value={actForm.type} onChange={e => setActForm({ ...actForm, type: e.target.value })} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none" style={inputStyle}>
                {activityTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <textarea placeholder="What happened? *" value={actForm.summary} onChange={e => setActForm({ ...actForm, summary: e.target.value })} rows={3} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none resize-none" style={inputStyle} required />
              <textarea placeholder="Outcome (optional)" value={actForm.outcome} onChange={e => setActForm({ ...actForm, outcome: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none resize-none" style={inputStyle} />
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#8b8b9e' }}>Follow-up date</label>
                <input type="date" value={actForm.follow_up_date} onChange={e => setActForm({ ...actForm, follow_up_date: e.target.value })} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowActivity(false)} className="px-4 py-2 text-sm rounded-lg" style={{ color: '#8b8b9e' }}>Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  {saving ? 'Saving...' : 'Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setShowContact(false); setEditContact(null); }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={glassCard} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#f0f0f5' }}>{editContact ? 'Edit Contact' : 'Add Contact'}</h2>
            <form onSubmit={saveContact} className="space-y-4">
              <input type="text" placeholder="Name *" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} required />
              <input type="text" placeholder="Title" value={contactForm.title} onChange={e => setContactForm({ ...contactForm, title: e.target.value })} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
              <input type="email" placeholder="Email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
              <input type="text" placeholder="Phone" value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
              <textarea placeholder="Notes" value={contactForm.notes} onChange={e => setContactForm({ ...contactForm, notes: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none resize-none" style={inputStyle} />
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowContact(false); setEditContact(null); }} className="px-4 py-2 text-sm rounded-lg" style={{ color: '#8b8b9e' }}>Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  {saving ? 'Saving...' : editContact ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
