'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSession, getAccessToken } from '@/lib/auth';

interface Brief { id: string; topic: string; created_at: string }
interface AgentMsg { id: string; role: string; content: string; created_at: string }
interface Deal { id: string; title: string; value: number; stage: string }
interface Monitor { id: string; topic: string; enabled: boolean; last_checked?: string }
interface Notification { id: string; title: string; body?: string; read: boolean; created_at: string }

export default function DashboardPage() {
  return <Suspense><DashboardInner /></Suspense>;
}

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutSuccess = searchParams.get('checkout') === 'success';
  const pendingPlan = searchParams.get('pending_plan');
  const [showBanner, setShowBanner] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [plan, setPlan] = useState('free');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [messages, setMessages] = useState<AgentMsg[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) { router.push('/login'); return; }
      setAuthChecked(true);
      const t = await getAccessToken();
      setToken(t);
      const h = (tk: string | null): Record<string, string> => tk ? { Authorization: `Bearer ${tk}` } : {};

      if (checkoutSuccess) {
        setShowBanner(true);
        window.history.replaceState({}, '', '/dashboard');
        setTimeout(() => setShowBanner(false), 8000);
      }

      if (pendingPlan && t) {
        try {
          const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', ...h(t) }, body: JSON.stringify({ plan: pendingPlan }) });
          const data = await res.json();
          if (data.url) { window.location.href = data.url; return; }
        } catch {}
      }

      // Parallel fetch everything
      const results = await Promise.all([
        fetch('/api/profile', { headers: h(t) }).then(r => r.json()).catch(() => null),
        fetch('/api/briefs?limit=5', { headers: h(t) }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/agent/history?limit=5&sessionKey=default', { headers: h(t) }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/crm/deals', { headers: h(t) }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/monitors', { headers: h(t) }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/notifications?limit=5&unread=true', { headers: h(t) }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/keys', { headers: h(t) }).then(r => r.json()).catch(() => null),
      ]);
      
      const [profileRes, briefsRes, historyRes, dealsRes, monitorsRes, notifRes, keysRes] = results as any[];

      setPlan(profileRes?.plan || 'free');
      setEmail(profileRes?.email || '');
      setName(profileRes?.name || profileRes?.full_name || '');
      setBriefs(Array.isArray(briefsRes) ? briefsRes : briefsRes?.briefs || []);
      setMessages(historyRes?.messages || []);
      setDeals(dealsRes?.deals || []);
      setMonitors(monitorsRes?.monitors || []);
      setNotifications(notifRes?.notifications || []);
      const keys = keysRes?.keys || keysRes;
      setHasApiKey(Array.isArray(keys) && keys.length > 0);
    });
  }, [router]);

  if (!authChecked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const glass = { background: 'rgba(17,17,24,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)' };
  const activeDeals = deals.filter(d => !['won', 'lost'].includes(d.stage));
  const pipelineValue = activeDeals.reduce((s, d) => s + (d.value || 0), 0);
  const wonValue = deals.filter(d => d.stage === 'won').reduce((s, d) => s + (d.value || 0), 0);
  const activeMonitors = monitors.filter(m => m.enabled).length;
  const unreadNotifs = notifications.filter(n => !n.read).length;
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      {showBanner && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center p-4">
          <div className="rounded-xl px-6 py-3 flex items-center gap-3 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(99,102,241,0.15))', border: '1px solid rgba(34,197,94,0.3)' }}>
            <span className="text-green-400 text-lg">🎉</span>
            <span style={{ color: '#f0f0f5' }} className="font-medium">Welcome to Pulsed Pro! Unlimited research and full agent access.</span>
            <button onClick={() => setShowBanner(false)} className="ml-2 text-white/40 hover:text-white/80">✕</button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 50%)' }} />

      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-lg font-bold" style={{ color: '#f0f0f5' }}>Pulsed</span>
              <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span></span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/agent" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>Agent</Link>
              <Link href="/search" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>Research</Link>
              <Link href="/dashboard/crm" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>CRM</Link>
              <Link href="/dashboard/monitors" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>Monitors</Link>
              <Link href="/workspace" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>Workspace</Link>
              <span className="text-sm font-medium text-indigo-400">Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {unreadNotifs > 0 && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">{unreadNotifs} alert{unreadNotifs > 1 ? 's' : ''}</span>}
            <Link href="/settings/keys" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>Settings</Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#f0f0f5' }}>{greeting}{name ? `, ${name.split(' ')[0]}` : ''}</h1>
          <p className="mt-1 text-sm" style={{ color: '#8b8b9e' }}>Here&apos;s what&apos;s happening across your workspace.</p>
        </div>

        {/* Setup prompt for new users */}
        {!hasApiKey && (
          <div className="rounded-2xl p-6 mb-8" style={{ ...glass, border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <span className="text-xl">🔑</span>
              </div>
              <div className="flex-1">
                <p className="font-medium" style={{ color: '#f0f0f5' }}>Add your API key to activate your agent</p>
                <p className="text-sm" style={{ color: '#8b8b9e' }}>Your agent needs an LLM key (OpenAI, Anthropic, Google, or Moonshot) to start working for you.</p>
              </div>
              <Link href="/settings/keys" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition shrink-0">Add API Key</Link>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Research Briefs', value: briefs.length, icon: '🔍', href: '/history' },
            { label: 'Pipeline Value', value: `$${pipelineValue.toLocaleString()}`, icon: '🎯', href: '/dashboard/crm' },
            { label: 'Active Monitors', value: activeMonitors, icon: '📡', href: '/dashboard/monitors' },
            { label: 'Won Revenue', value: `$${wonValue.toLocaleString()}`, icon: '🏆', href: '/dashboard/crm' },
          ].map((stat, i) => (
            <Link key={i} href={stat.href} className="rounded-xl p-4 transition-all hover:scale-[1.02]" style={glass}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#6b6b80' }}>{stat.label}</p>
                <span className="text-sm">{stat.icon}</span>
              </div>
              <p className="text-xl font-bold mt-2" style={{ color: '#f0f0f5' }}>{stat.value}</p>
            </Link>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Talk to Agent — Primary CTA */}
          <Link href="/agent" className="md:col-span-2 rounded-2xl p-8 transition-all hover:scale-[1.01] group" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1" style={{ color: '#f0f0f5' }}>Talk to your agent</h2>
                <p className="text-sm mb-4" style={{ color: '#8b8b9e' }}>Research anything, build tools, manage your CRM, track competitors, generate content — all through conversation.</p>
                <div className="flex flex-wrap gap-2">
                  {['Research my competitors', 'Build me a CRM', 'Track AI news', 'Draft a LinkedIn post'].map(s => (
                    <span key={s} className="text-xs px-3 py-1.5 rounded-full transition" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </Link>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Link href="/search" className="rounded-xl p-4 flex items-center gap-3 transition-all hover:scale-[1.02]" style={glass}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>🔍</div>
              <div><p className="text-sm font-medium" style={{ color: '#f0f0f5' }}>New Research</p><p className="text-xs" style={{ color: '#6b6b80' }}>Search any topic</p></div>
            </Link>
            <Link href="/dashboard/crm" className="rounded-xl p-4 flex items-center gap-3 transition-all hover:scale-[1.02]" style={glass}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>👥</div>
              <div><p className="text-sm font-medium" style={{ color: '#f0f0f5' }}>CRM</p><p className="text-xs" style={{ color: '#6b6b80' }}>{activeDeals.length} active deal{activeDeals.length !== 1 ? 's' : ''}</p></div>
            </Link>
            <Link href="/workspace" className="rounded-xl p-4 flex items-center gap-3 transition-all hover:scale-[1.02]" style={glass}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>📁</div>
              <div><p className="text-sm font-medium" style={{ color: '#f0f0f5' }}>Workspace</p><p className="text-xs" style={{ color: '#6b6b80' }}>Tables, boards, docs</p></div>
            </Link>
          </div>
        </div>

        {/* Bottom Grid: Recent Activity */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Recent Briefs */}
          <div className="rounded-xl p-5" style={glass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: '#f0f0f5' }}>Recent Research</h3>
              <Link href="/history" className="text-xs hover:text-indigo-400 transition" style={{ color: '#6b6b80' }}>View all</Link>
            </div>
            {briefs.length === 0 ? (
              <p className="text-sm py-4" style={{ color: '#6b6b80' }}>No research yet. <Link href="/search" className="text-indigo-400">Start here</Link> or ask your <Link href="/agent" className="text-indigo-400">agent</Link>.</p>
            ) : briefs.map(b => (
              <Link key={b.id} href={`/brief/${b.id}`} className="block py-2 px-2 -mx-2 rounded-lg hover:bg-white/[0.03] transition">
                <p className="text-sm font-medium truncate" style={{ color: '#f0f0f5' }}>{b.topic}</p>
                <p className="text-xs" style={{ color: '#6b6b80' }}>{new Date(b.created_at).toLocaleDateString()}</p>
              </Link>
            ))}
          </div>

          {/* Agent Activity */}
          <div className="rounded-xl p-5" style={glass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: '#f0f0f5' }}>Agent Activity</h3>
              <Link href="/agent" className="text-xs hover:text-indigo-400 transition" style={{ color: '#6b6b80' }}>Open chat</Link>
            </div>
            {messages.length === 0 ? (
              <p className="text-sm py-4" style={{ color: '#6b6b80' }}>No conversations yet. <Link href="/agent" className="text-indigo-400">Chat with your agent</Link></p>
            ) : messages.slice(-5).map(m => (
              <div key={m.id} className="py-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-medium ${m.role === 'user' ? '' : 'text-indigo-400'}`} style={m.role === 'user' ? { color: '#6b6b80' } : {}}>{m.role === 'user' ? 'You' : 'Agent'}</span>
                  <span className="text-xs" style={{ color: '#6b6b80' }}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm line-clamp-2" style={{ color: '#8b8b9e' }}>{m.content}</p>
              </div>
            ))}
          </div>

          {/* Alerts & Monitors */}
          <div className="rounded-xl p-5" style={glass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: '#f0f0f5' }}>Alerts {unreadNotifs > 0 && <span className="text-xs text-indigo-400 ml-1">{unreadNotifs} new</span>}</h3>
              <Link href="/dashboard/monitors" className="text-xs hover:text-indigo-400 transition" style={{ color: '#6b6b80' }}>Manage</Link>
            </div>
            {notifications.length === 0 && monitors.length === 0 ? (
              <p className="text-sm py-4" style={{ color: '#6b6b80' }}>No active monitors. <Link href="/dashboard/monitors" className="text-indigo-400">Set one up</Link> or ask your agent to track a topic.</p>
            ) : (
              <>
                {notifications.slice(0, 3).map(n => (
                  <div key={n.id} className="py-2">
                    <div className="flex items-center gap-1.5">
                      {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
                      <p className="text-sm font-medium truncate" style={{ color: '#f0f0f5' }}>{n.title}</p>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#6b6b80' }}>{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {notifications.length === 0 && monitors.length > 0 && (
                  <div className="space-y-2">
                    {monitors.slice(0, 3).map(m => (
                      <div key={m.id} className="flex items-center gap-2 py-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${m.enabled ? 'bg-green-400' : 'bg-red-400'}`} />
                        <p className="text-sm" style={{ color: '#8b8b9e' }}>{m.topic}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pipeline Overview */}
        {deals.length > 0 && (
          <div className="mt-6 rounded-xl p-5" style={glass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: '#f0f0f5' }}>Deal Pipeline</h3>
              <Link href="/dashboard/crm" className="text-xs hover:text-indigo-400 transition" style={{ color: '#6b6b80' }}>Open CRM</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto">
              {['lead', 'qualified', 'proposal', 'negotiation', 'won'].map(stage => {
                const stageDeals = deals.filter(d => d.stage === stage);
                const total = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
                const colors: Record<string, string> = { lead: '#6366f1', qualified: '#8b5cf6', proposal: '#a855f7', negotiation: '#f59e0b', won: '#22c55e' };
                return (
                  <div key={stage} className="flex-1 min-w-[120px] rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: colors[stage] }} />
                      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#6b6b80' }}>{stage}</span>
                    </div>
                    <p className="text-sm font-bold" style={{ color: colors[stage] }}>${total.toLocaleString()}</p>
                    <p className="text-xs" style={{ color: '#6b6b80' }}>{stageDeals.length} deal{stageDeals.length !== 1 ? 's' : ''}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
