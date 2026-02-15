'use client';

import Link from 'next/link';
import { useState } from 'react';

const integrations = [
  { name: 'Google Calendar', dot: '#4285f4' }, { name: 'Gmail', dot: '#ea4335' },
  { name: 'Slack', dot: '#e01e5a' }, { name: 'GitHub', dot: '#f0f0f5' },
  { name: 'Salesforce', dot: '#00a1e0' }, { name: 'Notion', dot: '#f0f0f5' },
  { name: 'Linear', dot: '#5e6ad2' }, { name: 'Figma', dot: '#a259ff' },
  { name: 'HubSpot', dot: '#ff7a59' }, { name: 'Jira', dot: '#0052cc' },
  { name: 'Microsoft 365', dot: '#00a4ef' }, { name: 'Google Drive', dot: '#34a853' },
];

const faqs = [
  { q: "What's BYOLLM?", a: "Bring Your Own LLM. You add your API key from OpenAI, Anthropic, Google, or Moonshot. Your agent uses your key directly — we never store or route your conversations." },
  { q: "How is this different from ChatGPT?", a: "ChatGPT is a chatbot. Your agent is an operating system. It connects to your real tools, remembers your context permanently, and takes actions across your entire stack." },
  { q: "What integrations are available?", a: "Google Calendar, Gmail, Slack, GitHub, Salesforce, Notion, Linear, Figma, HubSpot, Jira, and more launching weekly." },
  { q: "Is my data secure?", a: "Your API keys are encrypted at rest. Your conversations go directly to your LLM provider. We never see, store, or train on your data." },
  { q: "Can I use it on mobile?", a: "Yes. Connect via Telegram and talk to your agent from anywhere. Slack and Discord support coming soon." },
];

const glass = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, backdropFilter: 'blur(20px)' } as const;
const cx = '#22d3ee';

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div style={{ background: '#0a0a0f', color: '#f0f0f5', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 640px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: block !important; }
        }
        @media (min-width: 641px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Pulsed</span>
          {/* Desktop nav */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }} className="hidden-mobile">
            <Link href="/pricing" style={{ color: '#8b8b9e', fontSize: 14, textDecoration: 'none' }}>Pricing</Link>
            <Link href="/login" style={{ color: '#8b8b9e', fontSize: 14, textDecoration: 'none' }}>Log in</Link>
            <Link href="/signup" style={{ background: '#f0f0f5', color: '#0a0a0f', fontSize: 14, fontWeight: 600, padding: '8px 20px', borderRadius: 8, textDecoration: 'none' }}>Get Started</Link>
          </div>
          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="show-mobile" style={{ background: 'none', border: 'none', color: '#f0f0f5', fontSize: 24, cursor: 'pointer', display: 'none' }}>
            {mobileMenu ? '\u2715' : '\u2630'}
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenu && (
          <div className="show-mobile" style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link href="/pricing" onClick={() => setMobileMenu(false)} style={{ color: '#8b8b9e', fontSize: 15, textDecoration: 'none', padding: '8px 0' }}>Pricing</Link>
            <Link href="/login" onClick={() => setMobileMenu(false)} style={{ color: '#8b8b9e', fontSize: 15, textDecoration: 'none', padding: '8px 0' }}>Log in</Link>
            <Link href="/signup" onClick={() => setMobileMenu(false)} style={{ background: '#f0f0f5', color: '#0a0a0f', fontSize: 15, fontWeight: 600, padding: '12px 20px', borderRadius: 8, textDecoration: 'none', textAlign: 'center' }}>Get Started</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '140px 24px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 48, alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 20 }}>
            Your own<br />AI agent.
          </h1>
          <p style={{ fontSize: 18, color: '#8b8b9e', lineHeight: 1.6, marginBottom: 36, maxWidth: 460 }}>
            Connects to every tool you use. Learns how you work. Makes you radically more efficient.
          </p>
          <div style={{ display: 'flex', gap: 14 }}>
            <Link href="/signup" style={{ background: '#f0f0f5', color: '#0a0a0f', fontSize: 15, fontWeight: 600, padding: '13px 28px', borderRadius: 10, textDecoration: 'none' }}>Get Started</Link>
            <a href="#how" style={{ color: '#f0f0f5', fontSize: 15, fontWeight: 500, padding: '13px 28px', borderRadius: 10, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)' }}>See how it works</a>
          </div>
        </div>
        {/* Chat mockup */}
        <div style={{ ...glass, padding: 0, overflow: 'hidden', boxShadow: '0 0 60px rgba(6,182,212,0.06)', maxWidth: 440 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3ee' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Agent</span>
            <span style={{ fontSize: 11, color: '#5a5a6e', marginLeft: 'auto' }}>Online</span>
          </div>
          <div style={{ padding: '20px 20px 12px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 240 }}>
            <div style={{ alignSelf: 'flex-end', background: 'rgba(255,255,255,0.06)', borderRadius: '14px 14px 4px 14px', padding: '10px 16px', fontSize: 13, maxWidth: '85%', color: '#c0c0d0' }}>
              Prep me for my 2pm meeting with Sarah
            </div>
            <div style={{ alignSelf: 'flex-start', borderLeft: `2px solid ${cx}`, paddingLeft: 14, fontSize: 13, color: '#8b8b9e', maxWidth: '85%', lineHeight: 1.5 }}>
              Found your meeting. Sarah Chen, VP Product at Acme. Checking your last 3 emails and CRM notes...
            </div>
            <div style={{ alignSelf: 'flex-start', borderLeft: `2px solid ${cx}`, paddingLeft: 14, fontSize: 13, color: '#c0c0d0', maxWidth: '85%', lineHeight: 1.5 }}>
              <strong style={{ color: '#f0f0f5' }}>Here&apos;s your prep:</strong> She mentioned Q2 roadmap concerns last Tuesday. Your deal is at $45k, proposal stage. I drafted 3 talking points and pulled her LinkedIn updates.
            </div>
          </div>
          <div style={{ padding: '12px 20px 16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#5a5a6e' }}>
              Message your agent...
            </div>
          </div>
        </div>
      </section>

      {/* Integration pills */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
        <p style={{ textAlign: 'center', fontSize: 14, color: cx, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24 }}>Connects to your entire stack</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {integrations.map(i => (
            <span key={i.name} style={{ ...glass, borderRadius: 20, padding: '8px 16px', fontSize: 13, color: '#c0c0d0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: i.dot, flexShrink: 0 }} />
              {i.name}
            </span>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#5a5a6e', fontSize: 13, marginTop: 16 }}>And we&apos;re adding more every week.</p>
      </section>

      {/* How it works — timeline */}
      <section id="how" style={{ maxWidth: 700, margin: '0 auto', padding: '80px 24px' }}>
        <p style={{ fontSize: 14, color: cx, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 48 }}>How it works</p>
        {[
          { n: '01', t: 'Connect your tools', d: 'Two clicks to link Gmail, Slack, Salesforce, or any tool in your stack. Your agent sees everything, securely.' },
          { n: '02', t: 'Your agent learns you', d: 'Goals, patterns, preferences, contacts. Every conversation makes it smarter. It never forgets.' },
          { n: '03', t: 'One command, every tool', d: '"Prep for my meeting, update the deal, and draft the follow-up." One sentence. Three tools. Done.' },
        ].map((s, i) => (
          <div key={s.n} style={{ display: 'flex', gap: 24, marginBottom: i < 2 ? 40 : 0, position: 'relative' }}>
            {i < 2 && <div style={{ position: 'absolute', left: 19, top: 40, bottom: -40, width: 1, background: 'rgba(255,255,255,0.06)' }} />}
            <span style={{ fontSize: 28, fontWeight: 700, color: cx, fontFamily: 'monospace', lineHeight: 1, flexShrink: 0, width: 40 }}>{s.n}</span>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6, letterSpacing: '-0.01em' }}>{s.t}</h3>
              <p style={{ color: '#8b8b9e', lineHeight: 1.6, fontSize: 15 }}>{s.d}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Use cases */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
        <p style={{ fontSize: 14, color: cx, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>Use cases</p>
        <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: 48 }}>What your agent does for you</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { t: 'Meeting prep', d: 'Checks your calendar, pulls email history, recalls past conversations, drafts talking points. All before you walk in.' },
            { t: 'Cross-tool workflows', d: 'Update Salesforce, send the Slack message, log the activity, schedule the follow-up. One command.' },
            { t: 'Research & intelligence', d: 'Deep research across Reddit, Hacker News, X, YouTube, and the web. Real insights, not summaries of summaries.' },
            { t: 'Memory that compounds', d: 'Your agent remembers every preference, every contact, every decision. It gets better every single day.' },
          ].map(c => (
            <div key={c.t} style={{ ...glass, padding: 28 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{c.t}</h3>
              <p style={{ color: '#8b8b9e', fontSize: 14, lineHeight: 1.6 }}>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BYOLLM trust */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}>Your data. Your model.<br />Your agent.</h2>
            <p style={{ color: '#8b8b9e', lineHeight: 1.7, fontSize: 15 }}>
              Bring your own API key from OpenAI, Anthropic, Google, or Moonshot. Your conversations never touch our servers. Swap models anytime. No vendor lock-in.
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              {['Claude', 'GPT-4', 'Gemini', 'Kimi'].map(m => (
                <span key={m} style={{ ...glass, borderRadius: 20, padding: '8px 18px', fontSize: 14, fontWeight: 500, color: '#c0c0d0' }}>{m}</span>
              ))}
            </div>
            <p style={{ color: '#5a5a6e', fontSize: 13 }}>Enterprise-grade encryption. You own everything.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px' }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: 48 }}>Simple pricing</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Pro */}
          <div style={{ ...glass, padding: 32 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#8b8b9e', marginBottom: 8 }}>Pro</p>
            <p style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 20 }}>$49<span style={{ fontSize: 16, color: '#5a5a6e', fontWeight: 400 }}>/mo</span></p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Your own AI agent', '12+ tool integrations', 'Persistent memory', 'Telegram connectivity', 'Multi-model support', 'Unlimited conversations'].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#c0c0d0' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke={cx} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup?plan=pro" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', color: '#f0f0f5', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Start free trial</Link>
          </div>
          {/* Ultra */}
          <div style={{ ...glass, padding: 32, border: '1px solid rgba(6,182,212,0.3)', boxShadow: '0 0 40px rgba(6,182,212,0.06)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: cx, marginBottom: 8 }}>Ultra</p>
            <p style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 20 }}>$199<span style={{ fontSize: 16, color: '#5a5a6e', fontWeight: 400 }}>/mo</span></p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Everything in Pro', 'Advanced integrations', 'Multi-model routing', 'Priority support', 'Custom agent personality', 'API access'].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#c0c0d0' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke={cx} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup?plan=ultra" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: 10, background: '#f0f0f5', color: '#0a0a0f', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Start free trial</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '80px 24px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: 40 }}>Questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', background: 'none', border: 'none', color: '#f0f0f5', fontSize: 15, fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}
              >
                {f.q}
                <span style={{ color: '#5a5a6e', fontSize: 18, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
              </button>
              {openFaq === i && (
                <p style={{ color: '#8b8b9e', fontSize: 14, lineHeight: 1.6, padding: '0 0 18px', margin: 0 }}>{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ textAlign: 'center', padding: '80px 24px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 24, position: 'relative' }}>Ready to get your own AI agent?</h2>
        <Link href="/signup" style={{ background: '#f0f0f5', color: '#0a0a0f', fontSize: 15, fontWeight: 600, padding: '14px 32px', borderRadius: 10, textDecoration: 'none', position: 'relative' }}>Start free trial</Link>
      </section>

      {/* Footer */}
      <footer style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 48px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ fontSize: 13, color: '#3a3a4a' }}>Pulsed 2026</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link href="/privacy" style={{ fontSize: 13, color: '#3a3a4a', textDecoration: 'none' }}>Privacy</Link>
          <Link href="/terms" style={{ fontSize: 13, color: '#3a3a4a', textDecoration: 'none' }}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}
