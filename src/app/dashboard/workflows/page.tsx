'use client'

import { useState } from 'react'

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
  enabled: boolean; created_at: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [editing, setEditing] = useState<Workflow | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [showBlockPicker, setShowBlockPicker] = useState(false)

  function createWorkflow() {
    const wf: Workflow = {
      id: crypto.randomUUID(), name: 'New Workflow',
      blocks: [{ id: crypto.randomUUID(), type: 'trigger', label: 'Trigger', icon: '⚡', color: '#22c55e', config: { schedule: 'daily' }, x: 300, y: 50 }],
      connections: [], enabled: false, created_at: new Date().toISOString(),
    }
    setWorkflows([...workflows, wf]); setEditing(wf)
  }

  function addBlock(type: typeof BLOCK_TYPES[number]) {
    if (!editing) return
    const block: Block = {
      id: crypto.randomUUID(), type: type.type, label: type.label, icon: type.icon,
      color: type.color, config: {}, x: 300, y: (editing.blocks.length) * 120 + 50,
    }
    const updated = { ...editing, blocks: [...editing.blocks, block] }
    setEditing(updated); setWorkflows(workflows.map(w => w.id === updated.id ? updated : w))
    setShowBlockPicker(false)

    // Auto-connect to last block
    if (editing.blocks.length > 0) {
      const lastBlock = editing.blocks[editing.blocks.length - 1]
      const conn: Connection = { from: lastBlock.id, to: block.id }
      const withConn = { ...updated, connections: [...updated.connections, conn] }
      setEditing(withConn); setWorkflows(workflows.map(w => w.id === withConn.id ? withConn : w))
    }
  }

  function removeBlock(id: string) {
    if (!editing) return
    const updated = {
      ...editing,
      blocks: editing.blocks.filter(b => b.id !== id),
      connections: editing.connections.filter(c => c.from !== id && c.to !== id),
    }
    setEditing(updated); setWorkflows(workflows.map(w => w.id === updated.id ? updated : w))
    if (selectedBlock === id) setSelectedBlock(null)
  }

  function updateBlockConfig(id: string, key: string, value: string) {
    if (!editing) return
    const updated = { ...editing, blocks: editing.blocks.map(b => b.id === id ? { ...b, config: { ...b.config, [key]: value } } : b) }
    setEditing(updated); setWorkflows(workflows.map(w => w.id === updated.id ? updated : w))
  }

  const selected = editing?.blocks.find(b => b.id === selectedBlock)

  // Workflow list view
  if (!editing) return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Workflows</h1>
            <p className="text-sm mt-1" style={{ color: '#8b8b9e' }}>Automate research, alerts, and outreach with visual pipelines</p>
          </div>
          <button onClick={createWorkflow} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition">+ New Workflow</button>
        </div>

        <div className="space-y-3">
          {workflows.map(wf => (
            <div key={wf.id} onClick={() => setEditing(wf)} className="rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition"
              style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{wf.name}</p>
                  <p className="text-xs mt-1" style={{ color: '#6b6b80' }}>{wf.blocks.length} blocks · {wf.connections.length} connections</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${wf.enabled ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-[#6b6b80]'}`}>
                  {wf.enabled ? 'Active' : 'Draft'}
                </span>
              </div>
            </div>
          ))}
          {workflows.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">🔗</p>
              <p className="text-lg font-medium">No workflows yet</p>
              <p className="text-sm mt-1" style={{ color: '#6b6b80' }}>Create your first automation pipeline</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Workflow editor
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0" style={{ background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setEditing(null)} className="text-sm hover:text-indigo-400" style={{ color: '#8b8b9e' }}>← Back</button>
          <input value={editing.name} onChange={e => {
            const updated = { ...editing, name: e.target.value }
            setEditing(updated); setWorkflows(workflows.map(w => w.id === updated.id ? updated : w))
          }} className="text-sm font-bold bg-transparent border-none outline-none" style={{ color: '#f0f0f5' }} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowBlockPicker(true)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium">+ Add Block</button>
          <button onClick={() => {
            const updated = { ...editing, enabled: !editing.enabled }
            setEditing(updated); setWorkflows(workflows.map(w => w.id === updated.id ? updated : w))
          }} className={`px-3 py-1 rounded-lg text-xs ${editing.enabled ? 'bg-green-600 hover:bg-green-500' : 'bg-white/10 hover:bg-white/15'}`}>
            {editing.enabled ? '● Active' : '○ Enable'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative overflow-auto p-8" onClick={() => setSelectedBlock(null)}>
          {/* Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            {editing.connections.map((conn, i) => {
              const fromBlock = editing.blocks.find(b => b.id === conn.from)
              const toBlock = editing.blocks.find(b => b.id === conn.to)
              if (!fromBlock || !toBlock) return null
              const x1 = fromBlock.x + 100; const y1 = fromBlock.y + 60
              const x2 = toBlock.x + 100; const y2 = toBlock.y
              return <path key={i} d={`M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`}
                stroke="rgba(99,102,241,0.4)" strokeWidth={2} fill="none" />
            })}
          </svg>

          {/* Blocks */}
          {editing.blocks.map(block => (
            <div key={block.id} onClick={e => { e.stopPropagation(); setSelectedBlock(block.id) }}
              draggable onDragEnd={e => {
                const rect = (e.target as HTMLElement).parentElement!.getBoundingClientRect()
                const updated = { ...editing, blocks: editing.blocks.map(b => b.id === block.id ? { ...b, x: e.clientX - rect.left - 100, y: e.clientY - rect.top - 30 } : b) }
                setEditing(updated); setWorkflows(workflows.map(w => w.id === updated.id ? updated : w))
              }}
              className="absolute cursor-move transition-shadow hover:shadow-lg"
              style={{
                left: block.x, top: block.y, width: 200,
                background: '#111118', border: `2px solid ${selectedBlock === block.id ? block.color : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 12, padding: '12px 16px', zIndex: 1,
              }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{block.icon}</span>
                <span className="text-sm font-medium">{block.label}</span>
              </div>
              {Object.entries(block.config).map(([k, v]) => (
                <p key={k} className="text-xs mt-1 truncate" style={{ color: '#6b6b80' }}>{k}: {v}</p>
              ))}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ background: block.color, border: '2px solid #0a0a0f' }} />
            </div>
          ))}
        </div>

        {/* Block picker overlay */}
        {showBlockPicker && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowBlockPicker(false)}>
            <div className="rounded-xl p-6 w-full max-w-lg" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-4">Add Block</h2>
              <div className="grid grid-cols-2 gap-2">
                {BLOCK_TYPES.map(bt => (
                  <button key={bt.type} onClick={() => addBlock(bt)} className="rounded-lg p-3 text-left hover:border-indigo-500/50 transition"
                    style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <span>{bt.icon}</span>
                      <span className="text-sm font-medium">{bt.label}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#6b6b80' }}>{bt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Properties panel */}
        {selected && (
          <div className="w-64 p-4 space-y-3 shrink-0 overflow-y-auto" style={{ background: '#111118', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{selected.icon}</span>
                <p className="text-sm font-bold">{selected.label}</p>
              </div>
              <button onClick={() => removeBlock(selected.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
            </div>

            {selected.type === 'trigger' && (
              <div>
                <label className="text-xs" style={{ color: '#6b6b80' }}>Schedule</label>
                <select value={selected.config.schedule || 'daily'} onChange={e => updateBlockConfig(selected.id, 'schedule', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg text-sm mt-1" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}>
                  <option value="hourly">Every hour</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="manual">Manual only</option>
                </select>
              </div>
            )}

            {selected.type === 'research' && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs" style={{ color: '#6b6b80' }}>Topic</label>
                  <input value={selected.config.topic || ''} onChange={e => updateBlockConfig(selected.id, 'topic', e.target.value)}
                    placeholder="e.g. AI regulation" className="w-full px-2 py-1.5 rounded-lg text-sm mt-1"
                    style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                </div>
                <div>
                  <label className="text-xs" style={{ color: '#6b6b80' }}>Depth</label>
                  <select value={selected.config.depth || 'quick'} onChange={e => updateBlockConfig(selected.id, 'depth', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg text-sm mt-1" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}>
                    <option value="quick">Quick scan</option>
                    <option value="deep">Deep research</option>
                  </select>
                </div>
              </div>
            )}

            {selected.type === 'filter' && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs" style={{ color: '#6b6b80' }}>Keywords (comma separated)</label>
                  <input value={selected.config.keywords || ''} onChange={e => updateBlockConfig(selected.id, 'keywords', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg text-sm mt-1" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
                </div>
                <div>
                  <label className="text-xs" style={{ color: '#6b6b80' }}>Sentiment</label>
                  <select value={selected.config.sentiment || 'any'} onChange={e => updateBlockConfig(selected.id, 'sentiment', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg text-sm mt-1" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}>
                    <option value="any">Any</option>
                    <option value="positive">Positive only</option>
                    <option value="negative">Negative only</option>
                  </select>
                </div>
              </div>
            )}

            {selected.type === 'ai' && (
              <div>
                <label className="text-xs" style={{ color: '#6b6b80' }}>Instruction</label>
                <textarea value={selected.config.instruction || ''} onChange={e => updateBlockConfig(selected.id, 'instruction', e.target.value)}
                  rows={4} placeholder="Tell the AI what to do with the data..."
                  className="w-full px-2 py-1.5 rounded-lg text-sm mt-1" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
              </div>
            )}

            {(selected.type === 'alert' || selected.type === 'email') && (
              <div>
                <label className="text-xs" style={{ color: '#6b6b80' }}>Recipient</label>
                <input value={selected.config.to || ''} onChange={e => updateBlockConfig(selected.id, 'to', e.target.value)}
                  placeholder="email@example.com" className="w-full px-2 py-1.5 rounded-lg text-sm mt-1"
                  style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
              </div>
            )}

            {selected.type === 'delay' && (
              <div>
                <label className="text-xs" style={{ color: '#6b6b80' }}>Wait time</label>
                <select value={selected.config.delay || '1h'} onChange={e => updateBlockConfig(selected.id, 'delay', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg text-sm mt-1" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}>
                  <option value="5m">5 minutes</option>
                  <option value="1h">1 hour</option>
                  <option value="1d">1 day</option>
                  <option value="1w">1 week</option>
                </select>
              </div>
            )}

            {selected.type === 'draft' && (
              <div>
                <label className="text-xs" style={{ color: '#6b6b80' }}>Format</label>
                <select value={selected.config.format || 'twitter_thread'} onChange={e => updateBlockConfig(selected.id, 'format', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg text-sm mt-1" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}>
                  <option value="twitter_thread">Twitter Thread</option>
                  <option value="linkedin_post">LinkedIn Post</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="blog_outline">Blog Outline</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
