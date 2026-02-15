'use client';

import { useState, useEffect } from 'react';
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
  // Anthropic
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', provider: 'anthropic', providerLabel: 'Anthropic', color: '#D97757', tier: 'brain' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', providerLabel: 'Anthropic', color: '#D97757', tier: 'both' },
  { id: 'anthropic/claude-haiku-4', name: 'Claude Haiku 4', provider: 'anthropic', providerLabel: 'Anthropic', color: '#D97757', tier: 'worker' },
  // OpenAI
  { id: 'openai/gpt-4.1', name: 'GPT-4.1', provider: 'openai', providerLabel: 'OpenAI', color: '#10A37F', tier: 'brain' },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai', providerLabel: 'OpenAI', color: '#10A37F', tier: 'worker' },
  { id: 'openai/gpt-5.1-codex', name: 'GPT-5.1 Codex', provider: 'openai', providerLabel: 'OpenAI', color: '#10A37F', tier: 'brain' },
  // Google
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', providerLabel: 'Google', color: '#4285F4', tier: 'brain' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', providerLabel: 'Google', color: '#4285F4', tier: 'worker' },
  // Moonshot
  { id: 'moonshot/kimi-k2', name: 'Kimi K2', provider: 'moonshot', providerLabel: 'Moonshot', color: '#6366f1', tier: 'both' },
];

const NAV_ITEMS = [
  { href: '/settings/keys', label: 'API Keys' },
  { href: '/settings/models', label: 'Models' },
  { href: '/settings/integrations', label: 'Integrations' },
];

function ModelSelector({
  label,
  description,
  icon,
  iconGradient,
  models,
  selected,
  onSelect,
  note,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  iconGradient: string;
  models: ModelOption[];
  selected: string;
  onSelect: (id: string) => void;
  note?: string;
}) {
  return (
    <div
      className="rounded-2xl p-6 mb-6"
      style={{
        background: 'rgba(17,17,24,0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-start gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: iconGradient }}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#f0f0f5]">{label}</h2>
          <p className="text-sm text-[#8b8b9e]">{description}</p>
          {note && (
            <p className="text-xs text-cyan-400/70 mt-1">{note}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {models.map((model) => (
          <button
            key={model.id}
            type="button"
            onClick={() => onSelect(model.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
              selected === model.id
                ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-cyan-500/10'
                : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(6,182,212,0.2)]'
            }`}
          >
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: model.color }} />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-[#f0f0f5]">{model.name}</span>
              <span className="text-xs text-[#6b6b80] ml-2">{model.providerLabel}</span>
            </div>
            {selected === model.id && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </button>
        ))}
        {models.length === 0 && (
          <p className="text-sm text-[#6b6b80] py-2">No models available for your API keys.</p>
        )}
      </div>
    </div>
  );
}

export default function ModelsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [brainModel, setBrainModel] = useState('');
  const [workerModel, setWorkerModel] = useState('');
  const [subagentModel, setSubagentModel] = useState('');
  const [heartbeatModel, setHeartbeatModel] = useState('');
  const [fallbackModels, setFallbackModels] = useState<string[]>([]);
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
        if (data.subagent_model) setSubagentModel(data.subagent_model);
        if (data.heartbeat_model) setHeartbeatModel(data.heartbeat_model);
        if (data.fallback_models) setFallbackModels(data.fallback_models);
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
        body: JSON.stringify({
          brain_model: brainModel,
          worker_model: workerModel,
          subagent_model: subagentModel,
          heartbeat_model: heartbeatModel,
          fallback_models: fallbackModels,
        }),
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
  const allAvailable = ALL_MODELS.filter((m) => availableProviders.includes(m.provider));

  const addFallback = (id: string) => {
    if (id && !fallbackModels.includes(id)) {
      setFallbackModels([...fallbackModels, id]);
    }
  };
  const removeFallback = (index: number) => {
    setFallbackModels(fallbackModels.filter((_, i) => i !== index));
  };

  const getModel = (id: string) => ALL_MODELS.find((m) => m.id === id);

  // Build the full chain for visualization
  const chainItems: { label: string; model: ModelOption | undefined }[] = [];
  if (brainModel) chainItems.push({ label: 'Main', model: getModel(brainModel) });
  fallbackModels.forEach((id, i) => chainItems.push({ label: `Fallback ${i + 1}`, model: getModel(id) }));

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
            <h1 className="text-2xl font-bold text-[#f0f0f5]">Model Configuration</h1>
            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-medium">
              Multi-Model
            </span>
          </div>
          <p className="text-sm text-[#8b8b9e]">
            Configure models for each role in your agent system
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
                  ? 'bg-gradient-to-r from-[#06b6d4] to-[#6366f1] text-white'
                  : 'bg-[rgba(255,255,255,0.04)] text-[#8b8b9e] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(6,182,212,0.2)] hover:text-[#f0f0f5]'
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
              style={{ background: 'linear-gradient(135deg, #06b6d4, #6366f1)' }}
            >
              Add API Key
            </Link>
          </div>
        ) : (
          <>
            {/* Main Model */}
            <ModelSelector
              label="Main Model"
              description="Used for complex reasoning, strategy, and creative work"
              iconGradient="linear-gradient(135deg, #06b6d4, #6366f1)"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z"/>
                  <path d="M10 22h4"/>
                </svg>
              }
              models={brainModels}
              selected={brainModel}
              onSelect={setBrainModel}
            />

            {/* Sub-agent Model */}
            <ModelSelector
              label="Sub-agent Model"
              description="Used for delegated tasks and parallel work"
              iconGradient="linear-gradient(135deg, #06b6d4, #6366f1)"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              }
              models={allAvailable}
              selected={subagentModel}
              onSelect={setSubagentModel}
            />

            {/* Worker Model */}
            <ModelSelector
              label="Worker Model"
              description="Used for fast tasks, data processing, and simple queries"
              iconGradient="linear-gradient(135deg, #06b6d4, #22d3ee)"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              }
              models={workerModels}
              selected={workerModel}
              onSelect={setWorkerModel}
            />

            {/* Heartbeat Model */}
            <ModelSelector
              label="Heartbeat Model"
              description="Used for periodic health checks and monitoring"
              iconGradient="linear-gradient(135deg, #06b6d4, #6366f1)"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              }
              models={allAvailable}
              selected={heartbeatModel}
              onSelect={setHeartbeatModel}
              note="Pick something cheap. This runs frequently."
            />

            {/* Fallback Chain */}
            <div
              className="rounded-2xl p-6 mb-6"
              style={{
                background: 'rgba(17,17,24,0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-start gap-3 mb-5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #f59e0b)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#f0f0f5]">Fallback Chain</h2>
                  <p className="text-sm text-[#8b8b9e]">If the main model fails, try these in order</p>
                </div>
              </div>

              {/* Chain Visualization */}
              {chainItems.length > 0 && (
                <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-2">
                  {chainItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 shrink-0">
                      {i > 0 && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14"/>
                          <path d="M12 5l7 7-7 7"/>
                        </svg>
                      )}
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)]"
                        style={{ background: item.model ? `${item.model.color}15` : 'rgba(255,255,255,0.03)' }}
                      >
                        {item.model && (
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.model.color }} />
                        )}
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-[#6b6b80] block leading-none mb-0.5">{item.label}</span>
                          <span className="text-xs font-medium text-[#f0f0f5]">{item.model?.name || 'Not set'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {chainItems.length === 0 && (
                    <p className="text-sm text-[#6b6b80]">Set a main model to see the chain</p>
                  )}
                </div>
              )}

              {/* Fallback list */}
              <div className="space-y-2 mb-4">
                {fallbackModels.map((id, i) => {
                  const model = getModel(id);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
                    >
                      {model && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: model.color }} />}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-[#6b6b80] mr-2">Fallback {i + 1}</span>
                        <span className="text-sm font-medium text-[#f0f0f5]">{model?.name || id}</span>
                        {model && <span className="text-xs text-[#6b6b80] ml-2">{model.providerLabel}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFallback(i)}
                        className="text-[#6b6b80] hover:text-rose-400 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add fallback */}
              {allAvailable.filter((m) => !fallbackModels.includes(m.id) && m.id !== brainModel).length > 0 && (
                <select
                  className="w-full bg-[#0a0a12] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#f0f0f5] focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-indigo-500/40 appearance-none cursor-pointer"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addFallback(e.target.value);
                  }}
                >
                  <option value="" disabled>+ Add fallback model...</option>
                  {allAvailable
                    .filter((m) => !fallbackModels.includes(m.id) && m.id !== brainModel)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.providerLabel})
                      </option>
                    ))}
                </select>
              )}
            </div>

            {/* Auto Mode Info Card */}
            <div
              className="rounded-2xl p-5 mb-6"
              style={{
                background: 'rgba(6,182,212,0.08)',
                border: '1px solid rgba(6,182,212,0.15)',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-cyan-400 mb-1">Auto Mode</h3>
                  <p className="text-sm text-[#8b8b9e] leading-relaxed">
                    Your agent automatically routes tasks to the right model. Main for complex reasoning, sub-agent for parallel work, worker for quick tasks, and heartbeat for periodic checks. If the main model fails, the fallback chain kicks in.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full h-[44px] bg-white text-[#0a0a0f] text-sm font-medium rounded-xl hover:bg-white/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Configuration'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
