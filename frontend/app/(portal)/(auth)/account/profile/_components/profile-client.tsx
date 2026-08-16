"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  FileCheck2,
  Flag,
  HeartPulse,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  fetchCurrentUser,
  patchCurrentUser,
  type AuthUser,
} from "@/lib/api/auth-api";
import { PatientProfileSection } from "./patient-profile-section";
import { InsuranceTab } from "./insurance-tab";
import { VerificationTab } from "./verification-tab";
import { NationalityTab } from "./nationality-tab";
import { GdprPreferencesTab } from "./gdpr-tab";
import type { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { PhoneField } from "@/components/forms/phone-field";
import { AdminSummaryStrip, Btn, PageHeader } from "@/components/portal-atoms";
import { PortalTabs, PortalTabPanel } from "@/components/PortalTabs";
import { FormSection } from "@/components/FormSection";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";

type Tab = "contact" | "medical" | "verification" | "insurance" | "nationality" | "privacy";

/** Runtime list for validating a `?tab=` value — a bad one falls back to Contact. */
const TAB_IDS: readonly Tab[] = [
  "contact",
  "medical",
  "verification",
  "insurance",
  "nationality",
  "privacy",
];

type Account = ReturnType<typeof loadLocaleBundle>["account"];

export type ProfilePageI18n = {
  profile: Account["profile"];
  insurance: Account["insurance"];
  verification: Account["verification"];
  nationality: Account["nationality"];
  privacy: Account["privacy"];
};

export function AccountProfileClient({ i18n }: { i18n: ProfilePageI18n }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [ghn, setGhn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  // `?tab=<id>` deep link. The identity-verification email and the dashboard
  // banner both point at ?tab=verification; without this they would land the
  // patient on Contact and leave them to find the tab themselves.
  const tabParam = useSearchParams().get("tab");
  const [activeTab, setActiveTab] = useState<Tab>(() =>
    tabParam && TAB_IDS.includes(tabParam as Tab) ? (tabParam as Tab) : "contact",
  );
  const [initialContact, setInitialContact] = useState({ fullName: "", phone: "", dateOfBirth: "" });
  // 17-001: on-blur required-field check, same rule the native `required`
  // attribute already enforces at submit — just surfaced earlier.
  const [fullNameTouched, setFullNameTouched] = useState(false);
  // Per-tab dirty flags (17-005 §12) — lifted from each tab's own
  // useUnsavedChanges-backed form state so the tab strip can show which
  // tabs have unsaved edits before the user navigates away from them.
  // Verification has no dirty state (auto-upload, nothing to lose).
  const [medicalDirty, setMedicalDirty] = useState(false);
  const [insuranceDirty, setInsuranceDirty] = useState(false);
  const [nationalityDirty, setNationalityDirty] = useState(false);
  const [privacyDirty, setPrivacyDirty] = useState(false);

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
        const loaded = {
          fullName: authRes.data.user.fullName ?? "",
          phone: authRes.data.user.phone ?? "",
          dateOfBirth: authRes.data.user.dateOfBirth?.slice(0, 10) ?? "",
        };
        setFullName(loaded.fullName);
        setPhone(loaded.phone);
        setDateOfBirth(loaded.dateOfBirth);
        setInitialContact(loaded);
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

  const a = i18n;
  const p = a.profile;
  const contactDirty =
    fullName !== initialContact.fullName ||
    phone !== initialContact.phone ||
    dateOfBirth !== initialContact.dateOfBirth;
  useUnsavedChanges(contactDirty);
  const fullNameError = fullNameTouched && fullName.trim() === "" ? p.fieldRequired : undefined;

  // Small "•" badge (reusing PortalTabs' existing badge/badgeAlert props,
  // no new visual primitive) marks a tab with unsaved edits so switching
  // tabs never silently loses work (17-005 §12).
  const TAB_DIRTY: Record<Tab, boolean> = {
    contact: contactDirty,
    medical: medicalDirty,
    verification: false,
    insurance: insuranceDirty,
    nationality: nationalityDirty,
    privacy: privacyDirty,
  };
  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "contact", label: p.tabContact, icon: <User aria-hidden /> },
    { id: "medical", label: p.tabMedical, icon: <HeartPulse aria-hidden /> },
    { id: "verification", label: p.tabVerification, icon: <BadgeCheck aria-hidden /> },
    { id: "insurance", label: p.tabInsurance, icon: <ShieldCheck aria-hidden /> },
    { id: "nationality", label: p.tabNationality, icon: <Flag aria-hidden /> },
    { id: "privacy", label: p.tabPrivacy, icon: <FileCheck2 aria-hidden /> },
  ];

  const needsAttention = Boolean(user && !user.emailVerifiedAt) || !ghn;
  const profileStatusItems = [
    {
      label: p.statusEmail,
      value: user?.emailVerifiedAt ? p.statusVerified : p.statusNeedsVerification,
      hint: user?.email ?? p.statusAccountEmail,
      tone: user?.emailVerifiedAt ? ("success" as const) : ("warning" as const),
      icon: <AlertCircle aria-hidden />,
    },
    {
      label: p.statusPhone,
      value: phone ? p.statusAdded : p.statusMissing,
      hint: p.statusPhoneHint,
      icon: <User aria-hidden />,
    },
    {
      label: p.statusPatientId,
      value: ghn ? p.statusActive : p.statusPending,
      hint: p.statusPatientIdHint,
      tone: ghn ? ("success" as const) : ("warning" as const),
      icon: <BadgeCheck aria-hidden />,
    },
    {
      label: p.statusProfile,
      value: fullName ? p.statusStarted : p.statusIncomplete,
      hint: p.statusProfileHint,
      icon: <FileCheck2 aria-hidden />,
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
      setInitialContact({ fullName, phone, dateOfBirth });
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
        icon={<User aria-hidden />}
        actions={
          ghn ? (
            <span
              className="rounded-md bg-[var(--portal-well)] px-3 py-1 font-mono text-sm font-semibold text-[var(--portal-text)]"
              title={p.ghnTooltip}
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
            <p className="font-semibold">{p.actionNeeded}</p>
            <p className="text-xs">
              {!user?.emailVerifiedAt && !ghn
                ? p.actionVerifyAndComplete
                : !user?.emailVerifiedAt
                  ? p.actionVerifyEmail
                  : p.actionCompleteProfile}
            </p>
          </div>
        </div>
      ) : null}

      <AdminSummaryStrip className="mb-5" items={profileStatusItems} />

      {/* Tab navigation */}
      <div className="mb-5">
        <PortalTabs
          ariaLabel={p.tabsAria}
          value={activeTab}
          onChange={(v) => setActiveTab(v as Tab)}
          items={TABS.map((tab) => ({
            value: tab.id,
            label: tab.label,
            icon: tab.icon,
            badge: TAB_DIRTY[tab.id] ? "•" : undefined,
            badgeAlert: TAB_DIRTY[tab.id],
          }))}
          syncParam="tab"
        />
      </div>

      {/* Every panel below stays mounted (kept-mounted pattern, RC4) so
          switching tabs doesn't unmount/re-fetch; visibility is toggled via
          the `hidden` attribute inside PortalTabPanel. Contact and Medical
          used to be one "Personal" tab stacking two independently-saved
          forms — split per 17-004 so each tab owns exactly one Save. */}
      <PortalTabPanel value="contact" activeValue={activeTab}>
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
              <form onSubmit={onSubmit} method="post" className="gh-form-section__span-2 grid gap-4">
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
                    onBlur={() => setFullNameTouched(true)}
                    required
                    maxLength={120}
                    aria-invalid={fullNameError ? true : undefined}
                    aria-describedby={fullNameError ? "fullName-error" : undefined}
                    className="gh-input mt-1 min-w-0"
                  />
                  {fullNameError ? (
                    <p id="fullName-error" role="alert" className="mt-1 text-xs" style={{ color: "var(--portal-danger-text)" }}>
                      {fullNameError}
                    </p>
                  ) : null}
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
                    role={msg.kind === "ok" ? "status" : "alert"}
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
                  className="justify-self-end"
                >
                  {saving ? a.profile.saving : a.profile.saveChanges}
                </Btn>
              </form>
            </FormSection>
          )}
        </>
      </PortalTabPanel>

      <PortalTabPanel value="medical" activeValue={activeTab}>
        <PatientProfileSection i18n={a.profile} onDirtyChange={setMedicalDirty} />
      </PortalTabPanel>

      <PortalTabPanel value="verification" activeValue={activeTab}>
        <VerificationTab
          i18n={{
            ...a.verification,
            badgeNotVerified: a.profile.badgeNotVerified,
            badgePending: a.profile.badgePending,
            badgeVerified: a.profile.badgeVerified,
            badgeRejected: a.profile.badgeRejected,
            docPassport: a.profile.docPassport,
            docIdCard: a.profile.docIdCard,
            docResidenceCard: a.profile.docResidenceCard,
            docNicop: a.profile.docNicop,
            docCnic: a.profile.docCnic,
            docOther: a.profile.docOther,
          }}
        />
      </PortalTabPanel>
      <PortalTabPanel value="insurance" activeValue={activeTab}>
        <InsuranceTab
          i18n={{
            ...a.insurance,
            badgeNotVerified: a.profile.badgeNotVerified,
            badgePending: a.profile.badgePending,
            badgeVerified: a.profile.badgeVerified,
            badgeRejected: a.profile.badgeRejected,
          }}
          onDirtyChange={setInsuranceDirty}
        />
      </PortalTabPanel>
      <PortalTabPanel value="nationality" activeValue={activeTab}>
        <NationalityTab
          i18n={{
            ...a.nationality,
            badgeNotVerified: a.profile.badgeNotVerified,
            badgePending: a.profile.badgePending,
            badgeVerified: a.profile.badgeVerified,
            badgeRejected: a.profile.badgeRejected,
            docPassport: a.profile.docPassport,
            docIdCard: a.profile.docIdCard,
            docResidenceCard: a.profile.docResidenceCard,
            docNicop: a.profile.docNicop,
            docCnic: a.profile.docCnic,
            docOther: a.profile.docOther,
          }}
          onDirtyChange={setNationalityDirty}
        />
      </PortalTabPanel>
      <PortalTabPanel value="privacy" activeValue={activeTab}>
        <GdprPreferencesTab i18n={a.privacy} onDirtyChange={setPrivacyDirty} />
      </PortalTabPanel>
    </div>
  );
}
