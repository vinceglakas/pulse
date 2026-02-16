"use client";

import Link from "next/link";

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  description: string;
  lastModified: string;
}

const WORKSPACE_ITEMS: FileItem[] = [
  { name: 'SOUL.md', type: 'file', description: 'Your agent\'s personality and identity', lastModified: 'Updated by agent' },
  { name: 'MEMORY.md', type: 'file', description: 'Long-term memory and learned context', lastModified: 'Updated by agent' },
  { name: 'AGENTS.md', type: 'file', description: 'Agent configuration and behavior rules', lastModified: 'Updated by agent' },
  { name: 'LESSONS.md', type: 'file', description: 'Mistakes your agent won\'t repeat', lastModified: 'Updated by agent' },
  { name: 'skills/', type: 'folder', description: 'Installed skill modules', lastModified: 'Updated by agent' },
  { name: 'projects/', type: 'folder', description: 'Project files and artifacts', lastModified: 'Updated by agent' },
];

export default function WorkspacePage() {
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
            <h1 className="text-2xl font-bold text-[#f0f0f5]">Workspace</h1>
            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-medium">
              Ultron
            </span>
          </div>
          <p className="text-sm text-[#8b8b9e]">
            Files and data in your agent's workspace
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
                item.href === '/settings/workspace'
                  ? 'bg-gradient-to-r from-[#06b6d4] to-[#6366f1] text-white'
                  : 'bg-[rgba(255,255,255,0.04)] text-[#8b8b9e] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(6,182,212,0.2)] hover:text-[#f0f0f5]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
          <p className="text-sm text-cyan-400">
            Your agent manages these files automatically. Memory and lessons are updated after every conversation.
          </p>
        </div>

        {/* File List */}
        <div className="space-y-2">
          {WORKSPACE_ITEMS.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-4 rounded-xl px-5 py-4 transition-all hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer"
              style={{
                background: 'rgba(17,17,24,0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Icon */}
              <div className="shrink-0">
                {item.type === 'file' ? (
                  <svg className="w-5 h-5 text-[#8b8b9e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                )}
              </div>

              {/* Name and Description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-[#f0f0f5] truncate">{item.name}</h3>
                </div>
                <p className="text-xs text-[#8b8b9e] mt-0.5">{item.description}</p>
              </div>

              {/* Last Modified */}
              <div className="text-xs text-[#6b6b80] shrink-0">
                {item.lastModified}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#6b6b80]">
            Files are read-only in this view. Editing functionality coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}