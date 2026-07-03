"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Save } from "lucide-react";
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
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { readClientLocale } from "@/lib/i18n/get-client-locale";
import { PhoneField } from "@/components/forms/phone-field";
import { AdminSummaryStrip, Btn, PageHeader } from "@/components/portal-atoms";
import { PortalTabs } from "@/components/PortalTabs";
import { FormSection } from "@/components/FormSection";
import type { LocaleCode } from "@/lib/i18n/types";

type Tab = "personal" | "insurance" | "verification" | "nationality" | "privacy";

const TABS: { id: Tab; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "insurance", label: "Insurance" },
  { id: "verification", label: "Verification" },
  { id: "nationality", label: "Dual Nationality" },
  { id: "privacy", label: "Privacy" },
];

export default function AccountProfilePage() {
  const [locale] = useState<LocaleCode>(() => readClientLocale());
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
  const needsAttention = Boolean(user && !user.emailVerifiedAt) || !ghn;
  const profileStatusItems = [
    {
      label: "Email",
      value: user?.emailVerifiedAt ? "Verified" : "Needs verification",
      hint: user?.email ?? "Account email",
    },
    {
      label: "Phone",
      value: phone ? "Added" : "Missing",
      hint: "Used for appointment updates",
    },
    {
      label: "Patient ID",
      value: ghn ? "Active" : "Pending",
      hint: "Global Health Number",
    },
    {
      label: "Profile",
      value: fullName ? "Started" : "Incomplete",
      hint: "Personal and medical details",
    },
  ];

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
    <div className="gh-patient-page gh-patient-profile-page">
      <PageHeader
        eyebrow={a.profile.breadcrumb}
        title={a.profile.title}
        description={a.profile.subtitle}
        actions={
          ghn ? (
            <span
              className="rounded-md bg-[var(--portal-well)] px-3 py-1 font-mono text-sm font-semibold text-[var(--portal-text)]"
              title="Global Health Number — your unique patient identifier"
            >
              {ghn}
            </span>
          ) : undefined
        }
      />

      {!loading && needsAttention ? (
        <div
          className="mb-5 flex items-start gap-2 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--portal-warning)",
            background: "var(--portal-warning-soft)",
            color: "var(--portal-warning-text)",
          }}
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Action needed</p>
            <p className="text-xs">
              {!user?.emailVerifiedAt && !ghn
                ? "Verify your email and complete your profile to get your Global Health Number."
                : !user?.emailVerifiedAt
                  ? "Verify your email to unlock the full patient portal."
                  : "Complete your profile to get your Global Health Number."}
            </p>
          </div>
        </div>
      ) : null}

      <AdminSummaryStrip className="mb-5" items={profileStatusItems} />

      {/* Tab navigation */}
      <div className="mb-5">
        <PortalTabs
          ariaLabel="Profile sections"
          value={activeTab}
          onChange={(v) => setActiveTab(v as Tab)}
          items={TABS.map((tab) => ({ value: tab.id, label: tab.label }))}
        />
      </div>

      {/* Personal tab */}
      {activeTab === "personal" && (
        <>
          {loading ? (
            <div className="gh-card p-6">
              <div className="h-4 w-40 rounded bg-[var(--portal-well)]" />
              <div className="mt-4 grid gap-3">
                <div className="h-12 rounded-lg bg-[var(--portal-well)]" />
                <div className="h-12 rounded-lg bg-[var(--portal-well)]" />
                <div className="h-12 rounded-lg bg-[var(--portal-well)]" />
              </div>
            </div>
          ) : (
            <FormSection title={a.profile.title} description={a.profile.subtitle}>
              <form onSubmit={onSubmit} className="gh-form-section__span-2 grid gap-4">
                <label className="block">
                  <span className="gh-field-label">{a.profile.emailLabel}</span>
                  <input
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    className="gh-input mt-1 min-w-0 bg-[var(--portal-well)] text-[var(--portal-muted)]"
                  />
                  <p className="mt-1 text-xs text-[var(--portal-muted)]">
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
                  <PhoneField
                    key={user?.id ?? "anon"}
                    name="phone"
                    defaultValue={phone}
                    onChange={setPhone}
                    placeholder={a.profile.phonePlaceholder}
                    className="mt-1 flex gap-2"
                  />
                  <p className="mt-1 text-xs text-[var(--portal-muted)]">
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
                  <p className="mt-1 text-xs text-[var(--portal-muted)]">
                    {a.profile.dobNote}
                  </p>
                </label>

                {msg ? (
                  <p
                    className="rounded-md px-3 py-2 text-sm"
                    style={
                      msg.kind === "ok"
                        ? { background: "var(--portal-success-soft)", color: "var(--portal-success-text)" }
                        : { background: "var(--portal-danger-soft)", color: "var(--portal-danger-text)" }
                    }
                  >
                    {msg.text}
                  </p>
                ) : null}

                <Btn
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={saving}
                  loading={saving}
                  iconLeft={<Save aria-hidden className="size-4" />}
                  className="justify-self-start"
                >
                  {saving ? a.profile.saving : a.profile.saveChanges}
                </Btn>
              </form>
            </FormSection>
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
