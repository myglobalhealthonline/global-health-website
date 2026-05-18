"use client";

import { useEffect, useState } from "react";
import { Save, UserRound } from "lucide-react";
import {
  fetchCurrentUser,
  patchCurrentUser,
  type AuthUser,
} from "@/lib/api/auth-api";

export default function AccountProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetchCurrentUser();
      if (cancelled) return;
      if (res.ok) {
        setUser(res.data.user);
        setFullName(res.data.user.fullName ?? "");
        setPhone(res.data.user.phone ?? "");
      } else {
        setMsg({ kind: "err", text: res.message });
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await patchCurrentUser({
      fullName: fullName.trim(),
      phone: phone.trim() === "" ? null : phone.trim(),
    });
    setSaving(false);
    if (res.ok) {
      setUser(res.data.user);
      setMsg({ kind: "ok", text: "Profile saved" });
    } else {
      setMsg({ kind: "err", text: res.message });
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Account
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
          <UserRound className="size-6 text-[var(--color-brand-primary)]" aria-hidden />
          Profile
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Your contact details for bookings and confirmations.
        </p>
      </header>

      {loading ? (
        <div className="gh-card p-6 text-sm text-[var(--color-text-muted)]">
          Loading…
        </div>
      ) : (
        <form onSubmit={onSubmit} className="gh-card space-y-4 p-6">
            <label className="block">
              <span className="gh-field-label">Email</span>
              <input
                type="email"
                value={user?.email ?? ""}
                disabled
                className="gh-input mt-1 min-w-0 bg-slate-50 text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Email can&apos;t be changed yet. Contact support if you need to switch.
              </p>
            </label>

            <label className="block">
              <span className="gh-field-label">Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={120}
                className="gh-input mt-1 min-w-0"
              />
            </label>

            <label className="block">
              <span className="gh-field-label">Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+353 89 …"
                maxLength={40}
                className="gh-input mt-1 min-w-0"
              />
              <p className="mt-1 text-xs text-slate-500">
                Used so the clinic can reach you about your booking. Leave blank
                if you prefer email only.
              </p>
            </label>

            {msg ? (
              <p
                className={`rounded-md px-3 py-2 text-sm ${
                  msg.kind === "ok"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-rose-50 text-rose-800"
                }`}
              >
                {msg.text}
              </p>
            ) : null}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
          >
            <Save aria-hidden className="size-4" />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}
    </div>
  );
}
