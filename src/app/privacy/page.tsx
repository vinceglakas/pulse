export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">Pulsed</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          </a>
          <a href="/signup" className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            Get Started
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm mb-10" style={{ color: '#6b6b80' }}>Last updated: February 14, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: '#8b8b9e' }}>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
            <p className="mb-3"><strong className="text-white">Account Information:</strong> When you sign up, we collect your email address and name. If you sign in with Google, we receive your basic profile information from Google.</p>
            <p className="mb-3"><strong className="text-white">API Keys:</strong> If you connect your own LLM provider (BYOLLM), your API keys are encrypted using AES-256 encryption and stored in our database. We never log, share, or use your API keys for any purpose other than routing your requests to your chosen provider.</p>
            <p className="mb-3"><strong className="text-white">Usage Data:</strong> We collect basic usage metrics such as number of briefs generated, features used, and session data to improve the Service.</p>
            <p><strong className="text-white">Research Data:</strong> Search queries and generated briefs are stored in your account to provide search history and saved briefs functionality.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <p>We use your information to: (a) provide and improve the Service; (b) process subscriptions and billing; (c) send important account notifications; (d) analyze usage patterns to improve features. We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. BYOLLM &amp; Data Processing</h2>
            <p className="mb-3">When you use BYOLLM, your queries are sent directly to your chosen AI provider using your API key. We act as a pass-through — your prompts and AI responses are processed by your provider under their privacy policy.</p>
            <p>For free tier users, queries are processed using our platform API keys. In this case, we may use anonymized, aggregated query patterns to improve our research engine. Individual queries are never shared or sold.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Data Storage &amp; Security</h2>
            <p className="mb-3">Your data is stored on Supabase (PostgreSQL) with row-level security enabled. Each user can only access their own data. API keys are encrypted at rest using AES-256.</p>
            <p>We use HTTPS for all data transmission. Our infrastructure runs on Vercel (frontend) and Fly.io (agent backend), both of which maintain SOC 2 compliance.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong className="text-white">Supabase</strong> — Authentication and database</li>
              <li><strong className="text-white">Stripe</strong> — Payment processing</li>
              <li><strong className="text-white">Vercel</strong> — Frontend hosting</li>
              <li><strong className="text-white">Fly.io</strong> — Agent backend hosting</li>
              <li><strong className="text-white">Your LLM Provider</strong> — AI processing (when using BYOLLM)</li>
            </ul>
            <p className="mt-3">Each service has its own privacy policy. We only share the minimum data necessary for each service to function.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We do not use tracking cookies or third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Your Rights</h2>
            <p>You have the right to: (a) access your personal data; (b) correct inaccurate data; (c) delete your account and all associated data; (d) export your data; (e) withdraw consent for data processing. To exercise any of these rights, contact us at <a href="mailto:hello@runpulsed.ai" className="text-indigo-400 hover:text-indigo-300">hello@runpulsed.ai</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Data Retention</h2>
            <p>We retain your data for as long as your account is active. If you delete your account, all personal data is removed within 30 days. Anonymized, aggregated analytics data may be retained indefinitely.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Children&apos;s Privacy</h2>
            <p>Pulsed is not intended for users under 13 years of age. We do not knowingly collect data from children.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. We will notify users of material changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Contact</h2>
            <p>For privacy-related questions, contact us at <a href="mailto:hello@runpulsed.ai" className="text-indigo-400 hover:text-indigo-300">hello@runpulsed.ai</a>.</p>
          </section>
        </div>
      </main>

      <footer className="py-8 text-center text-xs" style={{ color: '#6b6b80', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p>&copy; 2026 Pulsed. All rights reserved. &middot; <a href="/privacy" className="hover:text-white transition-colors">Privacy</a> &middot; <a href="/terms" className="hover:text-white transition-colors">Terms</a></p>
      </footer>
    </div>
  );
}
