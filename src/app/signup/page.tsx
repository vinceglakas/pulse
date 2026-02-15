"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithGoogle, signUpWithEmail } from "@/lib/auth";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan');
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError("");
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signUpWithEmail(email, password, fullName);
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      if (planParam) {
        router.push(`/agent?pending_plan=${planParam}`);
      } else {
        router.push("/agent");
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a0f]">
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-cyan-500/[0.03] via-transparent to-transparent" />

      <div className="w-full max-w-sm relative z-10">
        <div
          className="rounded-xl p-8"
          style={{
            background: 'rgba(17,17,24,0.6)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-lg font-bold text-white">Pulsed</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Create your agent</h1>
            <p className="text-sm text-[#8b8b9e]">
              {planParam ? `Start with the ${planParam.charAt(0).toUpperCase() + planParam.slice(1)} plan` : 'Free for 7 days. No credit card required.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-lg text-sm font-medium transition-all duration-300 mb-6 cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f0f0f5',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 text-[#6b6b80]" style={{ background: 'rgba(17,17,24,1)' }}>or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-xs text-[#8b8b9e] mb-1.5">Full name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full h-10 rounded-lg px-4 text-sm outline-none transition-all duration-300 text-[#f0f0f5]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs text-[#8b8b9e] mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full h-10 rounded-lg px-4 text-sm outline-none transition-all duration-300 text-[#f0f0f5]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs text-[#8b8b9e] mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 rounded-lg px-4 text-sm outline-none transition-all duration-300 text-[#f0f0f5]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-white text-[#0a0a0f] text-sm font-medium rounded-lg hover:bg-white/90 transition-colors duration-300 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Creating agent..." : "Create agent"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-[#8b8b9e]">
              Already have an account?{" "}
              <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">Sign in</Link>
            </p>
            <p className="text-[11px] text-[#6b6b80]">
              By signing up, you agree to our <Link href="/terms" className="hover:text-[#8b8b9e] transition-colors">Terms</Link> and <Link href="/privacy" className="hover:text-[#8b8b9e] transition-colors">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
