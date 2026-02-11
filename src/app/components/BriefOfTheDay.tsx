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
    summary = parsed.executive_summary?.slice(0, 200) + '...'
  } catch {
    summary = daily.brief?.slice(0, 200) + '...'
  }

  return (
    <section className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Brief of the Day</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">{daily.topic}</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{summary}</p>
          <a
            href={`/brief/${daily.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-90 transition-opacity"
          >
            Read full brief
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}
