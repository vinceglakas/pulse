'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, getAccessToken } from '@/lib/auth';

interface RecentBrief {
  id: string;
  topic: string;
  created_at: string;
}

interface AgentMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState('free');
  const [userEmail, setUserEmail] = useState('');
  const [recentBriefs, setRecentBriefs] = useState<RecentBrief[]>([]);
  const [recentMessages, setRecentMessages] = useState<AgentMessage[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) {
        router.push('/login');
        return;
      }
      setAuthChecked(true);
      const token = await getAccessToken();
      setAccessToken(token);

      // Fetch profile
      try {
        const res = await fetch('/api/profile', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        setUserPlan(data?.plan || 'free');
        setUserEmail(data?.email || '');
      } catch {}

      // Fetch recent briefs
      try {
        const res = await fetch('/api/briefs?limit=5', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setRecentBriefs(Array.isArray(data) ? data : data.briefs || []);
        }
      } catch {}

      // Fetch recent agent messages
      try {
        const res = await fetch('/api/agent/history?limit=5&sessionKey=default', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setRecentMessages(data.messages || []);
        }
      } catch {}

      // Check API keys
      try {
        const res = await fetch('/api/keys', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        setHasApiKey(Array.isArray(data) && data.length > 0);
      } catch {}
    });
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const planLabel = userPlan === 'ultra' ? 'Ultra' : userPlan === 'agent' ? 'Agent' : userPlan === 'pro' ? 'Pro' : 'Free';

  const glassCard = {
    background: 'rgba(17,17,24,0.8)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.06)',
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 50%)' }} />

      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-bold" style={{ color: '#f0f0f5' }}>Pulsed</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/search" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Research</Link>
            <Link href="/agent" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Agent</Link>
            <Link href="/workspace" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Workspace</Link>
            <Link href="/accounts" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Accounts</Link>
            <Link href="/history" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>History</Link>
            <span className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>Dashboard</span>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#f0f0f5' }}>Dashboard</h1>
            <p className="mt-1" style={{ color: '#8b8b9e' }}>{userEmail}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={
                userPlan === 'ultra' ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' } :
                userPlan === 'agent' ? { background: 'rgba(99,102,241,0.15)', color: '#818cf8' } :
                userPlan === 'pro' ? { background: 'rgba(139,92,246,0.15)', color: '#a78bfa' } :
                { background: 'rgba(255,255,255,0.06)', color: '#8b8b9e' }
              }
            >{planLabel}</span>
            <Link href="/settings/keys" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Settings</Link>
          </div>
        </div>

        {/* Setup checklist for new users */}
        {(userPlan === 'free' || !hasApiKey) && (
          <div className="rounded-2xl p-8 mb-8" style={glassCard}>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#f0f0f5' }}>Get started</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#f0f0f5' }}>Create your account</p>
                  <p className="text-xs" style={{ color: '#6b6b80' }}>Done</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: hasApiKey ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)' }}>
                  {hasApiKey ? (
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <span className="text-xs font-bold" style={{ color: '#6b6b80' }}>2</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: '#f0f0f5' }}>Add your API key</p>
                  <p className="text-xs" style={{ color: '#6b6b80' }}>{hasApiKey ? 'Done' : 'Required for your AI agent'}</p>
                </div>
                {!hasApiKey && <Link href="/settings/keys" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">Add key</Link>}
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: userPlan !== 'free' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)' }}>
                  {userPlan !== 'free' ? (
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <span className="text-xs font-bold" style={{ color: '#6b6b80' }}>3</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: '#f0f0f5' }}>Choose a plan</p>
                  <p className="text-xs" style={{ color: '#6b6b80' }}>{userPlan !== 'free' ? planLabel : 'Unlock your full AI agent'}</p>
                </div>
                {userPlan === 'free' && <Link href="/pricing" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">View plans</Link>}
              </div>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <Link
            href="/search"
            className="rounded-xl p-6 transition-all duration-300 group"
            style={glassCard}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-all duration-300" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <h3 className="font-semibold mb-1" style={{ color: '#f0f0f5' }}>New Research</h3>
            <p className="text-sm" style={{ color: '#8b8b9e' }}>Search any topic and get an AI-powered intelligence brief.</p>
          </Link>
          <Link
            href="/agent"
            className="rounded-xl p-6 transition-all duration-300 group"
            style={glassCard}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-all duration-300" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
            <h3 className="font-semibold mb-1" style={{ color: '#f0f0f5' }}>Chat with Agent</h3>
            <p className="text-sm" style={{ color: '#8b8b9e' }}>Ask your AI agent to research, build, or automate anything.</p>
          </Link>
          <Link
            href="/settings/keys"
            className="rounded-xl p-6 transition-all duration-300 group"
            style={glassCard}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-all duration-300" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h3 className="font-semibold mb-1" style={{ color: '#f0f0f5' }}>Settings</h3>
            <p className="text-sm" style={{ color: '#8b8b9e' }}>Manage API keys, integrations, and account preferences.</p>
          </Link>
        </div>

        {/* Recent activity */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent briefs */}
          <div className="rounded-xl p-6" style={glassCard}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: '#f0f0f5' }}>Recent Briefs</h2>
              <Link href="/history" className="text-xs transition-colors hover:text-indigo-400" style={{ color: '#6b6b80' }}>View all</Link>
            </div>
            {recentBriefs.length === 0 ? (
              <p className="text-sm py-4" style={{ color: '#6b6b80' }}>No briefs yet. <Link href="/search" className="text-indigo-400 hover:text-indigo-300 transition-colors">Start researching</Link></p>
            ) : (
              <div className="space-y-3">
                {recentBriefs.map((brief) => (
                  <Link
                    key={brief.id}
                    href={`/brief/${brief.id}`}
                    className="block p-3 rounded-lg transition-colors -mx-1"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <p className="text-sm font-medium truncate" style={{ color: '#f0f0f5' }}>{brief.topic}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6b6b80' }}>{new Date(brief.created_at).toLocaleDateString()}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent agent activity */}
          <div className="rounded-xl p-6" style={glassCard}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: '#f0f0f5' }}>Agent Activity</h2>
              <Link href="/agent" className="text-xs transition-colors hover:text-indigo-400" style={{ color: '#6b6b80' }}>Open chat</Link>
            </div>
            {recentMessages.length === 0 ? (
              <p className="text-sm py-4" style={{ color: '#6b6b80' }}>No conversations yet. <Link href="/agent" className="text-indigo-400 hover:text-indigo-300 transition-colors">Chat with your agent</Link></p>
            ) : (
              <div className="space-y-3">
                {recentMessages.slice(-5).map((msg) => (
                  <div key={msg.id} className="p-3 rounded-lg -mx-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${msg.role === 'user' ? '' : 'text-indigo-400'}`} style={msg.role === 'user' ? { color: '#8b8b9e' } : {}}>
                        {msg.role === 'user' ? 'You' : 'Agent'}
                      </span>
                      <span className="text-xs" style={{ color: '#6b6b80' }}>{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm line-clamp-2" style={{ color: '#8b8b9e' }}>{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
