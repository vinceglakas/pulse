'use client';

import UpgradeButton from '../components/UpgradeButton';

const tiers = [
  {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    desc: 'Your personal AI agent — builds, researches, automates',
    features: [
      '1 personal AI agent with memory',
      'BYOLLM — any model, any provider',
      'Multi-model routing with fallback',
      'All integrations',
      'Telegram connectivity',
      'Autonomous scheduled tasks',
      'Web search, code, file management',
      'Priority support',
    ],
    cta: 'subscribe',
    plan: 'pro',
    highlight: true,
  },
  {
    name: 'Ultra',
    price: '$199',
    period: '/mo',
    desc: 'For teams and power users',
    features: [
      'Everything in Pro',
      '5 AI agents',
      'Priority model routing',
      'Advanced integrations',
      'Unlimited tasks',
      '1M context memory',
      'API access',
      'Dedicated support',
    ],
    cta: 'subscribe',
    plan: 'ultra',
    highlight: false,
  },
];

const faqs = [
  {
    q: 'What is BYOLLM?',
    a: 'Bring Your Own LLM. Connect your API key from any provider — Anthropic, OpenAI, Google, Moonshot, or any OpenAI-compatible endpoint. You pick the model, control costs, and keep your data in your environment.',
  },
  {
    q: 'Do I need my own API key?',
    a: 'Yes. This gives you full control over costs and ensures your data never leaves your environment.',
  },
  {
    q: 'What AI models are supported?',
    a: 'Claude (Opus, Sonnet, Haiku), GPT-4.1, Codex, Gemini 2.5, Kimi K2, Llama via OpenRouter, and any OpenAI-compatible endpoint.',
  },
  {
    q: 'What is multi-model routing?',
    a: 'Your agent uses different models for different tasks. A powerful model for complex reasoning, a fast model for quick tasks, a cheap model for background checks. Automatic fallback if one is unavailable.',
  },
  {
    q: 'Can I talk to my agent on Telegram?',
    a: 'Yes. Connect your Telegram account and message your agent from your phone. Alerts, research updates, and task completions — wherever you are.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts. Cancel anytime, stays active through end of billing period.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f0f0f5]">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.04]" style={{ background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">Pulsed</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </a>
          <div className="flex items-center gap-6">
            <a href="/agent" className="text-sm text-[#8b8b9e] hover:text-white transition-colors duration-300">Agent</a>
            <a href="/login" className="text-sm text-[#8b8b9e] hover:text-white transition-colors duration-300">Sign in</a>
            <a href="/signup" className="text-sm px-4 py-1.5 rounded-lg bg-white text-[#0a0a0f] font-medium hover:bg-white/90 transition-colors duration-300">Get Started</a>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16 text-center px-6">
        <span className="text-xs uppercase tracking-[0.2em] text-[#6b6b80]">Pricing</span>
        <h1 className="text-3xl md:text-4xl font-bold text-white mt-3">
          Simple, transparent pricing.
        </h1>
        <p className="mt-3 text-sm text-[#8b8b9e] max-w-md mx-auto">
          Start free for 7 days. No credit card required.
        </p>
      </section>

      {/* Cards */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="rounded-xl p-6 relative flex flex-col transition-all duration-300"
              style={{
                background: 'rgba(17,17,24,0.6)',
                backdropFilter: 'blur(24px)',
                border: tier.highlight
                  ? '2px solid rgba(6,182,212,0.5)'
                  : '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = tier.highlight ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = tier.highlight ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.06)'; }}
            >
              {tier.highlight && (
                <div className="absolute top-4 right-4 text-[10px] px-2 py-0.5 rounded-full text-[#0a0a0f] bg-cyan-400 font-medium">Most Popular</div>
              )}
              <h2 className="text-base font-bold text-white">{tier.name}</h2>
              <div className="mt-2 mb-5">
                <span className="text-3xl font-bold text-white">{tier.price}</span>
                <span className="text-sm text-[#6b6b80]">{tier.period}</span>
              </div>

              <ul className="space-y-2 text-sm text-[#8b8b9e] mb-6 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-xs text-cyan-400">—</span>{f}
                  </li>
                ))}
              </ul>

              <div>
                {tier.highlight ? (
                  <UpgradeButton
                    plan={tier.plan}
                    className="w-full py-2.5 rounded-lg bg-white text-[#0a0a0f] text-sm font-medium hover:bg-white/90 transition-colors duration-300"
                    label="Get Started"
                  />
                ) : (
                  <UpgradeButton
                    plan={tier.plan}
                    className="w-full py-2.5 rounded-lg border border-white/10 text-sm text-white hover:border-white/20 hover:bg-white/5 transition-all duration-300"
                    label="Get Started"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-6 pb-24">
        <h2 className="text-lg font-bold text-white text-center mb-8">Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="rounded-xl p-5 transition-all duration-300"
              style={{
                background: 'rgba(17,17,24,0.6)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h3 className="text-sm font-bold text-white">{faq.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#8b8b9e]">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-6 border-t border-white/[0.04] text-center">
        <p className="text-xl font-bold text-white mb-4">Your agent is waiting.</p>
        <a href="/signup" className="inline-block px-8 py-3 rounded-lg bg-white text-[#0a0a0f] font-medium text-sm hover:bg-white/90 transition-colors duration-300">Get Started</a>
        <p className="text-xs text-[#6b6b80] mt-4">Pro $49/mo · Cancel anytime</p>
      </section>
    </div>
  );
}
