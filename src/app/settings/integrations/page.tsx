'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, getAccessToken } from '@/lib/auth';

type ProviderStatus = {
  provider: string;
  connected: boolean;
  connectedAt?: string;
  metadata?: Record<string, any>;
  maskedKey?: string;
};

const AVAILABLE_INTEGRATIONS = [
  { id: 'vercel', name: 'Vercel', description: 'Deploy apps & sites', icon: '▲' },
  { id: 'supabase', name: 'Supabase', description: 'Databases & auth', icon: '⚡' },
  { id: 'github', name: 'GitHub', description: 'Code & repos', icon: '🐙' },
  { id: 'google', name: 'Google', description: 'Calendar, Gmail, Drive', icon: 'G' },
  { id: 'slack', name: 'Slack', description: 'Team messaging', icon: '#' },
  { id: 'discord', name: 'Discord', description: 'Community', icon: '🎮' },
  { id: 'stripe', name: 'Stripe', description: 'Payments', icon: '💳' },
  { id: 'twilio', name: 'Twilio', description: 'Phone & SMS', icon: '📱' },
];

const COMING_SOON_INTEGRATIONS = [
  { id: 'vercel', name: 'Vercel', description: 'Deploy apps & sites', icon: '▲' },
  { id: 'supabase', name: 'Supabase', description: 'Databases & auth', icon: '⚡' },
  { id: 'github', name: 'GitHub', description: 'Code & repos', icon: '🐙' },
  { id: 'google', name: 'Google', description: 'Calendar, Gmail, Drive', icon: 'G' },
  { id: 'slack', name: 'Slack', description: 'Team messaging', icon: '#' },
  { id: 'discord', name: 'Discord', description: 'Community', icon: '🎮' },
  { id: 'stripe', name: 'Stripe', description: 'Payments', icon: '💳' },
  { id: 'twilio', name: 'Twilio', description: 'Phone & SMS', icon: '📱' },
];

const NAV_ITEMS = [
  { href: '/settings/keys', label: 'API Keys' },
  { href: '/settings/models', label: 'Models' },
  { href: '/settings/integrations', label: 'Integrations' },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [saved, setSaved] = useState(false);
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, ProviderStatus>>({});
  const [botUsername, setBotUsername] = useState('PulsedAIBot');

  const fetchIntegrationStatuses = async (token: string) => {
    const statuses: Record<string, ProviderStatus> = {};
    
    for (const integration of AVAILABLE_INTEGRATIONS) {
      try {
        const res = await fetch(`/api/integrations/${integration.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          statuses[integration.id] = data;
        }
      } catch {}
    }
    
    setIntegrationStatuses(statuses);
  };

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) {
        router.push('/login');
        return;
      }
      setAuthChecked(true);
      const token = await getAccessToken();
      setAccessToken(token);

      try {
        const res = await fetch('/api/profile', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.telegram_username) {
          setTelegramUsername(data.telegram_username);
          setTelegramConnected(true);
        }
        
        // Get bot username from env or use default
        const botRes = await fetch('/api/telegram/config', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (botRes.ok) {
          const botData = await botRes.json();
          setBotUsername(botData.username || 'PulsedAIBot');
        }
      } catch {}
      
      // Fetch integration statuses
      if (token) {
        await fetchIntegrationStatuses(token);
      }
    });
  }, [router]);

  const handleTelegramConnect = async () => {
    if (!accessToken || !telegramUsername.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ username: telegramUsername.trim().replace('@', '') }),
      });
      if (res.ok) {
        setTelegramConnected(true);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {}
    setConnecting(false);
  };

  const handleTestConnection = async () => {
    if (!accessToken) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setTestResult(res.ok ? 'success' : 'error');
    } catch {
      setTestResult('error');
    }
    setTesting(false);
    setTimeout(() => setTestResult(null), 4000);
  };

  const handleConnectIntegration = (provider: string) => {
    if (provider === 'github') {
      const params = new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '',
        scope: 'repo,user',
        redirect_uri: `${window.location.origin}/api/integrations/github/callback`,
      });
      window.location.href = `https://github.com/login/oauth/authorize?${params}`;
    } else if (provider === 'google') {
      const params = new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        redirect_uri: `${window.location.origin}/api/integrations/google/callback`,
        scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly',
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
      });
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
  };

  const handleDisconnectIntegration = async (provider: string) => {
    if (!accessToken) return;
    
    try {
      const res = await fetch(`/api/integrations/${provider}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (res.ok) {
        setIntegrationStatuses(prev => ({
          ...prev,
          [provider]: { provider, connected: false },
        }));
      }
    } catch {}
  };

  const checkTelegramStatus = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/telegram/status', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTelegramConnected(data.linked);
        if (data.username) {
          setTelegramUsername(data.username);
        }
      }
    } catch {}
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f0f0f5]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-[#6b6b80] hover:text-[#8b8b9e] transition-colors mb-4 inline-block">
            &larr; Back
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-[#f0f0f5]">Integrations</h1>
          </div>
          <p className="text-sm text-[#8b8b9e]">
            Connect services your agent can use to communicate and operate
          </p>
        </div>

        {/* Settings Nav */}
        <div className="flex gap-2 mb-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                item.href === '/settings/integrations'
                  ? 'bg-gradient-to-r from-[#06b6d4] to-[#6366f1] text-white'
                  : 'bg-[rgba(255,255,255,0.04)] text-[#8b8b9e] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(6,182,212,0.2)] hover:text-[#f0f0f5]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Telegram Card */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            background: 'rgba(17,17,24,0.8)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(6,182,212,0.3)',
          }}
        >
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #0088cc, #229ED9)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[#f0f0f5]">Telegram</h2>
                {telegramConnected ? (
                  <span className="text-xs text-[#0a0a0f] bg-cyan-400 px-2 py-0.5 rounded-full">
                    Connected
                  </span>
                ) : (
                  <span className="text-xs text-[#6b6b80] bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                    Not connected
                  </span>
                )}
              </div>
              <p className="text-sm text-[#8b8b9e] mt-1">
                Chat with your agent via{' '}
                <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-indigo-300 transition-colors">
                  @{botUsername}
                </a>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {!telegramConnected ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-cyan-400 font-semibold">1</span>
                  <div className="flex-1">
                    <p className="text-sm text-[#f0f0f5]">Search <strong>@{botUsername}</strong> on Telegram</p>
                    <a 
                      href={`https://t.me/${botUsername}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1 mt-1"
                    >
                      Open in Telegram →
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-cyan-400 font-semibold">2</span>
                  <p className="text-sm text-[#f0f0f5]">Send <strong>/start</strong> to begin</p>
                </div>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-cyan-400 font-semibold">3</span>
                  <p className="text-sm text-[#f0f0f5]">The bot will auto-link to your Pulsed account using your Telegram username</p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-emerald-400">✓ Telegram connected successfully!</p>
                <p className="text-xs text-emerald-300 mt-1">Your username: @{telegramUsername}</p>
              </div>
            )}
            
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-[#6b6b80] mb-2">
                Telegram Username
              </label>
              <input
                type="text"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                placeholder="@yourusername"
                className="w-full bg-[#0a0a12] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#f0f0f5] placeholder-[#5d5d72] focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-indigo-500/40"
              />
              <p className="text-xs text-[#6b6b80] mt-2">
                Enter your Telegram username (with or without @) and click Connect to save it to your profile.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTelegramConnect}
                disabled={connecting || !telegramUsername.trim()}
                className="text-sm font-semibold text-[#0a0a0f] px-6 py-2.5 rounded-lg bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {connecting ? 'Connecting...' : telegramConnected ? 'Update' : 'Connect'}
              </button>

              {telegramConnected && (
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="text-sm font-medium text-cyan-400 px-4 py-2.5 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-colors disabled:opacity-50"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
              )}
              
              {telegramConnected && (
                <button
                  type="button"
                  onClick={checkTelegramStatus}
                  className="text-sm font-medium text-cyan-400 px-4 py-2.5 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-colors"
                >
                  Refresh Status
                </button>
              )}

              {saved && <span className="text-sm text-emerald-400">Saved!</span>}
              {testResult === 'success' && <span className="text-sm text-emerald-400">Message sent ✓</span>}
              {testResult === 'error' && <span className="text-sm text-rose-400">Failed to send</span>}
            </div>
          </div>
        </div>

        {/* Available Integrations */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-[#6b6b80] uppercase tracking-[0.15em] mb-4">Available Integrations</h3>
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_INTEGRATIONS.map((item) => {
              const status = integrationStatuses[item.id];
              const isConnected = status?.connected || false;
              const isGitHub = item.id === 'github';
              const isGoogle = item.id === 'google';
              const isAvailable = isGitHub || isGoogle;
              
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl p-4 ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{
                    background: 'rgba(17,17,24,0.8)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={(e) => { 
                    if (isAvailable) e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; 
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-sm text-[#6b6b80]">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#8b8b9e]">{item.name}</span>
                        {!isAvailable && (
                          <span className="text-[9px] uppercase tracking-widest text-[#8b8b9e] bg-white/5 px-1.5 py-0.5 rounded-full border border-white/10">
                            Soon
                          </span>
                        )}
                        {isConnected && (
                          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/40">
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6b6b80] mt-0.5 truncate">{item.description}</p>
                    </div>
                  </div>
                  
                  {isAvailable && (
                    <div className="mt-3 flex gap-2">
                      {!isConnected ? (
                        <button
                          onClick={() => handleConnectIntegration(item.id)}
                          className="text-sm font-semibold text-white px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_0_25px_rgba(99,102,241,0.35)] hover:shadow-[0_0_35px_rgba(99,102,241,0.5)] transition-all"
                        >
                          Connect
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDisconnectIntegration(item.id)}
                          className="text-sm font-medium text-rose-400 px-4 py-2 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 transition-colors"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
