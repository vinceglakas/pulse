'use client'

import { useState, useEffect } from 'react'

function getFingerprint(): string {
  if (typeof window === 'undefined') return 'server'
  let fp = localStorage.getItem('pulsed_fp')
  if (!fp) {
    fp = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('pulsed_fp', fp)
  }
  return fp
}

interface ReferralStatus {
  code: string | null
  referrals: number
  bonus_searches: number
  used: number
  limit: number
  remaining: number
}

export default function ReferralSection() {
  const [status, setStatus] = useState<ReferralStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  const fetchStatus = async () => {
    try {
      const fp = getFingerprint()
      const res = await fetch(`/api/referrals/status?fp=${fp}`)
      if (res.ok) setStatus(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchStatus() }, [])

  const generateCode = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/referrals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: getFingerprint() }),
      })
      if (res.ok) {
        await fetchStatus()
      }
    } catch { /* ignore */ }
    setGenerating(false)
  }

  const referralLink = status?.code ? `https://runpulsed.ai?ref=${status.code}` : ''

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareOnX = () => {
    const text = `I've been using Pulsed for AI-powered market research — it's incredible. Use my link to get 3 bonus searches: ${referralLink}`
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, '_blank')
  }

  if (loading) return null

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-6 md:p-8">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Give 3, Get 3</h3>
          <p className="text-sm text-gray-500">Share Pulsed with a friend. You both get 3 bonus searches.</p>
        </div>
      </div>

      {!status?.code ? (
        <button
          onClick={generateCode}
          disabled={generating}
          className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Get Your Referral Link'}
        </button>
      ) : (
        <>
          {/* Referral link */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 bg-white rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 truncate font-mono">
              {referralLink}
            </div>
            <button
              onClick={copyLink}
              className="shrink-0 px-4 py-2.5 text-sm font-medium text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={shareOnX}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Share on X
            </button>
            <button
              onClick={shareOnLinkedIn}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{status.referrals}</p>
              <p className="text-xs text-gray-500">Referrals</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
              <p className="text-2xl font-bold text-indigo-600">{status.bonus_searches}</p>
              <p className="text-xs text-gray-500">Bonus earned</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
              <p className="text-2xl font-bold text-emerald-600">{status.remaining}</p>
              <p className="text-xs text-gray-500">Remaining</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
