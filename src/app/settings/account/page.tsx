"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthClient } from "@/lib/auth";

interface Profile {
  name: string;
  email: string;
  plan: string;
  created_at: string;
  stripe_portal_url?: string;
}

const NAV_ITEMS = [
  { href: "/settings/keys", label: "API Keys" },
  { href: "/settings/models", label: "Models" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/memory", label: "Memory" },
  { href: "/settings/activity", label: "Activity" },
  { href: "/settings/account", label: "Account" },
];

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const getAuthHeader = useCallback(async () => {
    const supabase = getAuthClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return `Bearer ${session.access_token}`;
  }, []);

  useEffect(() => {
    (async () => {
      const auth = await getAuthHeader();
      if (!auth) { setLoading(false); return; }
      try {
        const res = await fetch("/api/profile", {
          headers: { Authorization: auth },
        });
        const data = await res.json();
        if (res.ok) setProfile(data);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [getAuthHeader]);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = getAuthClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const planLabel = profile?.plan
    ? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)
    : "Free";

  const planColor =
    planLabel === "Ultra" ? "text-indigo-400 bg-indigo-500/20"
    : planLabel === "Pro" ? "text-cyan-400 bg-cyan-500/20"
    : "text-[#8b8b9e] bg-[rgba(255,255,255,0.06)]";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f0f0f5]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-[#6b6b80] hover:text-[#8b8b9e] transition-colors mb-4 inline-block">
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold text-[#f0f0f5] mb-2">Account</h1>
          <p className="text-sm text-[#8b8b9e]">
            Manage your profile, subscription, and sign out.
          </p>
        </div>

        <div className="flex gap-2 mb-8 flex-wrap">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                item.href === "/settings/account"
                  ? "bg-gradient-to-r from-[#06b6d4] to-[#6366f1] text-white"
                  : "bg-[rgba(255,255,255,0.04)] text-[#8b8b9e] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(6,182,212,0.2)] hover:text-[#f0f0f5]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-[#6b6b80]">Loading...</div>
        ) : !profile ? (
          <div
            className="text-sm text-[#8b8b9e] rounded-2xl p-6 text-center"
            style={{
              background: "rgba(17,17,24,0.8)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            Unable to load profile. Please try logging in again.
          </div>
        ) : (
          <div className="space-y-6">
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(17,17,24,0.8)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <h2 className="text-lg font-semibold mb-4 text-[#f0f0f5]">Profile</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8b8b9e]">Name</span>
                  <span className="text-sm text-[#f0f0f5]">{profile.name || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8b8b9e]">Email</span>
                  <span className="text-sm text-[#f0f0f5]">{profile.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8b8b9e]">Plan</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColor}`}>
                    {planLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8b8b9e]">Member since</span>
                  <span className="text-sm text-[#f0f0f5]">
                    {new Date(profile.created_at).toLocaleDateString("en-US", {
                      month: "long", year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href={planLabel === "Free" ? "/pricing" : (profile.stripe_portal_url || "/pricing")}
                className="flex-1 h-[44px] flex items-center justify-center bg-white text-[#0a0a0f] text-sm font-medium rounded-xl hover:bg-white/90 transition-colors"
              >
                Manage Subscription
              </Link>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="h-[44px] px-6 text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#f0f0f5",
                }}
              >
                {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
