'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, getAccessToken } from '@/lib/auth';

interface Automation {
  id: string;
  name: string;
  prompt: string;
  schedule_type: string;
  schedule_config: Record<string, any>;
  delivery: string;
  active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatSchedule(type: string, config: Record<string, any>): string {
  const time = config?.time || '09:00';
  switch (type) {
    case 'daily': return `Daily at ${time}`;
    case 'weekly': return `Weekly on ${config?.day || 'Monday'} at ${time}`;
    case 'custom': return config?.cron || `Custom schedule`;
    default: return type;
  }
}

const DELIVERY_LABELS: Record<string, { label: string; iconPath: string }> = {
  web: { label: 'Web', iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z' },
  telegram: { label: 'Telegram', iconPath: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
  discord: { label: 'Discord', iconPath: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
};

export default function AutomationsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [automations, setAutomations] = useState<Automation[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formScheduleType, setFormScheduleType] = useState('daily');
  const [formTime, setFormTime] = useState('09:00');
  const [formDay, setFormDay] = useState('Monday');
  const [formDelivery, setFormDelivery] = useState('web');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) { router.push('/login'); return; }
      setAuthChecked(true);
      const token = await getAccessToken();
      setAccessToken(token);
      try {
        const res = await fetch('/api/automations', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setAutomations(data.automations || []);
        }
      } catch {}
      setLoading(false);
    });
  }, [router]);

  const handleCreate = async () => {
    if (!formName.trim() || !formPrompt.trim() || !accessToken) return;
    setSaving(true);
    try {
      const scheduleConfig: Record<string, any> = { time: formTime };
      if (formScheduleType === 'weekly') scheduleConfig.day = formDay;
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: formName.trim(),
          prompt: formPrompt.trim(),
          schedule_type: formScheduleType,
          schedule_config: scheduleConfig,
          delivery: formDelivery,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAutomations((prev) => [data.automation, ...prev]);
        setFormName(''); setFormPrompt(''); setFormScheduleType('daily');
        setFormTime('09:00'); setFormDay('Monday'); setFormDelivery('web');
        setShowForm(false);
      }
    } catch {}
    setSaving(false);
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    if (!accessToken) return;
    setTogglingId(id);
    try {
      const res = await fetch('/api/automations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id, active: !currentActive }),
      });
      if (res.ok) {
        setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, active: !currentActive } : a)));
      }
    } catch {}
    setTogglingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/automations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setAutomations((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {}
    setDeletingId(null);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: 'rgba(10,10,15,0.85)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-lg font-bold" style={{ color: '#f0f0f5' }}>Pulsed</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/search" className="text-sm transition-colors hover:text-[#f0f0f5]" style={{ color: '#8b8b9e' }}>Research</Link>
            <Link href="/agent" className="text-sm transition-colors hover:text-[#f0f0f5]" style={{ color: '#8b8b9e' }}>Agent</Link>
            <Link href="/workspace" className="text-sm font-semibold text-indigo-400">Workspace</Link>
            <Link href="/history" className="text-sm transition-colors hover:text-[#f0f0f5]" style={{ color: '#8b8b9e' }}>History</Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: '#6b6b80' }}>
            <Link href="/workspace" className="hover:text-[#8b8b9e] transition-colors">Workspace</Link>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span style={{ color: '#8b8b9e' }}>Automations</span>
          </div>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#f0f0f5' }}>Automations</h1>
              <p className="text-sm mt-1" style={{ color: '#8b8b9e' }}>Scheduled tasks your agent runs automatically.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-all shadow-sm"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {showForm ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  Cancel
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Create Automation
                </>
              )}
            </button>
          </div>

          {/* Create Form */}
          {showForm && (
            <div className="rounded-xl p-6 mb-8" style={{ background: 'rgba(17,17,24,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-base font-semibold mb-5" style={{ color: '#f0f0f5' }}>New Automation</h3>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b8b9e' }}>Task name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Daily competitor scan"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all focus:border-indigo-500"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f0f0f5' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b8b9e' }}>What should your agent do?</label>
                  <textarea
                    value={formPrompt}
                    onChange={(e) => setFormPrompt(e.target.value)}
                    placeholder="e.g. Research and summarize the latest news about my top 3 competitors"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all resize-none focus:border-indigo-500"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f0f0f5' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b8b9e' }}>Schedule</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center rounded-xl p-0.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {['daily', 'weekly', 'custom'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormScheduleType(type)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize`}
                          style={formScheduleType === type
                            ? { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }
                            : { color: '#6b6b80' }
                          }
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    {formScheduleType === 'weekly' && (
                      <select
                        value={formDay}
                        onChange={(e) => setFormDay(e.target.value)}
                        className="px-3 py-2 rounded-xl text-sm outline-none transition-all focus:border-indigo-500"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f0f0f5' }}
                      >
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: '#6b6b80' }}>at</span>
                      <input
                        type="time"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="px-3 py-2 rounded-xl text-sm outline-none transition-all focus:border-indigo-500"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f0f0f5' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b8b9e' }}>Deliver results via</label>
                  <div className="flex gap-3">
                    {Object.entries(DELIVERY_LABELS).map(([key, { label, iconPath }]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormDelivery(key)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                        style={formDelivery === key
                          ? { border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }
                          : { border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#8b8b9e' }
                        }
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={iconPath} />
                        </svg>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 text-sm font-medium transition-colors"
                    style={{ color: '#6b6b80' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!formName.trim() || !formPrompt.trim() || saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Automation'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Automations List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-xl p-6 animate-pulse" style={{ background: 'rgba(17,17,24,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}></div>
                    <div className="flex-1">
                      <div className="h-4 w-1/3 rounded mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}></div>
                      <div className="h-3 w-2/3 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : automations.length === 0 && !showForm ? (
            <div className="rounded-xl p-16 text-center" style={{ background: 'rgba(17,17,24,0.8)', border: '1px dashed rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#f0f0f5' }}>No automations yet</h3>
              <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: '#8b8b9e' }}>
                Set up your first scheduled task. Your agent can scan competitors, generate daily briefings, monitor trends, and more — all on autopilot.
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create Your First Automation
              </button>

              {/* Inspiration cards */}
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
                {[
                  { title: 'Competitor Scan', desc: 'Daily check on competitor updates', iconPath: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
                  { title: 'Morning Briefing', desc: 'Industry news summary at 8am', iconPath: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2' },
                  { title: 'Weekly Report', desc: 'Market trends every Monday', iconPath: 'M18 20V10M12 20V4M6 20v-6' },
                ].map((card) => (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => { setShowForm(true); setFormName(card.title); setFormPrompt(card.desc); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all text-center group"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={card.iconPath} />
                    </svg>
                    <span className="text-xs font-semibold" style={{ color: '#f0f0f5' }}>{card.title}</span>
                    <span className="text-[11px]" style={{ color: '#6b6b80' }}>{card.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {automations.map((auto) => (
                <div
                  key={auto.id}
                  className="rounded-xl p-5 transition-all"
                  style={{ background: 'rgba(17,17,24,0.8)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}
                      style={auto.active
                        ? { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }
                      }
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={auto.active ? '#6366f1' : '#6b6b80'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-semibold truncate" style={{ color: '#f0f0f5' }}>{auto.name}</h3>
                        <span className="text-[11px] font-medium rounded-full px-2 py-0.5 shrink-0"
                          style={auto.active
                            ? { background: 'rgba(34,197,94,0.15)', color: '#4ade80' }
                            : { background: 'rgba(255,255,255,0.06)', color: '#6b6b80' }
                          }
                        >
                          {auto.active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-sm mb-3 line-clamp-2" style={{ color: '#8b8b9e' }}>{auto.prompt}</p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]" style={{ color: '#6b6b80' }}>
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                          </svg>
                          {formatSchedule(auto.schedule_type, auto.schedule_config)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d={DELIVERY_LABELS[auto.delivery]?.iconPath || DELIVERY_LABELS.web.iconPath} />
                          </svg>
                          {DELIVERY_LABELS[auto.delivery]?.label || auto.delivery}
                        </span>
                        {auto.last_run_at && <span>Last run: {formatDate(auto.last_run_at)}</span>}
                        {auto.next_run_at && <span>Next: {formatDate(auto.next_run_at)}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggle(auto.id, auto.active)}
                        disabled={togglingId === auto.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${togglingId === auto.id ? 'opacity-50' : ''}`}
                        style={{ background: auto.active ? '#6366f1' : 'rgba(255,255,255,0.1)' }}
                        title={auto.active ? 'Pause automation' : 'Activate automation'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${auto.active ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => { if (confirm('Delete this automation?')) handleDelete(auto.id); }}
                        disabled={deletingId === auto.id}
                        className="p-2 rounded-lg transition-all disabled:opacity-50"
                        style={{ color: '#6b6b80' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#6b6b80'; e.currentTarget.style.background = 'transparent'; }}
                        title="Delete automation"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
