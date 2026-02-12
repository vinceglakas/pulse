'use client';

import UpgradeButton from '../components/UpgradeButton';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    desc: 'Get started with basic research',
    features: [
      '3 briefs per month',
      'Basic research depth',
      'Key themes & sentiment',
      'Community support',
    ],
    cta: 'Current Plan',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    desc: 'Unlimited intelligence for power users',
    features: [
      'Unlimited briefs',
      'Priority deep research',
      'Export & share briefs',
      'Advanced sentiment analysis',
      'Competitor tracking',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
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
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-8 border ${
                tier.highlight
                  ? 'border-purple-300 bg-purple-50 shadow-lg shadow-purple-100'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {tier.highlight && (
                <span className="inline-block text-xs font-semibold bg-purple-600 text-white px-3 py-1 rounded-full mb-4">
                  Most Popular
                </span>
              )}
              <h2 className="text-2xl font-bold text-gray-900">{tier.name}</h2>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-gray-900">{tier.price}</span>
                <span className="text-gray-500">{tier.period}</span>
              </div>
              <p className="mt-2 text-gray-500 text-sm">{tier.desc}</p>

              <ul className="mt-8 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-purple-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {tier.highlight ? (
                  <UpgradeButton className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 px-6 text-sm" />
                ) : (
                  <a
                    href="/search"
                    className="block w-full text-center border border-gray-300 text-gray-700 py-3 px-6 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Get Started Free
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
