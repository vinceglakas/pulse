'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, getAccessToken } from '@/lib/auth';

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'coming-soon';
  configFields?: { key: string; label: string; placeholder: string; type?: string }[];
  requiredPlan: 'agent' | 'ultra';
}

const integrations: Integration[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Message your agent from Telegram. Get proactive alerts and research updates on mobile.',
    status: 'disconnected',
    configFields: [
      { key: 'bot_token', label: 'Bot Token', placeholder: 'Paste your Telegram bot token from @BotFather', type: 'password' },
      { key: 'chat_id', label: 'Your Chat ID', placeholder: 'Your Telegram user ID (get it from @userinfobot)' },
    ],
    requiredPlan: 'ultra',
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Add your agent to any Discord server. Works in DMs and channels.',
    status: 'disconnected',
    configFields: [
      { key: 'bot_token', label: 'Bot Token', placeholder: 'Discord bot token from the Developer Portal', type: 'password' },
      { key: 'guild_id', label: 'Server ID', placeholder: 'Right-click your server → Copy Server ID' },
    ],
    requiredPlan: 'ultra',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Install your agent in your Slack workspace. Mention it in any channel.',
    status: 'coming-soon',
    requiredPlan: 'ultra',
  },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) {
        router.push('/login');
      } else {
        setAuthChecked(true);
        const token = await getAccessToken();
        setAccessToken(token);
        try {
          const res = await fetch('/api/profile', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const data = await res.json();
          setUserPlan(data?.plan || 'free');
        } catch {
          setUserPlan('free');
        }
        // Load saved integrations
        try {
          const res = await fetch('/api/integrations', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            if (data.configs) setConfigs(data.configs);
          }
        } catch {}
      }
    });
  }, [router]);

  const handleSave = async (integrationId: string) => {
    if (!accessToken) return;
    setSaving(integrationId);
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          integrationId,
          config: configs[integrationId] || {},
        }),
      });
      if (res.ok) {
        setSaved(integrationId);
        setTimeout(() => setSaved(null), 3000);
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(null);
    }
  };

  const updateConfig = (integrationId: string, key: string, value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [integrationId]: { ...(prev[integrationId] || {}), [key]: value },
    }));
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-bold text-gray-900">Pulsed</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/search" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Research</Link>
            <Link href="/agent" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Agent</Link>
            <Link href="/settings/keys" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">API Keys</Link>
            <span className="text-sm font-semibold text-gray-900">Integrations</span>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
        <p className="text-gray-500 mb-8">Connect your agent to the platforms where you work. Ultra plan required.</p>

        <div className="space-y-4">
          {integrations.map((integration) => {
            const isExpanded = expandedId === integration.id;
            const hasConfig = configs[integration.id] && Object.values(configs[integration.id]).some(v => v);
            const planAllowed = userPlan === 'ultra' || (userPlan === 'agent' && integration.requiredPlan === 'agent');

            return (
              <div key={integration.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : integration.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-600">{integration.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                        {integration.status === 'coming-soon' && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Coming soon</span>
                        )}
                        {hasConfig && (
                          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Configured</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{integration.description}</p>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                    {!planAllowed ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500 mb-3">This integration requires the Ultra plan.</p>
                        <Link href="/pricing" className="text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600">Upgrade to Ultra</Link>
                      </div>
                    ) : integration.status === 'coming-soon' ? (
                      <p className="text-sm text-gray-500 py-2">This integration is coming soon. We will notify you when it is available.</p>
                    ) : integration.configFields ? (
                      <div className="space-y-4">
                        {integration.configFields.map((field) => (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                            <input
                              type={field.type || 'text'}
                              value={configs[integration.id]?.[field.key] || ''}
                              onChange={(e) => updateConfig(integration.id, field.key, e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-all text-gray-900 placeholder-gray-400"
                            />
                          </div>
                        ))}
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={() => handleSave(integration.id)}
                            disabled={saving === integration.id}
                            className="bg-gray-900 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                          >
                            {saving === integration.id ? 'Saving...' : 'Save'}
                          </button>
                          {saved === integration.id && (
                            <span className="text-sm text-emerald-600 font-medium">Saved successfully</span>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
