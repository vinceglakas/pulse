'use client'

import { useState, useEffect } from 'react'

export default function BriefOfTheDay() {
  const [daily, setDaily] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/daily-brief')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setDaily(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !daily) return null

  // Try to parse structured brief for preview
  let summary = ''
  try {
    const parsed = JSON.parse(daily.brief)
    summary = parsed.executive_summary?.slice(0, 180) || parsed.summary?.slice(0, 180) || ''
    if (summary) summary += '...'
  } catch {
    // Plain text brief — grab first meaningful chunk
    const text = daily.brief || ''
    // Skip markdown headers and get to the meat
    const lines = text.split('\n').filter((l: string) => l.trim() && !l.startsWith('#') && !l.startsWith('---'))
    summary = lines.slice(0, 3).join(' ').slice(0, 200)
    if (summary.length >= 200) summary += '...'
  }

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <section className="py-20 md:py-24 relative overflow-hidden">
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99, 102, 241, 0.06) 0%, transparent 70%)',
        }}
      />
      <div className="relative max-w-4xl mx-auto px-6">
        {/* Section intro */}
        <div className="text-center mb-10">
          <p className="text-sm uppercase tracking-[0.25em] text-indigo-400/60 font-medium mb-4">Daily intelligence</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight max-w-2xl mx-auto">
            Become an expert in anything.{' '}
            <span style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              In minutes.
            </span>
          </h2>
          <p className="mt-4 text-lg text-[#8b8b9e] max-w-xl mx-auto leading-relaxed">
            Every day, Pulsed picks the hottest topic on the internet and generates a comprehensive research brief — the kind that used to take hours. Yours takes seconds.
          </p>
        </div>

        {/* Brief card */}
        <div
          className="rounded-2xl overflow-hidden transition-all duration-300"
          style={{
            background: 'rgba(17, 17, 24, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            boxShadow: '0 0 40px rgba(99, 102, 241, 0.08), 0 0 80px rgba(139, 92, 246, 0.04)',
          }}
        >
          {/* Card header */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Brief of the Day</p>
                <p className="text-xs text-[#6b6b80]">{dateStr}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-emerald-400 font-medium">Live</span>
            </div>
          </div>

          {/* Card body */}
          <div className="px-6 py-6">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-3">{daily.topic}</h3>
            {summary && (
              <p className="text-[#8b8b9e] leading-relaxed text-sm mb-6">{summary}</p>
            )}

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 mb-6">
              {daily.sources && (
                <div className="flex items-center gap-2 text-xs text-[#6b6b80]">
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.757 8.25" />
                  </svg>
                  <span>{Array.isArray(daily.sources) ? daily.sources.length : 0} sources analyzed</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-[#6b6b80]">
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Generated by AI in ~60 seconds</span>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-lg transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)',
                }}
              >
                Try it free — research any topic
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </a>
              <a
                href={`/brief/${daily.id}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#8b8b9e] rounded-lg transition-all duration-200 hover:text-white hover:border-white/20"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Read today&apos;s brief
              </a>
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="text-center mt-6 text-sm text-[#6b6b80]">
          New brief every morning. Any topic, any time — just ask your agent.
        </p>
      </div>
    </section>
  )
}
