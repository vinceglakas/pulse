'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSession, getAccessToken } from '@/lib/auth'

interface Monitor {
  id: string; topic: string; keywords: string[]; frequency: string;
  alert_threshold: number; enabled: boolean; last_checked?: string; last_results?: any; created_at: string;
}

interface Notification {
  id: string; title: string; body?: string; read: boolean; created_at: string;
  monitors?: { topic: string } | null;
}

export default function MonitorsPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newMonitor, setNewMonitor] = useState({ topic: '', keywords: '', frequency: 'daily', alert_threshold: 3 })
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState<string | null>(null)

  const headers = (t: string | null) => ({
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  })

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) { router.push('/login'); return }
      const t = await getAccessToken()
      setToken(t)
      if (t) await Promise.all([fetchMonitors(t), fetchNotifications(t)])
      setLoading(false)
    })
  }, [router])

  async function fetchMonitors(t?: string | null) {
    const tk = t ?? token
    const res = await fetch('/api/monitors', { headers: headers(tk) })
    const data = await res.json()
    if (data.monitors) setMonitors(data.monitors)
  }

  async function fetchNotifications(t?: string | null) {
    const tk = t ?? token
    const res = await fetch('/api/notifications', { headers: headers(tk) })
    const data = await res.json()
    if (data.notifications) setNotifications(data.notifications)
  }

  async function addMonitor() {
    await fetch('/api/monitors', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        topic: newMonitor.topic,
        keywords: newMonitor.keywords.split(',').map(k => k.trim()).filter(Boolean),
        frequency: newMonitor.frequency,
        alert_threshold: newMonitor.alert_threshold,
      }),
    })
    setNewMonitor({ topic: '', keywords: '', frequency: 'daily', alert_threshold: 3 })
    setShowAdd(false); fetchMonitors()
  }

  async function toggleMonitor(id: string, enabled: boolean) {
    await fetch('/api/monitors', { method: 'PUT', headers: headers(token), body: JSON.stringify({ id, enabled }) })
    fetchMonitors()
  }

  async function deleteMonitor(id: string) {
    await fetch(`/api/monitors?id=${id}`, { method: 'DELETE', headers: headers(token) }); fetchMonitors()
  }

  async function checkNow(id: string) {
    setChecking(id)
    try {
      await fetch('/api/monitors/check', {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({ monitorId: id }),
      })
      await Promise.all([fetchMonitors(), fetchNotifications()])
    } finally { setChecking(null) }
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: headers(token),
      body: JSON.stringify({ all: true }),
    })
    fetchNotifications()
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <span className="text-lg font-bold" style={{ color: '#f0f0f5' }}>Pulsed</span>
              <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span></span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/agent" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>Agent</Link>
              <Link href="/search" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>Research</Link>
              <Link href="/dashboard/crm" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>CRM</Link>
              <span className="text-sm font-medium text-indigo-400">Monitors</span>
              <Link href="/workspace" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>Workspace</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Monitors</h1>
            <p className="text-sm mt-1" style={{ color: '#8b8b9e' }}>Track topics across the web. Get alerts when something new breaks.</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition">+ New Monitor</button>
        </div>

        {/* Active Monitors */}
        <div className="space-y-3 mb-10">
          {monitors.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-lg mb-2">🔍</p>
              <p className="font-medium mb-1">No monitors yet</p>
              <p className="text-sm mb-4" style={{ color: '#6b6b80' }}>Set up a monitor to track any topic, competitor, or trend.</p>
              <p className="text-sm" style={{ color: '#8b8b9e' }}>Or ask your <Link href="/agent" className="text-indigo-400 hover:text-indigo-300">agent</Link>: &quot;Track AI regulation news for me&quot;</p>
            </div>
          ) : monitors.map(m => (
            <div key={m.id} className="rounded-xl p-5" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{m.topic}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {m.enabled ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  {m.keywords?.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {m.keywords.map((k, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#6366f122', color: '#818cf8' }}>{k}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs mt-2" style={{ color: '#6b6b80' }}>
                    Checks {m.frequency} · threshold: {m.alert_threshold} · {m.last_checked ? `last checked ${new Date(m.last_checked).toLocaleString()}` : 'never checked'}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => checkNow(m.id)} disabled={checking === m.id} className="text-xs px-3 py-1.5 rounded-lg font-medium transition" style={{ background: '#6366f122', color: '#818cf8' }}>
                    {checking === m.id ? '⏳ Checking...' : '🔄 Check Now'}
                  </button>
                  <button onClick={() => toggleMonitor(m.id, !m.enabled)} className="text-xs px-3 py-1.5 rounded-lg font-medium transition" style={{ background: m.enabled ? '#ef444422' : '#22c55e22', color: m.enabled ? '#ef4444' : '#22c55e' }}>
                    {m.enabled ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => deleteMonitor(m.id)} className="text-xs text-red-400/60 hover:text-red-400 transition">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Recent Alerts {unreadCount > 0 && <span className="text-sm font-normal text-indigo-400 ml-2">{unreadCount} unread</span>}</h2>
          {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300 transition">Mark all read</button>}
        </div>
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-center py-8" style={{ color: '#6b6b80' }}>No alerts yet. Monitors will generate alerts when new content is found.</p>
          ) : notifications.slice(0, 30).map(n => (
            <div key={n.id} className="rounded-lg p-4" style={{ background: n.read ? '#0a0a0f' : '#111118', border: `1px solid ${n.read ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.15)'}` }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                    <p className="text-sm font-medium">{n.title}</p>
                  </div>
                  {n.body && <p className="text-xs mt-1 whitespace-pre-line" style={{ color: '#8b8b9e' }}>{n.body}</p>}
                  <p className="text-xs mt-1" style={{ color: '#6b6b80' }}>{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {n.monitors?.topic && <span className="text-xs px-2 py-0.5 rounded-full shrink-0 ml-2" style={{ background: '#6366f122', color: '#818cf8' }}>{n.monitors.topic}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Add Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
            <div className="rounded-xl p-6 w-full max-w-md" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-4">New Monitor</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#6b6b80' }}>What to track</label>
                  <input placeholder="e.g. 'AI regulation' or 'competitor name'" value={newMonitor.topic} onChange={e => setNewMonitor({ ...newMonitor, topic: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#6b6b80' }}>Keywords (comma separated)</label>
                  <input placeholder="e.g. 'AI bill, safety, governance'" value={newMonitor.keywords} onChange={e => setNewMonitor({ ...newMonitor, keywords: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: '#6b6b80' }}>Check frequency</label>
                    <select value={newMonitor.frequency} onChange={e => setNewMonitor({ ...newMonitor, frequency: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: '#6b6b80' }}>Alert threshold</label>
                    <select value={newMonitor.alert_threshold} onChange={e => setNewMonitor({ ...newMonitor, alert_threshold: Number(e.target.value) })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}>
                      {[1,2,3,5,7,10].map(n => <option key={n} value={n}>{n}+ new results</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: '#8b8b9e' }}>Cancel</button>
                  <button onClick={addMonitor} disabled={!newMonitor.topic} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium disabled:opacity-40 transition">Create Monitor</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
