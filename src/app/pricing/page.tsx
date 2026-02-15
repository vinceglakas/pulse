'use client';

import UpgradeButton from '../components/UpgradeButton';

const tiers = [
  {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    desc: 'Your personal AI agent that builds anything',
    features: [
      'Unlimited research briefs',
      'Personal AI agent',
      'BYOLLM — any model, any provider',
      'Web search, code, file management',
      'Autonomous scheduled tasks',
      'Telegram and Discord integrations',
      'Priority support',
    ],
    cta: 'subscribe',
    plan: 'pro',
    highlight: true,
    badge: 'Full Power',
    byollm: true,
    comingSoon: false,
  },
];

const faqs = [
  {
    q: 'What is BYOLLM?',
    a: 'BYOLLM (Bring Your Own LLM) means you connect your own API key from any AI provider — OpenAI, Anthropic, Google, Moonshot, or any OpenAI-compatible endpoint. You pick the model, you control the costs, your data stays in your environment.',
  },
  {
    q: 'Do I need my own API key?',
    a: 'Yes, you\'ll need to bring your own API key from your preferred AI provider. This gives you full control over costs and ensures your data stays in your environment.',
  },
  {
    q: 'What AI models are supported?',
    a: 'Anthropic (Claude Opus, Sonnet, Haiku), OpenAI (GPT-4.1, o4-mini, Codex), Google (Gemini 2.5), Moonshot (Kimi K2), Meta (Llama via OpenRouter), and any OpenAI-compatible API endpoint.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no commitments. Cancel anytime and your subscription stays active through the end of your billing period.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 50%)' }} />

      {/* Nav */}
      <nav className="relative z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-bold" style={{ color: '#f0f0f5' }}>Pulsed</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/search" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>Search</a>
            <a href="/history" className="text-sm transition-colors hover:text-indigo-400" style={{ color: '#8b8b9e' }}>History</a>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="relative z-10 pt-20 pb-16 text-center px-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: '#f0f0f5' }}>
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: '#8b8b9e' }}>
          Get full access to your personal AI agent for $49/month.
        </p>
      </section>

      {/* Cards */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid gap-6 max-w-lg mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="rounded-2xl p-8 relative flex flex-col transition-all duration-300"
              style={{
                background: 'rgba(17,17,24,0.8)',
                backdropFilter: 'blur(20px)',
                border: tier.highlight
                  ? '1px solid rgba(99,102,241,0.4)'
                  : '1px solid rgba(255,255,255,0.06)',
                boxShadow: tier.highlight
                  ? '0 0 40px rgba(99,102,241,0.1), 0 0 80px rgba(139,92,246,0.05)'
                  : 'none',
              }}
              onMouseEnter={(e) => { if (!tier.highlight) e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
              onMouseLeave={(e) => { if (!tier.highlight) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
            >
              {tier.badge && (
                <span
                  className="inline-block text-xs font-semibold text-white px-3 py-1 rounded-full mb-4 w-fit"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  {tier.badge}
                </span>
              )}
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold" style={{ color: '#f0f0f5' }}>{tier.name}</h2>
                {tier.byollm && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide"
                    style={{ background: 'rgba(255,255,255,0.08)', color: '#f0f0f5' }}
                  >
                    BYOLLM
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold" style={{ color: '#f0f0f5' }}>{tier.price}</span>
                <span style={{ color: '#6b6b80' }}>{tier.period}</span>
              </div>
              <p className="mt-2 text-sm" style={{ color: '#8b8b9e' }}>{tier.desc}</p>

              <ul className="mt-8 space-y-3 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm" style={{ color: '#8b8b9e' }}>
                    <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {tier.cta === 'subscribe' ? (
                  <UpgradeButton
                    plan={tier.plan || 'pro'}
                    className={`w-full text-white py-3 px-6 text-sm rounded-lg font-semibold ${tier.highlight ? '' : 'border border-white/10 hover:border-indigo-500/30'}`}
                    label={tier.highlight ? 'Upgrade Now' : 'Get Started'}
                  />
                ) : tier.cta === 'get-started' ? (
                  <a
                    href="/signup"
                    className="block w-full text-center py-3 px-6 rounded-lg text-sm font-semibold transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#f0f0f5',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    Get Started
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-10" style={{ color: '#f0f0f5' }}>Frequently Asked Questions</h2>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="rounded-xl p-6"
              style={{
                background: 'rgba(17,17,24,0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h3 className="font-semibold" style={{ color: '#f0f0f5' }}>{faq.q}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: '#8b8b9e' }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
