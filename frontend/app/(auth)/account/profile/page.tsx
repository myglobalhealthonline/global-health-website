"use client";

import { useEffect, useState } from "react";
import { Save, UserRound } from "lucide-react";
import {
  fetchCurrentUser,
  patchCurrentUser,
  type AuthUser,
} from "@/lib/api/auth-api";
import { PatientProfileSection } from "./_components/patient-profile-section";
import { InsuranceTab } from "./_components/insurance-tab";
import { VerificationTab } from "./_components/verification-tab";
import { NationalityTab } from "./_components/nationality-tab";
import { GdprPreferencesTab } from "./_components/gdpr-tab";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";

type Tab = "personal" | "insurance" | "verification" | "nationality" | "privacy";

const TABS: { id: Tab; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "insurance", label: "Insurance" },
  { id: "verification", label: "Verification" },
  { id: "nationality", label: "Dual Nationality" },
  { id: "privacy", label: "Privacy" },
];

function readClientLocale(): LocaleCode {
  try {
    const match = document.cookie.match(/(?:^|;\s*)gh_locale=([^;]+)/);
    const raw = match ? decodeURIComponent(match[1]) : "";
    return resolveLocale({ cookieLocale: raw });
  } catch {
    return "en";
  }
}

export default function AccountProfilePage() {
  const [locale, setLocale] = useState<LocaleCode>("en");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [ghn, setGhn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("personal");

  useEffect(() => {
    setLocale(readClientLocale());
    let cancelled = false;
    async function load() {
      const [authRes, profileRes] = await Promise.all([
        fetchCurrentUser(),
        fetch("/api/account/profile", { credentials: "include" })
          .then((r) => r.json())
          .catch(() => null) as Promise<{
            ok?: boolean;
            data?: { profile?: { globalHealthNumber?: string | null } | null };
          } | null>,
      ]);
      if (cancelled) return;
      if (authRes.ok) {
        setUser(authRes.data.user);
        setFullName(authRes.data.user.fullName ?? "");
        setPhone(authRes.data.user.phone ?? "");
        setDateOfBirth(authRes.data.user.dateOfBirth?.slice(0, 10) ?? "");
      } else {
        setMsg({ kind: "err", text: authRes.message });
      }
      if (profileRes?.ok && profileRes.data?.profile?.globalHealthNumber) {
        setGhn(profileRes.data.profile.globalHealthNumber);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const a = loadLocaleBundle(locale).account;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await patchCurrentUser({
      fullName: fullName.trim(),
      phone: phone.trim() === "" ? null : phone.trim(),
      dateOfBirth: dateOfBirth.trim() === "" ? null : dateOfBirth.trim(),
    });
    setSaving(false);
    if (res.ok) {
      setUser(res.data.user);
      setMsg({ kind: "ok", text: a.profile.saved });
    } else {
      setMsg({ kind: "err", text: res.message });
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {a.profile.breadcrumb}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
            <UserRound className="size-6 text-[var(--color-brand-primary)]" aria-hidden />
            {a.profile.title}
          </h2>
          {ghn && (
            <span
              className="rounded-md bg-[var(--color-background-soft)] px-3 py-1 font-mono text-sm font-semibold text-[var(--color-text-primary)]"
              title="Global Health Number — your unique patient identifier"
            >
              {ghn}
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">{a.profile.subtitle}</p>
      </header>

      {/* Tab navigation */}
      <nav
        className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-[var(--color-background-soft)] p-1"
        aria-label="Profile sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Personal tab */}
      {activeTab === "personal" && (
        <>
          {loading ? (
            <div className="gh-card p-6 text-sm text-[var(--color-text-muted)]">
              {a.profile.loading}
            </div>
          ) : (
            <form onSubmit={onSubmit} className="gh-card space-y-4 p-6">
              <label className="block">
                <span className="gh-field-label">{a.profile.emailLabel}</span>
                <input
                  type="email"
                  value={user?.email ?? ""}
                  disabled
                  className="gh-input mt-1 min-w-0 bg-[var(--color-background-soft)] text-[var(--color-text-muted)]"
                />
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {a.profile.emailNote}
                </p>
              </label>

              <label className="block">
                <span className="gh-field-label">{a.profile.fullNameLabel}</span>
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
                <span className="gh-field-label">{a.profile.phoneLabel}</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={a.profile.phonePlaceholder}
                  maxLength={40}
                  className="gh-input mt-1 min-w-0"
                />
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {a.profile.phoneNote}
                </p>
              </label>

              <label className="block">
                <span className="gh-field-label">{a.profile.dobLabel}</span>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="gh-input mt-1 min-w-0"
                />
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {a.profile.dobNote}
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
                {saving ? a.profile.saving : a.profile.saveChanges}
              </button>
            </form>
          )}
          <PatientProfileSection i18n={a.profile} />
        </>
      )}

      {activeTab === "insurance" && <InsuranceTab />}
      {activeTab === "verification" && <VerificationTab />}
      {activeTab === "nationality" && <NationalityTab />}
      {activeTab === "privacy" && <GdprPreferencesTab />}
    </div>
  );
}
