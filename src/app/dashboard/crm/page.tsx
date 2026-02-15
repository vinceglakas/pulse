'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSession, getAccessToken } from '@/lib/auth'

const STAGES = [
  { key: 'lead', label: 'Lead', color: '#6366f1' },
  { key: 'qualified', label: 'Qualified', color: '#8b5cf6' },
  { key: 'proposal', label: 'Proposal', color: '#a855f7' },
  { key: 'negotiation', label: 'Negotiation', color: '#f59e0b' },
  { key: 'won', label: 'Won', color: '#22c55e' },
  { key: 'lost', label: 'Lost', color: '#ef4444' },
]

interface Deal {
  id: string; title: string; value: number; stage: string; probability: number;
  contact_id?: string; company_id?: string; notes?: string; created_at?: string;
  contacts?: { name: string; email?: string; company?: string } | null;
  companies?: { name: string } | null;
}

interface Contact {
  id: string; name: string; email?: string; phone?: string; company?: string;
  title?: string; tags?: string[]; notes?: string; last_contacted?: string;
}

interface Activity {
  id: string; type: string; subject?: string; body?: string; created_at: string;
  contact_id?: string; deal_id?: string;
  contacts?: { name: string } | null;
}

export default function CRMPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [tab, setTab] = useState<'pipeline' | 'contacts' | 'activity'>('pipeline')
  const [showAddDeal, setShowAddDeal] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showLogActivity, setShowLogActivity] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [newDeal, setNewDeal] = useState({ title: '', value: 0, stage: 'lead', probability: 10, notes: '', contact_id: '' })
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', company: '', title: '', notes: '' })
  const [newActivity, setNewActivity] = useState({ type: 'note', subject: '', body: '', contact_id: '', deal_id: '' })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dragDealId, setDragDealId] = useState<string | null>(null)

  const headers = (t: string | null) => ({
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  })

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) { router.push('/login'); return }
      const t = await getAccessToken()
      setToken(t)
      if (t) {
        await Promise.all([fetchDeals(t), fetchContacts(t), fetchActivities(t)])
      }
      setLoading(false)
    })
  }, [router])

  async function fetchDeals(t?: string | null) {
    const tk = t ?? token
    const res = await fetch('/api/crm/deals', { headers: headers(tk) })
    const data = await res.json()
    if (data.deals) setDeals(data.deals)
  }

  async function fetchContacts(t?: string | null, q?: string) {
    const tk = t ?? token
    const searchQ = q ?? search
    const res = await fetch(`/api/crm/contacts${searchQ ? `?search=${searchQ}` : ''}`, { headers: headers(tk) })
    const data = await res.json()
    if (data.contacts) setContacts(data.contacts)
  }

  async function fetchActivities(t?: string | null) {
    const tk = t ?? token
    const res = await fetch('/api/crm/activities', { headers: headers(tk) })
    const data = await res.json()
    if (data.activities) setActivities(data.activities)
  }

  useEffect(() => { if (token) fetchContacts(token, search) }, [search])

  async function addDeal() {
    const body: any = { ...newDeal }
    if (!body.contact_id) delete body.contact_id
    await fetch('/api/crm/deals', { method: 'POST', headers: headers(token), body: JSON.stringify(body) })
    setNewDeal({ title: '', value: 0, stage: 'lead', probability: 10, notes: '', contact_id: '' }); setShowAddDeal(false); fetchDeals()
  }

  async function addContact() {
    await fetch('/api/crm/contacts', { method: 'POST', headers: headers(token), body: JSON.stringify(newContact) })
    setNewContact({ name: '', email: '', phone: '', company: '', title: '', notes: '' }); setShowAddContact(false); fetchContacts()
  }

  async function logActivity() {
    const body: any = { ...newActivity }
    if (!body.contact_id) delete body.contact_id
    if (!body.deal_id) delete body.deal_id
    await fetch('/api/crm/activities', { method: 'POST', headers: headers(token), body: JSON.stringify(body) })
    setNewActivity({ type: 'note', subject: '', body: '', contact_id: '', deal_id: '' }); setShowLogActivity(false); fetchActivities()
  }

  async function moveDeal(id: string, stage: string) {
    const deal = deals.find(d => d.id === id)
    const prob = stage === 'won' ? 100 : stage === 'lost' ? 0 : (deal?.probability || 10)
    await fetch('/api/crm/deals', { method: 'PUT', headers: headers(token), body: JSON.stringify({ id, stage, probability: prob }) })
    fetchDeals()
  }

  async function deleteDeal(id: string) {
    await fetch(`/api/crm/deals?id=${id}`, { method: 'DELETE', headers: headers(token) }); fetchDeals()
  }

  async function deleteContact(id: string) {
    await fetch(`/api/crm/contacts?id=${id}`, { method: 'DELETE', headers: headers(token) }); fetchContacts()
  }

  const totalValue = deals.filter(d => d.stage !== 'lost').reduce((s, d) => s + (d.value || 0), 0)
  const wonValue = deals.filter(d => d.stage === 'won').reduce((s, d) => s + (d.value || 0), 0)
  const activeDeals = deals.filter(d => !['won', 'lost'].includes(d.stage)).length
  const weightedPipeline = deals.filter(d => !['won', 'lost'].includes(d.stage)).reduce((s, d) => s + (d.value || 0) * ((d.probability || 0) / 100), 0)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <span className="text-lg font-bold" style={{ color: '#f0f0f5' }}>Pulsed</span>
              <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span></span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/agent" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>Agent</Link>
              <Link href="/search" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>Research</Link>
              <span className="text-sm font-medium text-indigo-400">CRM</span>
              <Link href="/dashboard/monitors" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>Monitors</Link>
              <Link href="/workspace" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>Workspace</Link>
            </div>
          </div>
          <Link href="/settings/keys" className="text-sm hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>Settings</Link>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Pipeline Value', value: `$${totalValue.toLocaleString()}`, sub: `${activeDeals} active deals` },
            { label: 'Weighted Pipeline', value: `$${Math.round(weightedPipeline).toLocaleString()}`, sub: 'probability-weighted' },
            { label: 'Won Revenue', value: `$${wonValue.toLocaleString()}`, sub: `${deals.filter(d => d.stage === 'won').length} deals closed` },
            { label: 'Contacts', value: contacts.length.toString(), sub: `${contacts.filter(c => c.last_contacted).length} contacted` },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#6b6b80' }}>{stat.label}</p>
              <p className="text-xl font-bold mt-1">{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#6b6b80' }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs + Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {(['pipeline', 'contacts', 'activity'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-indigo-600 text-white' : 'hover:bg-white/5'}`} style={tab !== t ? { color: '#8b8b9e' } : {}}>
                {t === 'pipeline' ? '🎯 Pipeline' : t === 'contacts' ? '👤 Contacts' : '📋 Activity'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {tab === 'pipeline' && <button onClick={() => setShowAddDeal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition">+ New Deal</button>}
            {tab === 'contacts' && <button onClick={() => setShowAddContact(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition">+ New Contact</button>}
            {tab === 'activity' && <button onClick={() => setShowLogActivity(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition">+ Log Activity</button>}
          </div>
        </div>

        {/* Pipeline Tab */}
        {tab === 'pipeline' && (
          <div className="grid grid-cols-6 gap-3 overflow-x-auto">
            {STAGES.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage.key)
              const stageTotal = stageDeals.reduce((s, d) => s + (d.value || 0), 0)
              return (
                <div
                  key={stage.key}
                  className="rounded-xl p-3 min-h-[400px] transition-colors"
                  style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = stage.color }}
                  onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                  onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; if (dragDealId) moveDeal(dragDealId, stage.key) }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8b8b9e' }}>{stage.label}</span>
                    </div>
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: stage.color + '22', color: stage.color }}>{stageDeals.length}</span>
                  </div>
                  <p className="text-xs mb-3 font-medium" style={{ color: '#6b6b80' }}>${stageTotal.toLocaleString()}</p>
                  <div className="space-y-2">
                    {stageDeals.map(deal => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={() => setDragDealId(deal.id)}
                        onDragEnd={() => setDragDealId(null)}
                        className="rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-indigo-500/30 transition group"
                        style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.06)' }}
                        onClick={() => setSelectedDeal(deal)}
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium truncate flex-1">{deal.title}</p>
                          <button onClick={(e) => { e.stopPropagation(); deleteDeal(deal.id) }} className="text-red-400/0 group-hover:text-red-400/60 hover:!text-red-400 text-xs ml-2 transition">×</button>
                        </div>
                        <p className="text-xs mt-1 font-medium" style={{ color: stage.color }}>${(deal.value || 0).toLocaleString()}</p>
                        {deal.contacts?.name && <p className="text-xs mt-1" style={{ color: '#6b6b80' }}>{deal.contacts.name}</p>}
                        {deal.probability > 0 && <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: '#1a1a24' }}><div className="h-full rounded-full" style={{ width: `${deal.probability}%`, background: stage.color }} /></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Contacts Tab */}
        {tab === 'contacts' && (
          <>
            <div className="mb-4">
              <input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} className="w-full max-w-md px-4 py-2.5 rounded-lg text-sm" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#111118' }}>
                    {['Name', 'Title', 'Company', 'Email', 'Phone', 'Last Contact', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: '#6b6b80' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition cursor-pointer" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }} onClick={() => setSelectedContact(c)}>
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3" style={{ color: '#8b8b9e' }}>{c.title || '—'}</td>
                      <td className="px-4 py-3" style={{ color: '#8b8b9e' }}>{c.company || '—'}</td>
                      <td className="px-4 py-3" style={{ color: '#8b8b9e' }}>{c.email ? <a href={`mailto:${c.email}`} className="hover:text-indigo-400 transition">{c.email}</a> : '—'}</td>
                      <td className="px-4 py-3" style={{ color: '#8b8b9e' }}>{c.phone ? <a href={`tel:${c.phone}`} className="hover:text-indigo-400 transition">{c.phone}</a> : '—'}</td>
                      <td className="px-4 py-3" style={{ color: '#6b6b80' }}>{c.last_contacted ? new Date(c.last_contacted).toLocaleDateString() : 'Never'}</td>
                      <td className="px-4 py-3"><button onClick={(e) => { e.stopPropagation(); deleteContact(c.id) }} className="text-xs text-red-400/60 hover:text-red-400 transition">Delete</button></td>
                    </tr>
                  ))}
                  {contacts.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center" style={{ color: '#6b6b80' }}>
                      No contacts yet. Add one manually or ask your agent: <Link href="/agent" className="text-indigo-400 hover:text-indigo-300">&quot;Add a contact: [name], [company]&quot;</Link>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Activity Tab */}
        {tab === 'activity' && (
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-center py-12" style={{ color: '#6b6b80' }}>No activity logged yet. Log calls, emails, meetings, and notes here.</p>
            ) : activities.map(a => (
              <div key={a.id} className="rounded-xl p-4 flex items-start gap-4" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm" style={{ background: a.type === 'call' ? '#6366f122' : a.type === 'email' ? '#8b5cf622' : a.type === 'meeting' ? '#f59e0b22' : '#22c55e22' }}>
                  {a.type === 'call' ? '📞' : a.type === 'email' ? '✉️' : a.type === 'meeting' ? '🤝' : a.type === 'task' ? '✅' : '📝'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{a.subject || `${a.type.charAt(0).toUpperCase() + a.type.slice(1)}`}</span>
                    {a.contacts?.name && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#6366f122', color: '#818cf8' }}>{a.contacts.name}</span>}
                  </div>
                  {a.body && <p className="text-sm mt-1 whitespace-pre-line" style={{ color: '#8b8b9e' }}>{a.body}</p>}
                  <p className="text-xs mt-1" style={{ color: '#6b6b80' }}>{new Date(a.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Deal Detail Drawer */}
        {selectedDeal && (
          <div className="fixed inset-0 bg-black/60 flex justify-end z-50" onClick={() => setSelectedDeal(null)}>
            <div className="w-full max-w-lg h-full overflow-y-auto" style={{ background: '#111118' }} onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">{selectedDeal.title}</h2>
                  <button onClick={() => setSelectedDeal(null)} className="text-white/40 hover:text-white text-xl">×</button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#6b6b80' }}>Value</p><p className="text-lg font-bold">${(selectedDeal.value || 0).toLocaleString()}</p></div>
                    <div><p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#6b6b80' }}>Stage</p><p className="text-sm font-medium">{STAGES.find(s => s.key === selectedDeal.stage)?.label}</p></div>
                    <div><p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#6b6b80' }}>Probability</p><p className="text-sm">{selectedDeal.probability}%</p></div>
                    <div><p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#6b6b80' }}>Contact</p><p className="text-sm">{selectedDeal.contacts?.name || '—'}</p></div>
                  </div>
                  {selectedDeal.notes && (
                    <div><p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#6b6b80' }}>Notes</p><p className="text-sm whitespace-pre-line" style={{ color: '#8b8b9e' }}>{selectedDeal.notes}</p></div>
                  )}
                  <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs uppercase tracking-wide mb-3" style={{ color: '#6b6b80' }}>Move to</p>
                    <div className="flex flex-wrap gap-2">
                      {STAGES.filter(s => s.key !== selectedDeal.stage).map(s => (
                        <button key={s.key} onClick={() => { moveDeal(selectedDeal.id, s.key); setSelectedDeal(null) }} className="text-xs px-3 py-1.5 rounded-lg font-medium transition hover:opacity-80" style={{ background: s.color + '22', color: s.color }}>{s.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Detail Drawer */}
        {selectedContact && (
          <div className="fixed inset-0 bg-black/60 flex justify-end z-50" onClick={() => setSelectedContact(null)}>
            <div className="w-full max-w-lg h-full overflow-y-auto" style={{ background: '#111118' }} onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">{selectedContact.name}</h2>
                  <button onClick={() => setSelectedContact(null)} className="text-white/40 hover:text-white text-xl">×</button>
                </div>
                <div className="space-y-3">
                  {selectedContact.title && <div><p className="text-xs uppercase tracking-wide" style={{ color: '#6b6b80' }}>Title</p><p className="text-sm">{selectedContact.title}</p></div>}
                  {selectedContact.company && <div><p className="text-xs uppercase tracking-wide" style={{ color: '#6b6b80' }}>Company</p><p className="text-sm">{selectedContact.company}</p></div>}
                  {selectedContact.email && <div><p className="text-xs uppercase tracking-wide" style={{ color: '#6b6b80' }}>Email</p><a href={`mailto:${selectedContact.email}`} className="text-sm text-indigo-400 hover:text-indigo-300">{selectedContact.email}</a></div>}
                  {selectedContact.phone && <div><p className="text-xs uppercase tracking-wide" style={{ color: '#6b6b80' }}>Phone</p><a href={`tel:${selectedContact.phone}`} className="text-sm text-indigo-400 hover:text-indigo-300">{selectedContact.phone}</a></div>}
                  {selectedContact.notes && <div><p className="text-xs uppercase tracking-wide" style={{ color: '#6b6b80' }}>Notes</p><p className="text-sm whitespace-pre-line" style={{ color: '#8b8b9e' }}>{selectedContact.notes}</p></div>}
                  {selectedContact.tags && selectedContact.tags.length > 0 && (
                    <div><p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#6b6b80' }}>Tags</p><div className="flex gap-1 flex-wrap">{selectedContact.tags.map((t, i) => <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#6366f122', color: '#818cf8' }}>{t}</span>)}</div></div>
                  )}
                  <div className="flex gap-2 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {selectedContact.email && <a href={`mailto:${selectedContact.email}`} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 transition">Send Email</a>}
                    {selectedContact.phone && <a href={`tel:${selectedContact.phone}`} className="px-3 py-1.5 rounded-lg text-xs font-medium transition" style={{ background: '#22c55e22', color: '#22c55e' }}>Call</a>}
                    <button onClick={() => { setNewActivity({ ...newActivity, contact_id: selectedContact.id }); setShowLogActivity(true); setSelectedContact(null) }} className="px-3 py-1.5 rounded-lg text-xs font-medium transition" style={{ background: '#f59e0b22', color: '#f59e0b' }}>Log Activity</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Deal Modal */}
        {showAddDeal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddDeal(false)}>
            <div className="rounded-xl p-6 w-full max-w-md" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-4">New Deal</h2>
              <div className="space-y-3">
                <input placeholder="Deal title *" value={newDeal.title} onChange={e => setNewDeal({ ...newDeal, title: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Value ($)" type="number" value={newDeal.value || ''} onChange={e => setNewDeal({ ...newDeal, value: Number(e.target.value) })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                  <select value={newDeal.stage} onChange={e => setNewDeal({ ...newDeal, stage: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}>
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs" style={{ color: '#6b6b80' }}>Probability: {newDeal.probability}%</label>
                  <input type="range" min={0} max={100} step={5} value={newDeal.probability} onChange={e => setNewDeal({ ...newDeal, probability: Number(e.target.value) })} className="flex-1 accent-indigo-500" />
                </div>
                {contacts.length > 0 && (
                  <select value={newDeal.contact_id} onChange={e => setNewDeal({ ...newDeal, contact_id: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}>
                    <option value="">Link to contact (optional)</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
                  </select>
                )}
                <textarea placeholder="Notes" value={newDeal.notes} onChange={e => setNewDeal({ ...newDeal, notes: e.target.value })} rows={3} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setShowAddDeal(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: '#8b8b9e' }}>Cancel</button>
                  <button onClick={addDeal} disabled={!newDeal.title} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium disabled:opacity-40 transition">Create Deal</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Contact Modal */}
        {showAddContact && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddContact(false)}>
            <div className="rounded-xl p-6 w-full max-w-md" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-4">New Contact</h2>
              <div className="space-y-3">
                <input placeholder="Full name *" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Title / Role" value={newContact.title} onChange={e => setNewContact({ ...newContact, title: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                  <input placeholder="Company" value={newContact.company} onChange={e => setNewContact({ ...newContact, company: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Email" value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                  <input placeholder="Phone" value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                </div>
                <textarea placeholder="Notes" value={newContact.notes} onChange={e => setNewContact({ ...newContact, notes: e.target.value })} rows={2} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setShowAddContact(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: '#8b8b9e' }}>Cancel</button>
                  <button onClick={addContact} disabled={!newContact.name} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium disabled:opacity-40 transition">Create Contact</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Log Activity Modal */}
        {showLogActivity && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowLogActivity(false)}>
            <div className="rounded-xl p-6 w-full max-w-md" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-4">Log Activity</h2>
              <div className="space-y-3">
                <div className="flex gap-2">
                  {(['call', 'email', 'meeting', 'note', 'task'] as const).map(t => (
                    <button key={t} onClick={() => setNewActivity({ ...newActivity, type: t })} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${newActivity.type === t ? 'bg-indigo-600 text-white' : ''}`} style={newActivity.type !== t ? { background: '#0a0a0f', color: '#8b8b9e' } : {}}>
                      {t === 'call' ? '📞' : t === 'email' ? '✉️' : t === 'meeting' ? '🤝' : t === 'task' ? '✅' : '📝'} {t}
                    </button>
                  ))}
                </div>
                <input placeholder="Subject" value={newActivity.subject} onChange={e => setNewActivity({ ...newActivity, subject: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                <textarea placeholder="Details / Notes" value={newActivity.body} onChange={e => setNewActivity({ ...newActivity, body: e.target.value })} rows={4} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                {contacts.length > 0 && (
                  <select value={newActivity.contact_id} onChange={e => setNewActivity({ ...newActivity, contact_id: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}>
                    <option value="">Link to contact (optional)</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setShowLogActivity(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: '#8b8b9e' }}>Cancel</button>
                  <button onClick={logActivity} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition">Log Activity</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
