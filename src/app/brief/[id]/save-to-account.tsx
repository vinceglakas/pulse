'use client';

import { useState, useEffect } from 'react';
import { getAccessToken } from '@/lib/auth';

interface Account { id: string; name: string; }

export function SaveToAccountButton({ topic, briefText, source }: { topic: string; briefText: string; source: string }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAccessToken().then(t => setToken(t));
  }, []);

  async function loadAccounts() {
    if (!token) return;
    try {
      const res = await fetch('/api/accounts?status=all', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0) setSelectedId(data[0].id);
      }
    } catch {}
  }

  function handleOpen() {
    setOpen(true);
    setSaved(false);
    loadAccounts();
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    let accountId = selectedId;

    if (creating || !selectedId) {
      // Create new account
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName || topic }),
      });
      if (res.ok) {
        const acc = await res.json();
        accountId = acc.id;
      } else {
        setSaving(false);
        return;
      }
    }

    // Save research
    await fetch(`/api/accounts/${accountId}/research`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: topic, content: briefText, source }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setOpen(false), 1500);
  }

  if (!token) return null;

  const glassCard = { background: 'rgba(17,17,24,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)' };
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f5' };

  return (
    <>
      <button
        onClick={handleOpen}
        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
        style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
      >
        💼 Save to Account
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl p-6" style={glassCard} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#f0f0f5' }}>Save to Account</h2>

            {saved ? (
              <p className="text-sm text-center py-6" style={{ color: '#34d399' }}>✓ Saved successfully!</p>
            ) : (
              <div className="space-y-4">
                {accounts.length > 0 && !creating && (
                  <>
                    <select
                      value={selectedId}
                      onChange={e => setSelectedId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                      style={inputStyle}
                    >
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button onClick={() => setCreating(true)} className="text-xs text-indigo-400">+ Create new account instead</button>
                  </>
                )}

                {(creating || accounts.length === 0) && (
                  <>
                    <input
                      type="text"
                      placeholder="New account name"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                      style={inputStyle}
                    />
                    {accounts.length > 0 && (
                      <button onClick={() => setCreating(false)} className="text-xs text-indigo-400">← Select existing account</button>
                    )}
                  </>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm rounded-lg" style={{ color: '#8b8b9e' }}>Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-semibold rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
