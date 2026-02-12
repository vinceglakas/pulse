'use client';

import UpgradeButton from '../components/UpgradeButton';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    desc: 'Get started with basic research',
    features: [
      '3 research briefs/month',
      'Basic insights',
    ],
    cta: 'get-started',
    highlight: false,
    badge: null,
    byollm: false,
    comingSoon: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    desc: 'Full intelligence for power users',
    features: [
      '50 research briefs/month',
      'All personas (Analyst, Sales, Marketing, Creator)',
      'Search history & bookmarks',
    ],
    cta: 'subscribe',
    highlight: false,
    badge: null,
    byollm: false,
    comingSoon: false,
  },
  {
    name: 'Agent',
    price: '$49',
    period: '/mo',
    desc: 'Your personal AI research agent',
    features: [
      'Everything in Pro',
      'Personal AI agent (powered by OpenClaw)',
      'BYOLLM — bring your own API key',
      'Web search, code execution, file workspace',
      'Chat interface at /agent',
    ],
    cta: 'coming-soon',
    highlight: true,
    badge: 'Most Popular',
    byollm: true,
    comingSoon: true,
  },
  {
    name: 'Ultra',
    price: '$99',
    period: '/mo',
    desc: 'Unlimited power, fully autonomous',
    features: [
      'Everything in Agent',
      'Unlimited research briefs',
      'Autonomous tasks & cron jobs',
      'Telegram/Discord/Slack integrations',
      'Priority compute',
    ],
    cta: 'coming-soon',
    highlight: false,
    badge: null,
    byollm: true,
    comingSoon: true,
  },
];

const faqs = [
  {
    q: 'What is BYOLLM?',
    a: 'BYOLLM (Bring Your Own LLM) lets you connect your own API keys from providers like OpenAI, Anthropic, Google, and others. You get full control over which models power your research agent.',
  },
  {
    q: 'Do I need my own API key?',
    a: 'No — Agent and Ultra tiers include a generous default allocation. BYOLLM is optional for users who want to use specific models or their own existing API credits.',
  },
  {
    q: 'What AI models are supported?',
    a: 'We support OpenAI (GPT-4o, o1), Anthropic (Claude), Google (Gemini), and many open-source models via OpenRouter. Bring any OpenAI-compatible endpoint.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-bold">Pulsed</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/search" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Search</a>
            <a href="/history" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">History</a>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-20 pb-16 text-center px-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
          Start free. Upgrade when you need unlimited research power.
        </p>
      </section>

      {/* Cards */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-8 border relative flex flex-col ${
                tier.highlight
                  ? 'border-indigo-400 bg-indigo-50 shadow-lg shadow-indigo-100 ring-2 ring-indigo-400'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {tier.badge && (
                <span className="inline-block text-xs font-semibold bg-indigo-600 text-white px-3 py-1 rounded-full mb-4 w-fit">
                  {tier.badge}
                </span>
              )}
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{tier.name}</h2>
                {tier.byollm && (
                  <span className="text-[10px] font-bold bg-gray-900 text-white px-2 py-0.5 rounded-md uppercase tracking-wide">
                    BYOLLM
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-gray-900">{tier.price}</span>
                <span className="text-gray-500">{tier.period}</span>
              </div>
              <p className="mt-2 text-gray-500 text-sm">{tier.desc}</p>

              <ul className="mt-8 space-y-3 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {tier.cta === 'subscribe' ? (
                  <UpgradeButton className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 px-6 text-sm" />
                ) : tier.cta === 'get-started' ? (
                  <a
                    href="/signup"
                    className="block w-full text-center border border-gray-300 text-gray-700 py-3 px-6 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Get Started
                  </a>
                ) : (
                  <div className="text-center">
                    <button
                      disabled
                      className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded-lg text-sm font-semibold cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                    <p className="mt-2 text-xs text-gray-400">Launching Feb 17</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q} className="border border-gray-200 rounded-xl p-6 bg-gray-50">
              <h3 className="font-semibold text-gray-900">{faq.q}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
