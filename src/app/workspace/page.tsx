'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, getAccessToken } from '@/lib/auth';
import { Artifact, ArtifactRow, dbToArtifact } from '@/lib/artifacts';
import ArtifactRenderer from '@/components/artifacts/ArtifactRenderer';

type SidebarSection = 'tables' | 'boards' | 'lists' | 'docs';

const SECTION_CONFIG: Record<SidebarSection, { label: string; icon: string; types: string[] }> = {
  tables: { label: 'Tables', icon: '📊', types: ['table'] },
  boards: { label: 'Boards', icon: '📋', types: ['kanban'] },
  lists: { label: 'Lists', icon: '✅', types: ['list'] },
  docs: { label: 'Documents', icon: '📄', types: ['document'] },
};

const NEW_TEMPLATES: { type: string; label: string; icon: string }[] = [
  { type: 'table', label: 'Table', icon: '📊' },
  { type: 'kanban', label: 'Board', icon: '📋' },
  { type: 'list', label: 'List', icon: '✅' },
  { type: 'document', label: 'Document', icon: '📄' },
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
      defaults.icon = '📊';
      defaults.columns = [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'status', label: 'Status', type: 'badge', options: ['Active', 'Inactive'] },
        { key: 'email', label: 'Email', type: 'email' },
      ];
      defaults.rows = [];
    } else if (type === 'kanban') {
      defaults.icon = '📋';
      defaults.groupBy = 'status';
      defaults.columns = [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'status', label: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] },
      ];
      defaults.rows = [];
    } else if (type === 'list') {
      defaults.icon = '✅';
      defaults.rows = [];
    } else if (type === 'document') {
      defaults.icon = '📄';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 lg:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-gray-900">Pulsed</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/search" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Research</Link>
            <Link href="/agent" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Agent</Link>
            <span className="text-sm font-semibold text-indigo-600">Workspace</span>
            <Link href="/history" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">History</Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:relative z-50 lg:z-auto top-0 left-0 h-full
          w-[260px] bg-white border-r border-gray-100
          flex flex-col shrink-0
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `} style={{ paddingTop: sidebarOpen ? '56px' : undefined }}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Workspace</span>
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={() => setShowNewMenu(!showNewMenu)}
                  className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                  title="New artifact"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
                {showNewMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNewMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44">
                      {NEW_TEMPLATES.map(t => (
                        <button
                          key={t.type}
                          onClick={() => createArtifact(t.type)}
                          className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <span>{t.icon}</span>
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {(Object.entries(SECTION_CONFIG) as [SidebarSection, typeof SECTION_CONFIG[SidebarSection]][]).map(([key, cfg]) => {
              const items = artifacts.filter(a => cfg.types.includes(a.type));
              if (items.length === 0) return null;
              const isCollapsed = collapsed[key];
              return (
                <div key={key} className="mb-3">
                  <button
                    onClick={() => toggleSection(key)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] uppercase tracking-wider text-gray-400 font-medium hover:text-gray-600 transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                    {cfg.icon} {cfg.label}
                    <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5">{items.length}</span>
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-0.5 mt-1">
                      {items.map(a => (
                        <button
                          key={a.id}
                          onClick={() => { setSelectedId(a.id); setSidebarOpen(false); }}
                          className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                            selectedId === a.id
                              ? 'bg-indigo-50 text-indigo-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <span className="text-base shrink-0">{a.icon || cfg.icon}</span>
                          <span className="truncate">{a.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quick actions */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium px-2 mb-2">Quick Actions</p>
              <Link href="/workspace/automations" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all">
                <span className="text-base">⚡</span><span>Automations</span>
              </Link>
              <Link href="/agent" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all">
                <span className="text-base">💬</span><span>Ask Your Agent</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(n => (
                  <div key={n} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
                    <div className="h-5 w-2/3 bg-gray-100 rounded mb-3"></div>
                    <div className="h-4 w-1/3 bg-gray-100 rounded"></div>
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
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Your workspace is empty</h2>
                <p className="text-sm text-gray-500 mb-8 max-w-md">
                  Your agent hasn&apos;t built anything yet. Ask it to create a CRM, tracker, or task board.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/agent"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 transition-opacity shadow-sm"
                  >
                    💬 Ask Your Agent
                  </Link>
                  <button
                    onClick={() => setShowNewMenu(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                  >
                    + Create Manually
                  </button>
                </div>
              </div>
            ) : (
              /* No artifact selected */
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">Select an artifact</h3>
                <p className="text-sm text-gray-400">Choose from the sidebar or create something new</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
