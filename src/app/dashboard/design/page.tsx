'use client'

import { useState, useRef } from 'react'

const TEMPLATES = [
  { id: 'social-card', label: 'Social Card', w: 1200, h: 630, desc: 'Twitter/LinkedIn share card' },
  { id: 'story', label: 'Story', w: 1080, h: 1920, desc: 'Instagram/TikTok story' },
  { id: 'square', label: 'Square Post', w: 1080, h: 1080, desc: 'Instagram feed post' },
  { id: 'presentation', label: 'Slide', w: 1920, h: 1080, desc: 'Presentation slide' },
  { id: 'banner', label: 'Banner', w: 1500, h: 500, desc: 'Twitter/LinkedIn banner' },
  { id: 'thumbnail', label: 'Thumbnail', w: 1280, h: 720, desc: 'YouTube thumbnail' },
]

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#ffffff', '#000000']
const FONTS = ['Inter', 'Georgia', 'Courier New', 'Arial Black', 'Impact']

interface TextElement {
  id: string; text: string; x: number; y: number; fontSize: number;
  color: string; font: string; bold: boolean; italic: boolean;
}

interface ShapeElement {
  id: string; type: 'rect' | 'circle'; x: number; y: number;
  w: number; h: number; color: string; opacity: number;
}

type Element = (TextElement & { kind: 'text' }) | (ShapeElement & { kind: 'shape' })

export default function DesignPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [template, setTemplate] = useState(TEMPLATES[0])
  const [bgColor, setBgColor] = useState('#0a0a0f')
  const [bgGradient, setBgGradient] = useState('')
  const [elements, setElements] = useState<Element[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<'select' | 'text' | 'rect' | 'circle'>('select')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const selected = elements.find(e => e.id === selectedId)
  const scale = Math.min(800 / template.w, 500 / template.h)

  function addText() {
    const el: Element = {
      kind: 'text', id: crypto.randomUUID(), text: 'Double click to edit',
      x: template.w / 2 - 100, y: template.h / 2 - 20, fontSize: 48,
      color: '#ffffff', font: 'Inter', bold: true, italic: false,
    }
    setElements([...elements, el]); setSelectedId(el.id); setTool('select')
  }

  function addShape(type: 'rect' | 'circle') {
    const el: Element = {
      kind: 'shape', id: crypto.randomUUID(), type, x: template.w / 2 - 75,
      y: template.h / 2 - 75, w: 150, h: 150, color: '#6366f1', opacity: 0.8,
    }
    setElements([...elements, el]); setSelectedId(el.id); setTool('select')
  }

  function updateElement(id: string, updates: any) {
    setElements(elements.map(e => e.id === id ? { ...e, ...updates } : e))
  }

  function deleteSelected() {
    if (!selectedId) return
    setElements(elements.filter(e => e.id !== selectedId)); setSelectedId(null)
  }

  function moveElement(id: string, dx: number, dy: number) {
    const el = elements.find(e => e.id === id)
    if (el) updateElement(id, { x: el.x + dx / scale, y: el.y + dy / scale })
  }

  async function generateWithAI() {
    if (!aiPrompt) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Generate a design layout for: "${aiPrompt}". Return JSON with: bgColor (hex), elements array where each element is either {kind:"text",text,x,y,fontSize,color,font:"Inter",bold:true,italic:false} or {kind:"shape",type:"rect"|"circle",x,y,w,h,color,opacity}. Canvas size: ${template.w}x${template.h}. Use modern dark theme colors. Keep it simple and clean — max 5 elements. Return ONLY valid JSON, no markdown.` }],
        }),
      })
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || data.content || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.bgColor) setBgColor(parsed.bgColor)
        if (parsed.elements) {
          const newEls = parsed.elements.map((el: any) => ({ ...el, id: crypto.randomUUID() }))
          setElements(newEls)
        }
      }
    } catch (e) { console.error('AI design failed:', e) }
    setAiLoading(false)
  }

  function exportCanvas() {
    const canvas = document.createElement('canvas')
    canvas.width = template.w; canvas.height = template.h
    const ctx = canvas.getContext('2d')!

    // Background
    if (bgGradient) {
      const grad = ctx.createLinearGradient(0, 0, template.w, template.h)
      grad.addColorStop(0, bgColor); grad.addColorStop(1, bgGradient)
      ctx.fillStyle = grad
    } else { ctx.fillStyle = bgColor }
    ctx.fillRect(0, 0, template.w, template.h)

    // Elements
    for (const el of elements) {
      if (el.kind === 'shape') {
        ctx.globalAlpha = el.opacity
        ctx.fillStyle = el.color
        if (el.type === 'circle') {
          ctx.beginPath(); ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2); ctx.fill()
        } else { ctx.fillRect(el.x, el.y, el.w, el.h) }
        ctx.globalAlpha = 1
      } else if (el.kind === 'text') {
        ctx.fillStyle = el.color
        ctx.font = `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${el.fontSize}px ${el.font}`
        ctx.fillText(el.text, el.x, el.y + el.fontSize)
      }
    }

    const link = document.createElement('a')
    link.download = `pulsed-design-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      {/* Left Toolbar */}
      <div className="w-64 p-4 flex flex-col gap-4 shrink-0" style={{ background: '#111118', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 className="text-lg font-bold">Design Studio</h1>

        {/* Template picker */}
        <div>
          <button onClick={() => setShowTemplates(!showTemplates)} className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-white/5" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            📐 {template.label} ({template.w}×{template.h})
          </button>
          {showTemplates && (
            <div className="mt-1 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => { setTemplate(t); setShowTemplates(false) }}
                  className="w-full text-left text-xs px-3 py-2 hover:bg-white/5 block" style={{ color: template.id === t.id ? '#818cf8' : '#8b8b9e' }}>
                  {t.label} · {t.desc}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tools */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b80' }}>Tools</p>
          {[
            { key: 'select', icon: '🔲', label: 'Select' },
            { key: 'text', icon: 'T', label: 'Add Text' },
            { key: 'rect', icon: '⬜', label: 'Rectangle' },
            { key: 'circle', icon: '⚪', label: 'Circle' },
          ].map(t => (
            <button key={t.key} onClick={() => {
              if (t.key === 'text') addText()
              else if (t.key === 'rect') addShape('rect')
              else if (t.key === 'circle') addShape('circle')
              else setTool(t.key as any)
            }} className={`w-full text-left text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 ${tool === t.key ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-white/5 text-[#8b8b9e]'}`}>
              <span className="w-5 text-center">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Background */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b80' }}>Background</p>
          <div className="flex gap-1 flex-wrap">
            {COLORS.map(c => (
              <button key={c} onClick={() => setBgColor(c)} className="w-6 h-6 rounded-full border-2 transition"
                style={{ background: c, borderColor: bgColor === c ? '#818cf8' : 'transparent' }} />
            ))}
          </div>
          <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full h-8 rounded cursor-pointer" />
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#6b6b80' }}>Gradient:</span>
            <input type="color" value={bgGradient || '#6366f1'} onChange={e => setBgGradient(e.target.value)} className="w-8 h-6 rounded cursor-pointer" />
            {bgGradient && <button onClick={() => setBgGradient('')} className="text-xs text-red-400">×</button>}
          </div>
        </div>

        {/* AI Generate */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b80' }}>AI Design</p>
          <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Describe your design..."
            className="w-full px-3 py-2 rounded-lg text-xs" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}
            onKeyDown={e => e.key === 'Enter' && generateWithAI()} />
          <button onClick={generateWithAI} disabled={aiLoading || !aiPrompt}
            className="w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium disabled:opacity-40">
            {aiLoading ? 'Generating...' : '✨ Generate with AI'}
          </button>
        </div>

        {/* Actions */}
        <div className="mt-auto space-y-2">
          <button onClick={exportCanvas} className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium">↓ Export PNG</button>
          {selectedId && <button onClick={deleteSelected} className="w-full px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10">Delete Selected</button>}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div style={{ width: template.w * scale, height: template.h * scale, position: 'relative', background: bgGradient ? `linear-gradient(135deg, ${bgColor}, ${bgGradient})` : bgColor, borderRadius: 8, boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedId(null)}>
          {elements.map(el => (
            <div key={el.id} onClick={e => { e.stopPropagation(); setSelectedId(el.id) }}
              draggable onDragEnd={e => {
                const rect = (e.target as HTMLElement).parentElement!.getBoundingClientRect()
                updateElement(el.id, { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale })
              }}
              style={{
                position: 'absolute',
                left: el.x * scale, top: el.y * scale,
                cursor: 'move',
                outline: selectedId === el.id ? '2px solid #818cf8' : 'none',
                outlineOffset: 2, borderRadius: 4,
              }}>
              {el.kind === 'text' ? (
                <div contentEditable suppressContentEditableWarning
                  onBlur={e => updateElement(el.id, { text: e.currentTarget.textContent || '' })}
                  style={{
                    fontSize: el.fontSize * scale, color: el.color, fontFamily: el.font,
                    fontWeight: el.bold ? 'bold' : 'normal', fontStyle: el.italic ? 'italic' : 'normal',
                    whiteSpace: 'nowrap', minWidth: 20,
                  }}>
                  {el.text}
                </div>
              ) : (
                <div style={{
                  width: el.w * scale, height: el.h * scale, background: el.color,
                  opacity: el.opacity, borderRadius: el.type === 'circle' ? '50%' : 4,
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Properties Panel */}
      {selected && (
        <div className="w-56 p-4 space-y-3 shrink-0" style={{ background: '#111118', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b80' }}>Properties</p>

          {selected.kind === 'text' && (
            <>
              <div>
                <label className="text-xs" style={{ color: '#6b6b80' }}>Font Size</label>
                <input type="range" min={12} max={200} value={selected.fontSize} onChange={e => updateElement(selected.id, { fontSize: Number(e.target.value) })} className="w-full" />
                <span className="text-xs" style={{ color: '#8b8b9e' }}>{selected.fontSize}px</span>
              </div>
              <div>
                <label className="text-xs" style={{ color: '#6b6b80' }}>Font</label>
                <select value={selected.font} onChange={e => updateElement(selected.id, { font: e.target.value })}
                  className="w-full px-2 py-1 rounded text-xs" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }}>
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateElement(selected.id, { bold: !selected.bold })} className={`px-2 py-1 rounded text-xs ${selected.bold ? 'bg-indigo-600' : 'bg-white/5'}`}>B</button>
                <button onClick={() => updateElement(selected.id, { italic: !selected.italic })} className={`px-2 py-1 rounded text-xs italic ${selected.italic ? 'bg-indigo-600' : 'bg-white/5'}`}>I</button>
              </div>
            </>
          )}

          {selected.kind === 'shape' && (
            <>
              <div>
                <label className="text-xs" style={{ color: '#6b6b80' }}>Width</label>
                <input type="range" min={20} max={template.w} value={selected.w} onChange={e => updateElement(selected.id, { w: Number(e.target.value) })} className="w-full" />
              </div>
              <div>
                <label className="text-xs" style={{ color: '#6b6b80' }}>Height</label>
                <input type="range" min={20} max={template.h} value={selected.h} onChange={e => updateElement(selected.id, { h: Number(e.target.value) })} className="w-full" />
              </div>
              <div>
                <label className="text-xs" style={{ color: '#6b6b80' }}>Opacity</label>
                <input type="range" min={0} max={1} step={0.1} value={selected.opacity} onChange={e => updateElement(selected.id, { opacity: Number(e.target.value) })} className="w-full" />
              </div>
            </>
          )}

          <div>
            <label className="text-xs" style={{ color: '#6b6b80' }}>Color</label>
            <div className="flex gap-1 flex-wrap mt-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => updateElement(selected.id, { color: c })} className="w-5 h-5 rounded-full border transition"
                  style={{ background: c, borderColor: selected.color === c ? '#818cf8' : 'transparent' }} />
              ))}
            </div>
            <input type="color" value={selected.color} onChange={e => updateElement(selected.id, { color: e.target.value })} className="w-full h-6 rounded mt-1 cursor-pointer" />
          </div>

          <div>
            <label className="text-xs" style={{ color: '#6b6b80' }}>Position</label>
            <div className="flex gap-2 mt-1">
              <input type="number" value={Math.round(selected.x)} onChange={e => updateElement(selected.id, { x: Number(e.target.value) })}
                className="w-full px-2 py-1 rounded text-xs" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
              <input type="number" value={Math.round(selected.y)} onChange={e => updateElement(selected.id, { y: Number(e.target.value) })}
                className="w-full px-2 py-1 rounded text-xs" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
