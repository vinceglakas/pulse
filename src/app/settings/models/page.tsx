'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, getAccessToken } from '@/lib/auth';

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  providerLabel: string;
  color: string;
  tier: 'brain' | 'worker' | 'both';
}

const ALL_MODELS: ModelOption[] = [
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', provider: 'anthropic', providerLabel: 'Anthropic', color: '#D97757', tier: 'brain' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', providerLabel: 'Anthropic', color: '#D97757', tier: 'both' },
  { id: 'anthropic/claude-haiku-4', name: 'Claude Haiku 4', provider: 'anthropic', providerLabel: 'Anthropic', color: '#D97757', tier: 'worker' },
  { id: 'openai/gpt-4.1', name: 'GPT-4.1', provider: 'openai', providerLabel: 'OpenAI', color: '#10A37F', tier: 'brain' },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai', providerLabel: 'OpenAI', color: '#10A37F', tier: 'worker' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', providerLabel: 'Google', color: '#4285F4', tier: 'brain' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', providerLabel: 'Google', color: '#4285F4', tier: 'worker' },
  { id: 'moonshot/kimi-k2', name: 'Kimi K2', provider: 'moonshot', providerLabel: 'Moonshot', color: '#6366f1', tier: 'brain' },
];

const NAV_ITEMS = [
  { href: '/settings/keys', label: 'API Keys' },
  { href: '/settings/models', label: 'Models' },
  { href: '/settings/integrations', label: 'Integrations' },
];

export default function ModelsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [brainModel, setBrainModel] = useState('');
  const [workerModel, setWorkerModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

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
        if (data.brain_model) setBrainModel(data.brain_model);
        if (data.worker_model) setWorkerModel(data.worker_model);
      } catch {}

      try {
        const res = await fetch('/api/keys', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        const keys = data?.keys || data;
        if (Array.isArray(keys)) {
          setAvailableProviders(keys.map((k: any) => k.provider));
        }
      } catch {}

      setLoading(false);
    });
  }, [router]);

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ brain_model: brainModel, worker_model: workerModel }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const brainModels = ALL_MODELS.filter(
    (m) => (m.tier === 'brain' || m.tier === 'both') && availableProviders.includes(m.provider)
  );
  const workerModels = ALL_MODELS.filter(
    (m) => (m.tier === 'worker' || m.tier === 'both') && availableProviders.includes(m.provider)
  );

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
            <h1 className="text-2xl font-bold text-[#f0f0f5]">Model Configuration</h1>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium">
              Multi-Model
            </span>
          </div>
          <p className="text-sm text-[#8b8b9e]">
            Set up your brain and worker models for different tasks
          </p>
        </div>

        {/* Settings Nav */}
        <div className="flex gap-2 mb-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                item.href === '/settings/models'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white'
                  : 'bg-[rgba(255,255,255,0.04)] text-[#8b8b9e] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(99,102,241,0.2)] hover:text-[#f0f0f5]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-[#6b6b80]">Loading...</div>
        ) : availableProviders.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: 'rgba(17,17,24,0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p className="text-[#8b8b9e] mb-4">No API keys configured yet. Add at least one API key to configure models.</p>
            <Link
              href="/settings/keys"
              className="inline-block text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              Add API Key
            </Link>
          </div>
        ) : (
          <>
            {/* Brain Model Section */}
            <div
              className="rounded-2xl p-6 mb-6"
              style={{
                background: 'rgba(17,17,24,0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z"/>
                    <path d="M10 22h4"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#f0f0f5]">Brain Model</h2>
                  <p className="text-sm text-[#8b8b9e]">Used for complex reasoning, strategy, and creative work</p>
                </div>
              </div>

              <div className="space-y-2">
                {brainModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setBrainModel(model.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                      brainModel === model.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(99,102,241,0.2)]'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: model.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[#f0f0f5]">{model.name}</span>
                      <span className="text-xs text-[#6b6b80] ml-2">{model.providerLabel}</span>
                    </div>
                    {brainModel === model.id && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                ))}
                {brainModels.length === 0 && (
                  <p className="text-sm text-[#6b6b80] py-2">No brain-tier models available for your API keys.</p>
                )}
              </div>
            </div>

            {/* Worker Model Section */}
            <div
              className="rounded-2xl p-6 mb-6"
              style={{
                background: 'rgba(17,17,24,0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#f0f0f5]">Worker Model</h2>
                  <p className="text-sm text-[#8b8b9e]">Used for fast tasks, data processing, and simple queries</p>
                </div>
              </div>

              <div className="space-y-2">
                {workerModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setWorkerModel(model.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                      workerModel === model.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(99,102,241,0.2)]'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: model.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[#f0f0f5]">{model.name}</span>
                      <span className="text-xs text-[#6b6b80] ml-2">{model.providerLabel}</span>
                    </div>
                    {workerModel === model.id && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                ))}
                {workerModels.length === 0 && (
                  <p className="text-sm text-[#6b6b80] py-2">No worker-tier models available for your API keys.</p>
                )}
              </div>
            </div>

            {/* Auto Mode Info Card */}
            <div
              className="rounded-2xl p-5 mb-6"
              style={{
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.15)',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-indigo-300 mb-1">Auto Mode</h3>
                  <p className="text-sm text-[#8b8b9e] leading-relaxed">
                    When set to Auto, your agent picks the best model for each task. Brain model for research and complex questions, worker model for quick tasks and data processing.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full h-[44px] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Configuration'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
