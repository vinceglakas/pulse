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
  if (!dateStr) return '—';
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

const DELIVERY_LABELS: Record<string, { label: string; icon: string }> = {
  web: { label: 'Web', icon: '🌐' },
  telegram: { label: 'Telegram', icon: '✈️' },
  discord: { label: 'Discord', icon: '💬' },
};

export default function AutomationsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [automations, setAutomations] = useState<Automation[]>([]);

  // Create form state
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
      if (!session) {
        router.push('/login');
        return;
      }
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
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
        setFormName('');
        setFormPrompt('');
        setFormScheduleType('daily');
        setFormTime('09:00');
        setFormDay('Monday');
        setFormDelivery('web');
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id, active: !currentActive }),
      });

      if (res.ok) {
        setAutomations((prev) =>
          prev.map((a) => (a.id === id ? { ...a, active: !currentActive } : a))
        );
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-gray-900">Pulsed</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/search" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Research</Link>
            <Link href="/agent" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Agent</Link>
            <Link href="/workspace" className="text-sm font-semibold text-indigo-600">Workspace</Link>
            <Link href="/history" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">History</Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          {/* Breadcrumb + Header */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link href="/workspace" className="hover:text-gray-600 transition-colors">Workspace</Link>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span className="text-gray-600">Automations</span>
          </div>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
              <p className="text-sm text-gray-500 mt-1">Scheduled tasks your agent runs automatically.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 transition-all shadow-sm"
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
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-5">New Automation</h3>

              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Task name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Daily competitor scan"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>

                {/* Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">What should your agent do?</label>
                  <textarea
                    value={formPrompt}
                    onChange={(e) => setFormPrompt(e.target.value)}
                    placeholder="e.g. Research and summarize the latest news about my top 3 competitors: Acme Corp, Beta Inc, and Gamma Labs"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                  />
                </div>

                {/* Schedule */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Schedule</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
                      {['daily', 'weekly', 'custom'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormScheduleType(type)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                            formScheduleType === type
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    {formScheduleType === 'weekly' && (
                      <select
                        value={formDay}
                        onChange={(e) => setFormDay(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                      >
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">at</span>
                      <input
                        type="time"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Deliver results via</label>
                  <div className="flex gap-3">
                    {Object.entries(DELIVERY_LABELS).map(([key, { label, icon }]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormDelivery(key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          formDelivery === key
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span>{icon}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!formName.trim() || !formPrompt.trim() || saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
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
                <div key={n} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 w-1/3 bg-gray-100 rounded mb-2"></div>
                      <div className="h-3 w-2/3 bg-gray-100 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : automations.length === 0 && !showForm ? (
            <div className="bg-white border border-gray-200 border-dashed rounded-xl p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No automations yet</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                Set up your first scheduled task. Your agent can scan competitors, generate daily briefings, monitor trends, and more — all on autopilot.
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 transition-opacity shadow-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create Your First Automation
              </button>

              {/* Inspiration cards */}
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
                {[
                  { emoji: '🔍', title: 'Competitor Scan', desc: 'Daily check on competitor updates' },
                  { emoji: '📰', title: 'Morning Briefing', desc: 'Industry news summary at 8am' },
                  { emoji: '📊', title: 'Weekly Report', desc: 'Market trends every Monday' },
                ].map((card) => (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => {
                      setShowForm(true);
                      setFormName(card.title);
                      setFormPrompt(card.desc);
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 transition-all text-center group"
                  >
                    <span className="text-2xl">{card.emoji}</span>
                    <span className="text-xs font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{card.title}</span>
                    <span className="text-[11px] text-gray-500">{card.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {automations.map((auto) => (
                <div
                  key={auto.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      auto.active ? 'bg-gradient-to-br from-indigo-50 to-violet-50' : 'bg-gray-100'
                    }`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={auto.active ? '#6366f1' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{auto.name}</h3>
                        <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 shrink-0 ${
                          auto.active
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {auto.active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{auto.prompt}</p>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                          </svg>
                          {formatSchedule(auto.schedule_type, auto.schedule_config)}
                        </span>
                        <span className="flex items-center gap-1">
                          {DELIVERY_LABELS[auto.delivery]?.icon || '🌐'} {DELIVERY_LABELS[auto.delivery]?.label || auto.delivery}
                        </span>
                        {auto.last_run_at && (
                          <span>Last run: {formatDate(auto.last_run_at)}</span>
                        )}
                        {auto.next_run_at && (
                          <span>Next: {formatDate(auto.next_run_at)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggle(auto.id, auto.active)}
                        disabled={togglingId === auto.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                          auto.active ? 'bg-indigo-600' : 'bg-gray-300'
                        } ${togglingId === auto.id ? 'opacity-50' : ''}`}
                        title={auto.active ? 'Pause automation' : 'Activate automation'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                            auto.active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Delete this automation?')) {
                            handleDelete(auto.id);
                          }
                        }}
                        disabled={deletingId === auto.id}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
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
