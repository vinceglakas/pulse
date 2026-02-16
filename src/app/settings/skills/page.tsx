"use client";

import { useState } from "react";
import Link from "next/link";

const AVAILABLE_SKILLS = [
  { id: 'weather', name: 'Weather', description: 'Get current weather and forecasts', category: 'Data', installed: true },
  { id: 'github', name: 'GitHub', description: 'Interact with GitHub repos, issues, and PRs', category: 'Development', installed: false },
  { id: 'web-search', name: 'Web Search', description: 'Search the web with Brave Search API', category: 'Research', installed: true },
  { id: 'coding-agent', name: 'Coding Agent', description: 'Run coding agents for programmatic tasks', category: 'Development', installed: false },
  { id: 'openai-whisper', name: 'Whisper Transcription', description: 'Transcribe audio via OpenAI Whisper API', category: 'Media', installed: false },
  { id: 'openai-image-gen', name: 'Image Generation', description: 'Generate images via OpenAI Images API', category: 'Media', installed: false },
  { id: 'healthcheck', name: 'Security Healthcheck', description: 'Host security hardening and risk checks', category: 'Security', installed: false },
];

const CATEGORIES = ['All', 'Research', 'Development', 'Media', 'Data', 'Security'];

export default function SkillsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');

  const filteredSkills = AVAILABLE_SKILLS.filter(skill => {
    const matchesCategory = selectedCategory === 'All' || skill.category === selectedCategory;
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleInstall = (skillName: string) => {
    setToast(`Coming soon — skills will be installable in the next update`);
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f0f0f5]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-[#6b6b80] hover:text-[#8b8b9e] transition-colors mb-4 inline-block"
          >
            &larr; Back
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-[#f0f0f5]">Skills</h1>
            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-medium">
              Ultron
            </span>
          </div>
          <p className="text-sm text-[#8b8b9e]">
            Browse and manage capabilities for your agent
          </p>
        </div>

        {/* Settings Nav */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {[
            { href: '/settings/integrations', label: 'Integrations' },
            { href: '/settings/automations', label: 'Automations' },
            { href: '/settings/skills', label: 'Skills' },
            { href: '/settings/workspace', label: 'Workspace' },
            { href: '/settings/memory', label: 'Memory' },
            { href: '/settings/models', label: 'Models' },
            { href: '/settings/keys', label: 'API Keys' },
            { href: '/settings/account', label: 'Account' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                item.href === '/settings/skills'
                  ? 'bg-gradient-to-r from-[#06b6d4] to-[#6366f1] text-white'
                  : 'bg-[rgba(255,255,255,0.04)] text-[#8b8b9e] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(6,182,212,0.2)] hover:text-[#f0f0f5]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-sm text-cyan-400">
            {toast}
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            className="w-full h-[44px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 text-sm text-[#f0f0f5] placeholder:text-[#6b6b80] outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-[#06b6d4] to-[#6366f1] text-white'
                  : 'bg-[rgba(255,255,255,0.04)] text-[#8b8b9e] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(6,182,212,0.2)] hover:text-[#f0f0f5]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSkills.map((skill) => (
            <div
              key={skill.id}
              className="rounded-2xl p-6 transition-all hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
              style={{
                background: 'rgba(17,17,24,0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-[#f0f0f5]">{skill.name}</h3>
                <span className="text-xs bg-[rgba(255,255,255,0.08)] text-[#8b8b9e] px-2 py-1 rounded-full">
                  {skill.category}
                </span>
              </div>
              <p className="text-sm text-[#8b8b9e] mb-4">{skill.description}</p>
              <div className="flex items-center justify-between">
                {skill.installed ? (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full font-medium">
                    Installed
                  </span>
                ) : (
                  <button
                    onClick={() => handleInstall(skill.name)}
                    className="text-sm bg-white text-[#0a0a0f] px-4 py-1.5 rounded-full hover:bg-white/90 transition-colors cursor-pointer font-medium"
                  >
                    Install
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredSkills.length === 0 && (
          <div
            className="text-sm text-[#8b8b9e] rounded-2xl p-6 text-center"
            style={{
              background: 'rgba(17,17,24,0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            No skills found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}