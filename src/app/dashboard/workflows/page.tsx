'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSession, getAccessToken } from '@/lib/auth'

const BLOCK_TYPES = [
  { type: 'trigger', label: 'Trigger', icon: '⚡', color: '#22c55e', desc: 'Start the workflow' },
  { type: 'research', label: 'Research', icon: '🔍', color: '#6366f1', desc: 'Search & analyze a topic' },
  { type: 'filter', label: 'Filter', icon: '🔽', color: '#f59e0b', desc: 'Filter by keyword or sentiment' },
  { type: 'alert', label: 'Alert', icon: '🔔', color: '#ef4444', desc: 'Send notification' },
  { type: 'draft', label: 'Draft Content', icon: '✏️', color: '#8b5cf6', desc: 'Generate content from data' },
  { type: 'email', label: 'Send Email', icon: '📧', color: '#06b6d4', desc: 'Email a contact' },
  { type: 'crm', label: 'CRM Action', icon: '👤', color: '#ec4899', desc: 'Create/update contact or deal' },
  { type: 'delay', label: 'Delay', icon: '⏳', color: '#8b8b9e', desc: 'Wait before next step' },
  { type: 'condition', label: 'Condition', icon: '🔀', color: '#f97316', desc: 'If/else branch' },
  { type: 'ai', label: 'AI Process', icon: '🤖', color: '#a855f7', desc: 'Custom AI instruction' },
]

interface Block {
  id: string; type: string; label: string; icon: string; color: string;
  config: Record<string, string>; x: number; y: number;
}
interface Connection { from: string; to: string }
interface Workflow {
  id: string; name: string; blocks: Block[]; connections: Connection[];
  enabled: boolean; artifactId?: string;
}

export default function WorkflowsPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [editing, setEditing] = useState<Workflow | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [showBlockPicker, setShowBlockPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  const hdrs = useCallback((t: string | null): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  }), [])

  // Auth + load workflows from Supabase
  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) { router.push('/login'); return }
      const t = await getAccessToken()
      setToken(t)
      if (t) {
        try {
          const res = await fetch('/api/artifacts?type=workflow', { headers: hdrs(t) })
          if (res.ok) {
            const data = await res.json()
            const wfs = (data.artifacts || []).filter((a: any) => a.type === 'workflow')
            setWorkflows(wfs.map((a: any) => ({
              id: a.data?.id || a.id,
              name: a.name,
              blocks: a.data?.blocks || [],
              connections: a.data?.connections || [],
              enabled: a.data?.enabled ?? false,
              artifactId: a.id,
            })))
          }
        } catch {}
      }
    })
  }, [router, hdrs])

  async function saveWorkflow(wf: Workflow) {
    if (!token) return
    setSaving(true)
    const body = {
      name: wf.name, type: 'workflow', description: `Workflow: ${wf.name}`,
      schema: { columns: [], blockCount: wf.blocks.length },
      data: { id: wf.id, blocks: wf.blocks, connections: wf.connections, enabled: wf.enabled },
    }
    try {
      if (wf.artifactId) {
        await fetch('/api/artifacts', { method: 'PUT', headers: hdrs(token), body: JSON.stringify({ id: wf.artifactId, ...body }) })
      } else {
        const res = await fetch('/api/artifacts', { method: 'POST', headers: hdrs(token), body: JSON.stringify(body) })
        const data = await res.json()
        if (data.artifact?.id) {
          wf.artifactId = data.artifact.id
          setWorkflows(workflows.map(w => w.id === wf.id ? { ...wf } : w))
        }
      }
    } catch {}
    setSaving(false)
  }

  function createWorkflow() {
    const wf: Workflow = {
      id: crypto.randomUUID(), name: 'New Workflow',
      blocks: [{ id: crypto.randomUUID(), type: 'trigger', label: 'Trigger', icon: '⚡', color: '#22c55e', config: { schedule: 'daily' }, x: 300, y: 50 }],
      connections: [], enabled: false,
    }
    setWorkflows([...workflows, wf]); setEditing(wf)
  }

  function addBlock(type: typeof BLOCK_TYPES[number]) {
    if (!editing) return
    const block: Block = {
      id: crypto.randomUUID(), type: type.type, label: type.label, icon: type.icon,
      color: type.color, config: {}, x: 300, y: editing.blocks.length * 120 + 50,
    }
    const updated = { ...editing, blocks: [...editing.blocks, block] }
    // Auto-connect
    if (editing.blocks.length > 0) {
      const last = editing.blocks[editing.blocks.length - 1]
      updated.connections = [...updated.connections, { from: last.id, to: block.id }]
    }
    setEditing(updated)
    setWorkflows(workflows.map(w => w.id === updated.id ? updated : w))
    setShowBlockPicker(false)
  }

  function updateBlock(blockId: string, key: string, value: string) {
    if (!editing) return
    const updated = {
      ...editing,
      blocks: editing.blocks.map(b => b.id === blockId ? { ...b, config: { ...b.config, [key]: value } } : b),
    }
    setEditing(updated)
    setWorkflows(workflows.map(w => w.id === updated.id ? updated : w))
  }

  function deleteBlock(blockId: string) {
    if (!editing) return
    const updated = {
      ...editing,
      blocks: editing.blocks.filter(b => b.id !== blockId),
      connections: editing.connections.filter(c => c.from !== blockId && c.to !== blockId),
    }
    setEditing(updated)
    setWorkflows(workflows.map(w => w.id === updated.id ? updated : w))
    if (selectedBlock === blockId) setSelectedBlock(null)
  }

  function deleteWorkflow(wfId: string) {
    setWorkflows(workflows.filter(w => w.id !== wfId))
    if (editing?.id === wfId) setEditing(null)
  }

  const sel = editing?.blocks.find(b => b.id === selectedBlock)

  // Config fields by block type
  function configFields(type: string): string[] {
    switch (type) {
      case 'trigger': return ['schedule', 'event']
      case 'research': return ['topic', 'sources', 'depth']
      case 'filter': return ['keyword', 'sentiment', 'threshold']
      case 'alert': return ['channel', 'message']
      case 'draft': return ['format', 'tone', 'length']
      case 'email': return ['to', 'subject', 'template']
      case 'crm': return ['action', 'entity', 'field']
      case 'delay': return ['minutes']
      case 'condition': return ['field', 'operator', 'value']
      case 'ai': return ['instruction', 'model']
      default: return []
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      {/* Sidebar */}
      <div className="w-72 p-4 flex flex-col gap-4 shrink-0 overflow-y-auto" style={{ background: '#111118', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-xs hover:text-indigo-400 transition" style={{ color: '#6b6b80' }}>← Dashboard</Link>
          {saving && <span className="text-xs text-indigo-400">Saving...</span>}
        </div>
        <h1 className="text-lg font-bold">Workflows</h1>
        <button onClick={createWorkflow} className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition">+ New Workflow</button>

        {/* Workflow list */}
        <div className="space-y-1">
          {workflows.map(wf => (
            <div key={wf.id} onClick={() => setEditing(wf)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition ${editing?.id === wf.id ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-white/5 text-[#8b8b9e]'}`}>
              <span className="truncate">{wf.name}</span>
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${wf.enabled ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                <button onClick={e => { e.stopPropagation(); deleteWorkflow(wf.id) }} className="text-xs hover:text-red-400 ml-1">×</button>
              </div>
            </div>
          ))}
          {workflows.length === 0 && <p className="text-xs px-3" style={{ color: '#6b6b80' }}>No workflows yet. Create one to automate tasks.</p>}
        </div>

        {/* Block picker */}
        {editing && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#6b6b80' }}>Add Block</p>
            <div className="space-y-1">
              {BLOCK_TYPES.map(t => (
                <button key={t.type} onClick={() => addBlock(t)}
                  className="w-full text-left text-xs px-3 py-1.5 rounded-lg hover:bg-white/5 flex items-center gap-2 transition" style={{ color: '#8b8b9e' }}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Save */}
        {editing && (
          <button onClick={() => saveWorkflow(editing)} className="w-full px-3 py-2 rounded-lg text-sm font-medium mt-auto transition" style={{ background: '#22c55e22', color: '#22c55e' }}>
            💾 Save Workflow
          </button>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-auto">
        {!editing ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-2xl mb-2">⚡</p>
              <p className="text-lg font-semibold">Visual Workflow Builder</p>
              <p className="text-sm mt-1" style={{ color: '#8b8b9e' }}>Create a workflow to get started</p>
            </div>
          </div>
        ) : (
          <>
            {/* Workflow header */}
            <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <input value={editing.name} onChange={e => {
                const up = { ...editing, name: e.target.value }
                setEditing(up); setWorkflows(workflows.map(w => w.id === up.id ? up : w))
              }} className="text-lg font-bold bg-transparent border-none outline-none" style={{ color: '#f0f0f5' }} />
              <button onClick={() => {
                const up = { ...editing, enabled: !editing.enabled }
                setEditing(up); setWorkflows(workflows.map(w => w.id === up.id ? up : w))
              }} className={`px-3 py-1 rounded-full text-xs font-medium transition ${editing.enabled ? 'bg-emerald-600/20 text-emerald-400' : 'bg-white/5 text-[#6b6b80]'}`}>
                {editing.enabled ? '● Active' : '○ Inactive'}
              </button>
              <span className="text-xs" style={{ color: '#6b6b80' }}>{editing.blocks.length} blocks</span>
            </div>

            {/* Block flow */}
            <div className="p-8 min-h-[600px]">
              {editing.blocks.map((block, i) => (
                <div key={block.id}>
                  {/* Connection line */}
                  {i > 0 && editing.connections.some(c => c.to === block.id) && (
                    <div className="flex justify-center my-2">
                      <div className="w-0.5 h-8" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    </div>
                  )}
                  <div onClick={() => setSelectedBlock(block.id)}
                    className={`max-w-md mx-auto rounded-xl p-4 cursor-pointer transition-all ${selectedBlock === block.id ? 'ring-2 ring-indigo-500' : ''}`}
                    style={{ background: '#111118', border: `1px solid ${selectedBlock === block.id ? block.color + '66' : 'rgba(255,255,255,0.06)'}` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{block.icon}</span>
                        <div>
                          <p className="text-sm font-medium">{block.label}</p>
                          {Object.entries(block.config).filter(([,v]) => v).length > 0 && (
                            <p className="text-xs mt-0.5" style={{ color: '#6b6b80' }}>
                              {Object.entries(block.config).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteBlock(block.id) }} className="text-xs hover:text-red-400" style={{ color: '#6b6b80' }}>✕</button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add block button */}
              <div className="flex justify-center mt-4">
                <button onClick={() => setShowBlockPicker(true)}
                  className="px-4 py-2 rounded-lg text-sm hover:bg-white/5 transition" style={{ border: '1px dashed rgba(255,255,255,0.15)', color: '#6b6b80' }}>
                  + Add Step
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Properties panel */}
      {sel && (
        <div className="w-64 p-4 space-y-3 shrink-0 overflow-y-auto" style={{ background: '#111118', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{sel.icon}</span>
            <p className="text-sm font-semibold">{sel.label}</p>
          </div>
          <p className="text-xs" style={{ color: '#6b6b80' }}>{BLOCK_TYPES.find(t => t.type === sel.type)?.desc}</p>
          <hr style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
          {configFields(sel.type).map(field => (
            <div key={field}>
              <label className="text-xs capitalize" style={{ color: '#6b6b80' }}>{field}</label>
              <input value={sel.config[field] || ''} onChange={e => updateBlock(sel.id, field, e.target.value)}
                placeholder={field === 'schedule' ? 'daily, hourly, etc.' : `Enter ${field}...`}
                className="w-full px-2 py-1.5 rounded-lg text-xs mt-1 outline-none" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
