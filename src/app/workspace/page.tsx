'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, getAccessToken } from '@/lib/auth';
import { Artifact, ArtifactRow, dbToArtifact } from '@/lib/artifacts';
import ArtifactRenderer from '@/components/artifacts/ArtifactRenderer';

type SidebarSection = 'tables' | 'boards' | 'lists' | 'docs' | 'apps';

const SECTION_CONFIG: Record<SidebarSection, { label: string; types: string[]; icon: string }> = {
  tables: { label: 'Tables', types: ['table'], icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm11 0h7v7h-7v-7z' },
  boards: { label: 'Boards', types: ['kanban'], icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18' },
  lists: { label: 'Lists', types: ['list'], icon: 'M9 5l7 7-7 7' },
  docs: { label: 'Documents', types: ['document'], icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' },
  apps: { label: 'Apps', types: ['app_marker'], icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
};

const NEW_TEMPLATES: { type: string; label: string; iconPath: string }[] = [
  { type: 'table', label: 'Table', iconPath: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm11 0h7v7h-7v-7z' },
  { type: 'kanban', label: 'Board', iconPath: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18' },
  { type: 'list', label: 'List', iconPath: 'M9 5l7 7-7 7' },
  { type: 'document', label: 'Document', iconPath: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' },
];

export default function WorkspacePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNewMenu, setShowNewMenu] = useState(false);

  const selected = artifacts.find(a => a.id === selectedId) || null;

  const fetchArtifacts = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/artifacts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setArtifacts((data.artifacts || []).map(dbToArtifact));
      }
    } catch {}
  }, []);

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) { router.push('/login'); return; }
      setAuthChecked(true);
      const token = await getAccessToken();
      setAccessToken(token);
      if (token) await fetchArtifacts(token);
      setLoading(false);
    });
  }, [router, fetchArtifacts]);

  const apiCall = async (method: string, body?: any, params?: string) => {
    if (!accessToken) return null;
    const url = '/api/artifacts' + (params || '');
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res.ok ? res.json() : null;
  };

  const createArtifact = async (type: string) => {
    setShowNewMenu(false);
    const defaults: any = { type, name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}` };
    if (type === 'table') {
      defaults.icon = 'table';
      defaults.columns = [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'status', label: 'Status', type: 'badge', options: ['Active', 'Inactive'] },
        { key: 'email', label: 'Email', type: 'email' },
      ];
      defaults.rows = [];
    } else if (type === 'kanban') {
      defaults.icon = 'board';
      defaults.groupBy = 'status';
      defaults.columns = [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'status', label: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] },
      ];
      defaults.rows = [];
    } else if (type === 'list') {
      defaults.icon = 'list';
      defaults.rows = [];
    } else if (type === 'document') {
      defaults.icon = 'doc';
      defaults.content = '';
    }
    const result = await apiCall('POST', defaults);
    if (result?.artifact) {
      const newArt = dbToArtifact(result.artifact);
      setArtifacts(prev => [newArt, ...prev]);
      setSelectedId(newArt.id);
    }
  };

  const updateRows = async (rows: ArtifactRow[]) => {
    if (!selected) return;
    setArtifacts(prev => prev.map(a => a.id === selected.id ? { ...a, rows } : a));
    await apiCall('PATCH', { id: selected.id, rows });
  };

  const updateContent = async (content: string) => {
    if (!selected) return;
    setArtifacts(prev => prev.map(a => a.id === selected.id ? { ...a, content } : a));
    await apiCall('PATCH', { id: selected.id, content });
  };

  const deleteArtifact = async () => {
    if (!selected) return;
    setArtifacts(prev => prev.filter(a => a.id !== selected.id));
    setSelectedId(null);
    await apiCall('DELETE', undefined, `?id=${selected.id}`);
  };

  const toggleSection = (s: string) => setCollapsed(prev => ({ ...prev, [s]: !prev[s] }));

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f', color: '#f0f0f5' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: 'rgba(10,10,15,0.85)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg transition-colors lg:hidden"
              style={{ color: '#8b8b9e' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-lg font-bold" style={{ color: '#f0f0f5' }}>Pulsed</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/search" className="text-sm transition-colors hover:text-[#f0f0f5]" style={{ color: '#8b8b9e' }}>Research</Link>
            <Link href="/agent" className="text-sm transition-colors hover:text-[#f0f0f5]" style={{ color: '#8b8b9e' }}>Agent</Link>
            <span className="text-sm font-semibold text-indigo-400">Workspace</span>
            <Link href="/history" className="text-sm transition-colors hover:text-[#f0f0f5]" style={{ color: '#8b8b9e' }}>History</Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:relative z-50 lg:z-auto top-0 left-0 h-full
          w-[260px] border-r flex flex-col shrink-0
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `} style={{ background: 'rgba(17,17,24,0.95)', borderColor: 'rgba(255,255,255,0.06)', paddingTop: sidebarOpen ? '56px' : undefined }}>
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>Workspace</span>
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={() => setShowNewMenu(!showNewMenu)}
                  className="p-1.5 rounded-lg transition-colors text-indigo-400 hover:text-indigo-300"
                  style={{ background: 'rgba(99,102,241,0.1)' }}
                  title="New artifact"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
                {showNewMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNewMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 rounded-xl shadow-2xl py-1 w-44" style={{ background: 'rgba(17,17,24,0.95)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
                      {NEW_TEMPLATES.map(t => (
                        <button
                          key={t.type}
                          onClick={() => createArtifact(t.type)}
                          className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-[rgba(99,102,241,0.1)]"
                          style={{ color: '#8b8b9e' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d={t.iconPath} />
                          </svg>
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 rounded-lg transition-colors"
                style={{ color: '#6b6b80' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {(Object.entries(SECTION_CONFIG) as [SidebarSection, typeof SECTION_CONFIG[SidebarSection]][]).map(([key, cfg]) => {
              const isApp = (a: any) => (a as any).schema?.isApp || a.description?.startsWith('[APP]');
              const items = key === 'apps'
                ? artifacts.filter(a => isApp(a))
                : key === 'docs'
                ? artifacts.filter(a => cfg.types.includes(a.type) && !isApp(a))
                : artifacts.filter(a => cfg.types.includes(a.type));
              if (items.length === 0) return null;
              const isCollapsed = collapsed[key];
              return (
                <div key={key} className="mb-3">
                  <button
                    onClick={() => toggleSection(key)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] uppercase tracking-wider font-medium transition-colors"
                    style={{ color: '#6b6b80' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={cfg.icon} />
                    </svg>
                    {cfg.label}
                    <span className="text-[10px] rounded-full px-1.5" style={{ background: 'rgba(255,255,255,0.06)', color: '#6b6b80' }}>{items.length}</span>
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-0.5 mt-1">
                      {items.map(a => (
                        <button
                          key={a.id}
                          onClick={() => { setSelectedId(a.id); setSidebarOpen(false); }}
                          className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                            selectedId === a.id
                              ? 'font-medium'
                              : ''
                          }`}
                          style={selectedId === a.id
                            ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }
                            : { color: '#8b8b9e' }
                          }
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                            <path d={cfg.icon} />
                          </svg>
                          <span className="truncate">{a.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quick actions */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[11px] uppercase tracking-wider font-medium px-2 mb-2" style={{ color: '#6b6b80' }}>Quick Actions</p>
              <Link href="/workspace/automations" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all hover:bg-[rgba(255,255,255,0.04)]" style={{ color: '#8b8b9e' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <span>Automations</span>
              </Link>
              <Link href="/agent" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all hover:bg-[rgba(255,255,255,0.04)]" style={{ color: '#8b8b9e' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                <span>Ask Your Agent</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(n => (
                  <div key={n} className="rounded-xl p-6 animate-pulse" style={{ background: 'rgba(17,17,24,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="h-5 w-2/3 rounded mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}></div>
                    <div className="h-4 w-1/3 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}></div>
                  </div>
                ))}
              </div>
            ) : selected ? (
              <ArtifactRenderer
                artifact={selected}
                onUpdateRows={updateRows}
                onUpdateContent={updateContent}
                onDelete={deleteArtifact}
              />
            ) : artifacts.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#f0f0f5' }}>Your workspace is empty</h2>
                <p className="text-sm mb-8 max-w-md" style={{ color: '#8b8b9e' }}>
                  Your agent hasn&apos;t built anything yet. Ask it to create a CRM, tracker, or task board.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/agent"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                    Ask Your Agent
                  </Link>
                  <button
                    onClick={() => setShowNewMenu(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-colors"
                    style={{ color: '#a5b4fc', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    + Create Manually
                  </button>
                </div>
              </div>
            ) : (
              /* No artifact selected */
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b6b80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold mb-1" style={{ color: '#f0f0f5' }}>Select an artifact</h3>
                <p className="text-sm" style={{ color: '#6b6b80' }}>Choose from the sidebar or create something new</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
