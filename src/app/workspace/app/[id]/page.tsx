'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSession, getAccessToken } from '@/lib/auth'

export default function AppPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const [artifact, setArtifact] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [isBuilding, setIsBuilding] = useState(false)

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) { router.push('/login'); return }
      const token = await getAccessToken()
      if (!token || !params.id) return

      try {
        const res = await fetch(`/api/artifacts?id=${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          const artifactData = data.artifact || data.artifacts?.[0] || null
          setArtifact(artifactData)
          
          // Check if app is building
          if (artifactData?.schema?.status === 'building') {
            setIsBuilding(true)
            startPolling(token)
          }
        }
      } catch {}
      setLoading(false)
    })
  }, [router, params.id])

  const startPolling = (token: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/artifacts?id=${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          const artifactData = data.artifact || data.artifacts?.[0] || null
          
          if (artifactData?.schema?.status === 'ready' || artifactData?.schema?.status === 'error') {
            setArtifact(artifactData)
            setIsBuilding(false)
            clearInterval(interval)
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 3000) // Poll every 3 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(interval)
      setIsBuilding(false)
    }, 300000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f', color: '#8b8b9e' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading app...</p>
        </div>
      </div>
    )
  }

  if (!artifact) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f', color: '#8b8b9e' }}>
        <div className="text-center">
          <p className="text-lg mb-2">App not found</p>
          <Link href="/workspace" className="text-indigo-400 text-sm">← Back to workspace</Link>
        </div>
      </div>
    )
  }

  const htmlContent = artifact.content || ''

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50" style={{ background: '#0a0a0f' }}>
        <button onClick={() => setFullscreen(false)}
          className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          style={{ background: '#111118', color: '#8b8b9e', border: '1px solid rgba(255,255,255,0.1)' }}>
          Exit Fullscreen
        </button>
        <iframe
          srcDoc={htmlContent}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0" style={{ background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <Link href="/workspace" className="text-xs hover:text-indigo-400 transition" style={{ color: '#6b6b80' }}>← Workspace</Link>
          <span className="text-sm font-bold">{artifact.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400">App</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFullscreen(true)}
            className="px-3 py-1 rounded-lg text-xs hover:bg-white/5 transition" style={{ color: '#8b8b9e' }}>
            ⛶ Fullscreen
          </button>
          <button onClick={() => {
            const blob = new Blob([htmlContent], { type: 'text/html' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `${artifact.name.replace(/\s+/g, '-')}.html`
            a.click()
          }} className="px-3 py-1 rounded-lg text-xs hover:bg-white/5 transition" style={{ color: '#8b8b9e' }}>
            ↓ Download
          </button>
          <Link href="/agent" className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium transition">
            ✨ Edit with AI
          </Link>
        </div>
      </div>

      {/* App description */}
      {artifact.description && (
        <div className="px-4 py-2 text-xs" style={{ color: '#6b6b80', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {artifact.description}
        </div>
      )}

      {/* Live preview */}
      <div className="flex-1 relative">
        {isBuilding && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(10, 10, 15, 0.9)' }}>
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Building your app...</h2>
              <p className="text-sm" style={{ color: '#8b8b9e' }}>This usually takes 20-30 seconds</p>
            </div>
          </div>
        )}
        <iframe
          srcDoc={htmlContent}
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 96px)' }}
          sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
          key={artifact?.updated_at || 'initial'} // Force reload when artifact updates
        />
      </div>
    </div>
  )
}
