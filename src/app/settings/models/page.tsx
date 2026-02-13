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
  { href: '/settings/keys', label: 'API Keys', icon: '🔑' },
  { href: '/settings/models', label: 'Models', icon: '🧠' },
  { href: '/settings/integrations', label: 'Integrations', icon: '🔗' },
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

      // Fetch profile for current model selections
      try {
        const res = await fetch('/api/profile', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.brain_model) setBrainModel(data.brain_model);
        if (data.worker_model) setWorkerModel(data.worker_model);
      } catch {}

      // Fetch available keys to determine providers
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 inline-block">
            ← Back
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold">Model Configuration</h1>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium">
              Multi-Model
            </span>
          </div>
          <p className="text-sm text-gray-500">
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
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : availableProviders.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-gray-400 mb-4">No API keys configured yet. Add at least one API key to configure models.</p>
            <Link
              href="/settings/keys"
              className="inline-block bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              Add API Key →
            </Link>
          </div>
        ) : (
          <>
            {/* Brain Model Section */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-lg shrink-0">
                  🧠
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Brain Model</h2>
                  <p className="text-sm text-gray-500">Used for complex reasoning, strategy, and creative work</p>
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
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: model.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{model.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{model.providerLabel}</span>
                    </div>
                    {brainModel === model.id && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                ))}
                {brainModels.length === 0 && (
                  <p className="text-sm text-gray-500 py-2">No brain-tier models available for your API keys.</p>
                )}
              </div>
            </div>

            {/* Worker Model Section */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-lg shrink-0">
                  ⚡
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Worker Model</h2>
                  <p className="text-sm text-gray-500">Used for fast tasks, data processing, and simple queries</p>
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
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: model.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{model.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{model.providerLabel}</span>
                    </div>
                    {workerModel === model.id && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                ))}
                {workerModels.length === 0 && (
                  <p className="text-sm text-gray-500 py-2">No worker-tier models available for your API keys.</p>
                )}
              </div>
            </div>

            {/* Auto Mode Info Card */}
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-lg">💡</span>
                <div>
                  <h3 className="text-sm font-semibold text-indigo-300 mb-1">Auto Mode</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
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
              className="w-full h-[44px] bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Configuration'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
