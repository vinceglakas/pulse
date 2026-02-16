"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAuthClient } from "@/lib/auth";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  message: string;
  enabled: boolean;
  timezone: string;
  last_run?: string;
  next_run?: string;
  created_at: string;
}

const PRESET_SCHEDULES = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at 9 AM", value: "0 9 * * *" },
  { label: "Every Monday", value: "0 9 * * 1" },
  { label: "Every weekday", value: "0 9 * * 1-5" },
  { label: "Custom", value: "custom" },
];

const TIMEZONES = [
  { label: "Eastern (New York)", value: "America/New_York" },
  { label: "Pacific (Los Angeles)", value: "America/Los_Angeles" },
  { label: "Central (Chicago)", value: "America/Chicago" },
  { label: "Mountain (Denver)", value: "America/Denver" },
  { label: "UTC", value: "UTC" },
];

export default function AutomationsPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    message: "",
    schedule: "0 9 * * *",
    customCron: "",
    timezone: "America/New_York",
    enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getAuthHeader = useCallback(async () => {
    const supabase = getAuthClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;
    return `Bearer ${session.access_token}`;
  }, []);

  const fetchJobs = useCallback(async () => {
    const auth = await getAuthHeader();
    if (!auth) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/agent/cron", {
        headers: { Authorization: auth },
      });
      const data = await res.json();
      if (res.ok) setJobs(data.jobs || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [getAuthHeader]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const resetForm = () => {
    setFormData({
      name: "",
      message: "",
      schedule: "0 9 * * *",
      customCron: "",
      timezone: "America/New_York",
      enabled: true,
    });
    setEditingJob(null);
    setError("");
    setSuccess("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const auth = await getAuthHeader();
    if (!auth) {
      setError("Please log in first");
      setSaving(false);
      return;
    }

    const schedule = formData.schedule === "custom" ? formData.customCron : formData.schedule;
    if (!schedule) {
      setError("Please select a schedule");
      setSaving(false);
      return;
    }

    try {
      const body = {
        name: formData.name,
        schedule,
        timezone: formData.timezone,
        message: formData.message,
        enabled: formData.enabled,
      };

      const res = await fetch("/api/agent/cron", {
        method: editingJob ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
        body: JSON.stringify(editingJob ? { jobId: editingJob.id, ...body } : body),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(editingJob ? "Automation updated" : "Automation created");
        setShowForm(false);
        resetForm();
        fetchJobs();
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch (err) {
      setError("Failed to save automation");
    }
    setSaving(false);
  };

  const handleDelete = async (job: CronJob) => {
    if (!confirm(`Delete automation "${job.name}"?`)) return;
    setDeleting(job.id);
    const auth = await getAuthHeader();
    if (!auth) return;

    try {
      const res = await fetch("/api/agent/cron", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
        body: JSON.stringify({ jobId: job.id }),
      });
      if (res.ok) {
        fetchJobs();
      }
    } catch {
      /* ignore */
    }
    setDeleting(null);
  };

  const handleToggle = async (job: CronJob) => {
    const auth = await getAuthHeader();
    if (!auth) return;

    try {
      const res = await fetch("/api/agent/cron", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
        body: JSON.stringify({ jobId: job.id, enabled: !job.enabled }),
      });
      if (res.ok) {
        fetchJobs();
      }
    } catch {
      /* ignore */
    }
  };

  const formatSchedule = (cron: string) => {
    const preset = PRESET_SCHEDULES.find((p) => p.value === cron);
    if (preset) return preset.label;
    return cron;
  };

  const formatDate = (date?: string) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f", color: "#f0f0f5" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(10, 10, 15, 0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/agent" className="flex items-center gap-1.5">
              <span className="text-lg font-bold" style={{ color: "#f0f0f5" }}>Pulsed</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold" style={{ color: "#22d3ee" }}>Settings</span>
            <Link href="/settings/integrations" className="text-sm transition-colors" style={{ color: "#8b8b9e" }} onMouseEnter={(e) => e.currentTarget.style.color = "#f0f0f5"} onMouseLeave={(e) => e.currentTarget.style.color = "#8b8b9e"}>Integrations</Link>
            <Link href="/settings/automations" className="text-sm transition-colors" style={{ color: "#22d3ee" }}>Automations</Link>
            <Link href="/settings/models" className="text-sm transition-colors" style={{ color: "#8b8b9e" }} onMouseEnter={(e) => e.currentTarget.style.color = "#f0f0f5"} onMouseLeave={(e) => e.currentTarget.style.color = "#8b8b9e"}>Models</Link>
            <Link href="/settings/keys" className="text-sm transition-colors" style={{ color: "#8b8b9e" }} onMouseEnter={(e) => e.currentTarget.style.color = "#f0f0f5"} onMouseLeave={(e) => e.currentTarget.style.color = "#8b8b9e"}>API Keys</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#f0f0f5" }}>Automations</h1>
          <p className="text-lg" style={{ color: "#8b8b9e" }}>Schedule recurring tasks for your agent</p>
        </div>

        {/* Success / Error */}
        {success && (
          <div className="mb-6 p-4 rounded-xl" style={{ background: "rgba(34, 211, 238, 0.08)", border: "1px solid rgba(34, 211, 238, 0.15)" }}>
            <p className="text-sm" style={{ color: "#67e8f9" }}>{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-xl" style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
            <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
          </div>
        )}

        {/* Create Button */}
        {!showForm && (
          <div className="mb-6">
            <button
              onClick={() => {
                setShowForm(true);
                resetForm();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              style={{ background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc", border: "1px solid rgba(99, 102, 241, 0.2)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99, 102, 241, 0.2)"; e.currentTarget.style.color = "#c7d2fe"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(99, 102, 241, 0.15)"; e.currentTarget.style.color = "#a5b4fc"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14m-7-7h14" />
              </svg>
              New Automation
            </button>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="mb-8 p-6 rounded-2xl glass-surface">
            <h2 className="text-xl font-semibold mb-4" style={{ color: "#f0f0f5" }}>
              {editingJob ? "Edit Automation" : "Create Automation"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#22d3ee" }}>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Daily briefing"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f0f5" }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "rgba(6,182,212,0.3)"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#22d3ee" }}>What should your agent do?</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="e.g. Check my calendar and email me a summary of today's meetings"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f0f5" }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "rgba(6,182,212,0.3)"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#22d3ee" }}>Schedule</label>
                  <select
                    value={formData.schedule}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f0f5" }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "rgba(6,182,212,0.3)"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                  >
                    {PRESET_SCHEDULES.map((s) => (
                      <option key={s.value} value={s.value} style={{ background: "#1a1a1f" }}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#22d3ee" }}>Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f0f5" }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "rgba(6,182,212,0.3)"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value} style={{ background: "#1a1a1f" }}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.schedule === "custom" && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#22d3ee" }}>Cron Expression</label>
                  <input
                    type="text"
                    value={formData.customCron}
                    onChange={(e) => setFormData({ ...formData, customCron: e.target.value })}
                    placeholder="0 9 * * 1-5"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all font-mono"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f0f5" }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "rgba(6,182,212,0.3)"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                    required
                  />
                  <p className="text-xs mt-2" style={{ color: "#8b8b9e" }}>Format: minute hour day month weekday</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "#22d3ee" }}
                  />
                  <span className="text-sm" style={{ color: "#f0f0f5" }}>Enabled</span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #06b6d4, #6366f1)", color: "white" }}
                >
                  {saving ? "Saving..." : editingJob ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#f0f0f5", border: "1px solid rgba(255,255,255,0.1)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Jobs List */}
        {!showForm && (
          <div>
            {jobs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(99, 102, 241, 0.15)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#f0f0f5" }}>No automations yet</h3>
                <p className="mb-4" style={{ color: "#8b8b9e" }}>Create one to have your agent work on a schedule.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="p-4 rounded-xl glass-surface-light">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold" style={{ color: "#f0f0f5" }}>{job.name}</h4>
                          <button
                            onClick={() => handleToggle(job)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              job.enabled ? "bg-indigo-500" : "bg-gray-600"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                job.enabled ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                        <p className="text-sm mb-3" style={{ color: "#8b8b9e" }}>{job.message}</p>
                        <div className="flex flex-wrap gap-4 text-xs" style={{ color: "#6b6b80" }}>
                          <span>Schedule: {formatSchedule(job.schedule)}</span>
                          <span>Timezone: {job.timezone}</span>
                          <span>Last run: {formatDate(job.last_run)}</span>
                          <span>Next run: {formatDate(job.next_run)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingJob(job);
                            setFormData({
                              name: job.name,
                              message: job.message,
                              schedule: "custom",
                              customCron: job.schedule,
                              timezone: job.timezone,
                              enabled: job.enabled,
                            });
                            setShowForm(true);
                          }}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: "#8b8b9e" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f0f5"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "#8b8b9e"; e.currentTarget.style.background = "transparent"; }}
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(job)}
                          disabled={deleting === job.id}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: "#ef4444" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "transparent"; }}
                          title="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .glass-surface {
          background: rgba(17, 17, 24, 0.6);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .glass-surface-light {
          background: rgba(24, 24, 35, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(24px);
        }
      `}</style>
    </div>
  );
}