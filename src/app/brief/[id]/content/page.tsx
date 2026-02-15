'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

const FORMATS = [
  { key: 'twitter_thread', label: '𝕏 Thread', icon: '🐦', desc: '5-8 tweets, hook-driven' },
  { key: 'linkedin_post', label: 'LinkedIn Post', icon: '💼', desc: 'Professional, storytelling' },
  { key: 'newsletter', label: 'Newsletter', icon: '📧', desc: 'Subject + scannable body' },
  { key: 'blog_outline', label: 'Blog Outline', icon: '📝', desc: 'H2s, key points, structure' },
]

export default function ContentPage() {
  const { id } = useParams()
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)

  async function generate(format: string) {
    setSelectedFormat(format); setLoading(true); setContent('')
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief_id: id, format }),
      })
      const data = await res.json()
      setContent(data.content || data.error || 'Failed to generate')
    } catch { setContent('Error generating content') }
    setLoading(false)
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(content)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <a href={`/brief/${id}`} className="text-xs hover:text-indigo-400 transition" style={{ color: '#8b8b9e' }}>← Back to brief</a>
          <h1 className="text-2xl font-bold mt-2">Generate Content</h1>
          <p className="text-sm mt-1" style={{ color: '#8b8b9e' }}>Turn your research into ready-to-post content</p>
        </div>

        {/* Format buttons */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {FORMATS.map(f => (
            <button key={f.key} onClick={() => generate(f.key)}
              disabled={loading}
              className={`rounded-xl p-4 text-left transition hover:border-indigo-500/50 ${selectedFormat === f.key ? 'border-indigo-500' : ''}`}
              style={{ background: '#111118', border: `1px solid ${selectedFormat === f.key ? '#6366f1' : 'rgba(255,255,255,0.06)'}` }}>
              <span className="text-xl">{f.icon}</span>
              <p className="font-medium text-sm mt-2">{f.label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#6b6b80' }}>{f.desc}</p>
            </button>
          ))}
        </div>

        {/* Generated content */}
        {loading && (
          <div className="rounded-xl p-8 text-center" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="animate-pulse text-indigo-400">Generating {FORMATS.find(f => f.key === selectedFormat)?.label}...</div>
          </div>
        )}

        {content && !loading && (
          <div className="rounded-xl p-6" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: '#8b8b9e' }}>
                {FORMATS.find(f => f.key === selectedFormat)?.icon} {FORMATS.find(f => f.key === selectedFormat)?.label}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setEditing(!editing)} className="text-xs px-3 py-1 rounded-lg hover:bg-white/5 transition" style={{ color: '#8b8b9e' }}>
                  {editing ? 'Preview' : 'Edit'}
                </button>
                <button onClick={copyToClipboard} className="text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition">
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
            {editing ? (
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={20}
                className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' }} />
            ) : (
              <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#c4c4d4' }}>{content}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
