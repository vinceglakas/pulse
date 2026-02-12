'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function ReferralCaptureInner() {
  const searchParams = useSearchParams()
  const [refCode, setRefCode] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      localStorage.setItem('pulsed_ref_code', ref)
      setRefCode(ref)
    } else {
      const stored = localStorage.getItem('pulsed_ref_code')
      if (stored) setRefCode(stored)
    }
  }, [searchParams])

  if (!refCode || dismissed) return null

  return (
    <div className="bg-emerald-600 text-white text-sm text-center py-2.5 px-4 relative">
      <span>🎉 You&apos;ve been invited! You&apos;ll get <strong>3 bonus searches</strong> when you run your first search.</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}

export default function ReferralCapture() {
  return (
    <Suspense fallback={null}>
      <ReferralCaptureInner />
    </Suspense>
  )
}
