'use client';

import { useState } from 'react';
import { getAuthClient } from '@/lib/auth';

const PLAN_LABELS: Record<string, string> = {
  pro: 'Upgrade to Pro',
  agent: 'Get Agent',
  ultra: 'Get Ultra',
};

export default function UpgradeButton({ className = '', plan = 'pro', label }: { className?: string; plan?: string; label?: string }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const supabase = getAuthClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = '/login';
        return;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Checkout error:', data.error);
      }
    } catch (err) {
      console.error('Upgrade error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className={`font-semibold rounded-lg transition-all disabled:opacity-50 ${className}`}
    >
      {loading ? 'Loading...' : (label || PLAN_LABELS[plan] || 'Subscribe')}
    </button>
  );
}
