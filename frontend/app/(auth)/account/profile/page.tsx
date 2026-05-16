"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
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
    <div className="min-h-screen bg-[var(--color-background-soft)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/account"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Back to account
        </Link>

        <h1 className="gh-h2 text-[var(--color-text-primary)]">Profile</h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Your contact details for bookings and confirmations.
        </p>

        {loading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading…
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
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
    </div>
  );
}
