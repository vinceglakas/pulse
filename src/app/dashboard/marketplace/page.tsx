'use client';

import { useState, useEffect } from 'react';
import { Search, Download, Plus, Star, User, Filter } from 'lucide-react';

interface Template {
  id: string;
  author_id: string;
  author_name: string;
  title: string;
  description: string;
  category: 'workflow' | 'research' | 'monitor' | 'automation';
  installs: number;
  rating: number;
  created_at: string;
}

const categoryColors = {
  workflow: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  research: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  monitor: 'bg-green-500/10 text-green-400 border-green-500/20',
  automation: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
};

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [installing, setInstalling] = useState<string | null>(null);

  const categories = ['all', 'workflow', 'research', 'monitor', 'automation'];

  useEffect(() => {
    fetchTemplates();
  }, [page, selectedCategory, searchTerm]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/marketplace?${params}`);
      const data = await response.json();

      if (response.ok) {
        setTemplates(data.templates);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (templateId: string) => {
    setInstalling(templateId);
    try {
      const response = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ template_id: templateId })
      });

      if (response.ok) {
        // Refresh templates to update install count
        fetchTemplates();
      } else {
        const error = await response.json();
        alert(`Failed to install: ${error.error}`);
      }
    } catch (error) {
      console.error('Error installing template:', error);
      alert('Failed to install template');
    } finally {
      setInstalling(null);
    }
  };

  const handlePublish = () => {
    // Navigate to publish page or open modal
    window.location.href = '/dashboard/marketplace/publish';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: '#f0f0f5' }}>
                Agent Marketplace
              </h1>
              <p className="text-lg" style={{ color: '#8b8b9e' }}>
                Discover and share workflow templates and research configurations
              </p>
            </div>
            <button
              onClick={handlePublish}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: '#f0f0f5',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
              }}
            >
              <Plus className="w-5 h-5" />
              Publish Template
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#8b8b9e' }} />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/10"
                style={{
                  backgroundColor: '#111118',
                  color: '#f0f0f5',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              />
            </div>
            
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="appearance-none px-4 py-2 pr-10 rounded-lg focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: '#111118',
                  color: '#f0f0f5',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: '#8b8b9e' }} />
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#8b8b9e' }}></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl mb-4" style={{ color: '#8b8b9e' }}>No templates found</p>
            <p style={{ color: '#8b8b9e' }}>Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {templates.map((template) => (
              <div
                key={template.id}
                className="rounded-lg p-6 transition-all duration-200 hover:transform hover:scale-105"
                style={{
                  backgroundColor: '#111118',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${categoryColors[template.category]}`}>
                    {template.category}
                  </span>
                  <div className="flex items-center gap-1" style={{ color: '#8b8b9e' }}>
                    <Star className="w-4 h-4 fill-current" style={{ color: '#fbbf24' }} />
                    <span className="text-sm">{template.rating}</span>
                  </div>
                </div>

                <h3 className="text-xl font-semibold mb-2" style={{ color: '#f0f0f5' }}>
                  {template.title}
                </h3>
                
                <p className="text-sm mb-4 line-clamp-2" style={{ color: '#8b8b9e' }}>
                  {template.description}
                </p>

                <div className="flex items-center gap-2 mb-4" style={{ color: '#8b8b9e' }}>
                  <User className="w-4 h-4" />
                  <span className="text-sm">{template.author_name}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1" style={{ color: '#8b8b9e' }}>
                    <Download className="w-4 h-4" />
                    <span className="text-sm">{template.installs} installs</span>
                  </div>
                  
                  <button
                    onClick={() => handleInstall(template.id)}
                    disabled={installing === template.id}
                    className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: installing === template.id ? 'rgba(255,255,255,0.06)' : '#3b82f6',
                      color: '#f0f0f5'
                    }}
                  >
                    {installing === template.id ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Installing...
                      </div>
                    ) : (
                      'Install'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#111118',
                color: '#f0f0f5',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
            >
              Previous
            </button>
            
            <span className="flex items-center px-4" style={{ color: '#8b8b9e' }}>
              Page {page} of {totalPages}
            </span>
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#111118',
                color: '#f0f0f5',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}