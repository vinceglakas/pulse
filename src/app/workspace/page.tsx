'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, getAccessToken } from '@/lib/auth';

interface SavedBrief {
  id: string;
  brief_id: string;
  created_at: string;
  brief?: {
    id: string;
    topic: string;
    created_at: string;
    summary?: string;
  };
}

interface Automation {
  id: string;
  name: string;
  prompt: string;
  schedule_type: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

type SidebarCategory = 'all' | 'briefs' | 'tasks' | 'automations';

export default function WorkspacePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedBriefs, setSavedBriefs] = useState<SavedBrief[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [activeCategory, setActiveCategory] = useState<SidebarCategory>('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) {
        router.push('/login');
        return;
      }
      setAuthChecked(true);
      const token = await getAccessToken();
      setAccessToken(token);

      // Fetch saved briefs
      try {
        const res = await fetch('/api/workspace/items', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setSavedBriefs(data.briefs || []);
        }
      } catch {}

      // Fetch automations
      try {
        const res = await fetch('/api/automations', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setAutomations(data.automations || []);
        }
      } catch {}

      setLoading(false);
    });
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sidebarItems: { key: SidebarCategory; label: string; icon: string; count: number }[] = [
    { key: 'all', label: 'All Files', icon: '📁', count: savedBriefs.length + automations.length },
    { key: 'briefs', label: 'Research Briefs', icon: '📊', count: savedBriefs.length },
    { key: 'tasks', label: 'Tasks', icon: '📋', count: 0 },
    { key: 'automations', label: 'Automations', icon: '⚡', count: automations.length },
  ];

  const showBriefs = activeCategory === 'all' || activeCategory === 'briefs';
  const showTasks = activeCategory === 'all' || activeCategory === 'tasks';
  const showAutomations = activeCategory === 'all' || activeCategory === 'automations';

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
        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:relative z-50 lg:z-auto top-0 left-0 h-full
            w-[260px] bg-white border-r border-gray-100
            flex flex-col shrink-0
            transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{ paddingTop: sidebarOpen ? '56px' : undefined }}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between lg:mt-0">
            <span className="text-sm font-semibold text-gray-900">Workspace</span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActiveCategory(item.key);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeCategory === item.key
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count > 0 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      activeCategory === item.key
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Quick actions */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium px-3 mb-2">Quick Actions</p>
              <Link
                href="/workspace/automations"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
              >
                <span className="text-base">⚡</span>
                <span>Manage Automations</span>
              </Link>
              <Link
                href="/search"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
              >
                <span className="text-base">🔍</span>
                <span>New Research</span>
              </Link>
              <Link
                href="/agent"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
              >
                <span className="text-base">💬</span>
                <span>Ask Your Agent</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Your Workspace</h1>
                <p className="text-sm text-gray-500 mt-1">Everything your agent has created and saved.</p>
              </div>
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
                    <div className="h-5 w-2/3 bg-gray-100 rounded mb-3"></div>
                    <div className="h-4 w-1/3 bg-gray-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-10">
                {/* Research Briefs Section */}
                {showBriefs && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📊</span>
                        <h2 className="text-lg font-semibold text-gray-900">Research Briefs</h2>
                        {savedBriefs.length > 0 && (
                          <span className="text-xs font-medium bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5">
                            {savedBriefs.length}
                          </span>
                        )}
                      </div>
                      <Link
                        href="/search"
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                      >
                        + New Research
                      </Link>
                    </div>

                    {savedBriefs.length === 0 ? (
                      <div className="bg-white border border-gray-200 border-dashed rounded-xl p-10 text-center">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                          </svg>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-2">No saved research yet</h3>
                        <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
                          Research any topic and save it here. Your agent can analyze trends, competitors, markets, and more.
                        </p>
                        <Link
                          href="/search"
                          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 transition-opacity shadow-sm"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                          </svg>
                          Start Researching
                        </Link>
                      </div>
                    ) : viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {savedBriefs.map((item) => (
                          <Link
                            key={item.id}
                            href={`/brief/${item.brief_id}`}
                            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all group"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                                </svg>
                              </div>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <path d="m9 18 6-6-6-6" />
                              </svg>
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                              {item.brief?.topic || 'Research Brief'}
                            </h3>
                            {item.brief?.summary && (
                              <p className="text-xs text-gray-500 line-clamp-2 mb-3">{item.brief.summary}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-gray-400">
                                {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">Brief</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {savedBriefs.map((item) => (
                          <Link
                            key={item.id}
                            href={`/brief/${item.brief_id}`}
                            className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
                          >
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                                {item.brief?.topic || 'Research Brief'}
                              </h3>
                              {item.brief?.summary && (
                                <p className="text-xs text-gray-500 truncate">{item.brief.summary}</p>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 shrink-0">
                              {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5 shrink-0">Brief</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Tasks Section */}
                {showTasks && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg">📋</span>
                      <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
                    </div>
                    <div className="bg-white border border-gray-200 border-dashed rounded-xl p-10 text-center">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 11l3 3L22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-2">No tasks yet</h3>
                      <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
                        Ask your agent to create tasks for you. Try: &ldquo;Create a task to review competitor pricing this week.&rdquo;
                      </p>
                      <Link
                        href="/agent"
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Ask Your Agent
                      </Link>
                    </div>
                  </section>
                )}

                {/* Automations Section */}
                {showAutomations && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚡</span>
                        <h2 className="text-lg font-semibold text-gray-900">Automations</h2>
                        {automations.length > 0 && (
                          <span className="text-xs font-medium bg-amber-50 text-amber-600 rounded-full px-2 py-0.5">
                            {automations.length}
                          </span>
                        )}
                      </div>
                      <Link
                        href="/workspace/automations"
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                      >
                        Manage →
                      </Link>
                    </div>

                    {automations.length === 0 ? (
                      <div className="bg-white border border-gray-200 border-dashed rounded-xl p-10 text-center">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-2">Set up scheduled tasks</h3>
                        <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
                          Your agent can run tasks automatically — daily competitor scans, weekly market reports, trend alerts, and more.
                        </p>
                        <Link
                          href="/workspace/automations"
                          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 transition-opacity shadow-sm"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          Create Automation
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {automations.slice(0, 5).map((auto) => (
                          <div
                            key={auto.id}
                            className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              auto.active ? 'bg-emerald-50' : 'bg-gray-100'
                            }`}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={auto.active ? '#10b981' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">{auto.name}</h3>
                              <p className="text-xs text-gray-500 truncate">{auto.prompt}</p>
                            </div>
                            <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 shrink-0 ${
                              auto.active
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {auto.active ? 'Active' : 'Paused'}
                            </span>
                          </div>
                        ))}
                        {automations.length > 5 && (
                          <Link
                            href="/workspace/automations"
                            className="block text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium py-2"
                          >
                            View all {automations.length} automations →
                          </Link>
                        )}
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
