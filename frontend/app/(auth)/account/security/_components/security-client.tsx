"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, KeyRound, MailCheck, Download, LogOut, Ban } from "lucide-react";
import {
  cancelAccountDeletion,
  changeCurrentPassword,
  downloadOwnDataUrl,
  fetchCurrentUser,
  resendVerificationEmail,
  signOutAllDevices,
  type AuthUser,
} from "@/lib/api/auth-api";
import { formatAppDate } from "@/lib/format-datetime";
import { DeleteAccountButton } from "./delete-account-button";
import type { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { PortalTabs, PortalTabPanel } from "@/components/PortalTabs";
import { FormSection } from "@/components/FormSection";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";

export type SecurityI18n = ReturnType<typeof loadLocaleBundle>["account"]["security"];

type Tab = "password" | "access" | "data";

export function AccountSecurityClient({ i18n }: { i18n: SecurityI18n }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("password");

  // Change-password form state.
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Resend-verification state.
  const [sendingVerify, setSendingVerify] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Grace-period deletion + cancel state.
  const [deletionScheduledAt, setDeletionScheduledAt] = useState<string | null>(null);
  const [cancellingDeletion, setCancellingDeletion] = useState(false);
  const [deletionMsg, setDeletionMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Sign-out-all-devices state.
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [signOutMsg, setSignOutMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetchCurrentUser();
      if (cancelled) return;
      if (res.ok) {
        setUser(res.data.user);
        setDeletionScheduledAt(res.data.user.deletionScheduledAt);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const a = { security: i18n };

  async function onCancelDeletion() {
    setDeletionMsg(null);
    setCancellingDeletion(true);
    const res = await cancelAccountDeletion();
    setCancellingDeletion(false);
    if (res.ok) {
      setDeletionScheduledAt(null);
      setDeletionMsg({ kind: "ok", text: "Account deletion cancelled." });
    } else {
      setDeletionMsg({ kind: "err", text: res.message });
    }
  }

  async function onSignOutAll() {
    setSignOutMsg(null);
    setSigningOutAll(true);
    const res = await signOutAllDevices();
    setSigningOutAll(false);
    if (res.ok) {
      router.replace("/login");
      router.refresh();
    } else {
      setSignOutMsg(res.message);
    }
  }

  async function onChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwdMsg(null);
    if (newPassword !== confirmPassword) {
      setPwdMsg({ kind: "err", text: a.security.passwordNoMatch });
      return;
    }
    if (newPassword.length < 8) {
      setPwdMsg({ kind: "err", text: a.security.passwordTooShort });
      return;
    }
    setSavingPwd(true);
    const res = await changeCurrentPassword({ currentPassword, newPassword });
    setSavingPwd(false);
    if (res.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwdMsg({ kind: "ok", text: a.security.passwordUpdated });
    } else {
      setPwdMsg({ kind: "err", text: res.message });
    }
  }

  async function onResendVerification() {
    setVerifyMsg(null);
    setSendingVerify(true);
    const res = await resendVerificationEmail();
    setSendingVerify(false);
    if (res.ok) {
      if (res.data.alreadyVerified) {
        setVerifyMsg({ kind: "ok", text: a.security.alreadyVerified });
      } else {
        setVerifyMsg({ kind: "ok", text: a.security.verificationSent });
      }
    } else {
      setVerifyMsg({ kind: "err", text: res.message });
    }
  }

  const verified = Boolean(user?.emailVerifiedAt);
  useUnsavedChanges(Boolean(currentPassword || newPassword || confirmPassword));

  return (
    <div className="gh-patient-page gh-patient-security-page">
      <PageHeader
        eyebrow={a.security.breadcrumb}
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-[var(--portal-primary)]" aria-hidden />
            {a.security.title}
          </span>
        }
        description={a.security.subtitle}
      />

      {deletionScheduledAt ? (
        <div className="gh-status-warning mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          <span>
            {a.security.deletionScheduledBanner.replace(
              "{date}",
              formatAppDate(deletionScheduledAt),
            )}
          </span>
          <button
            type="button"
            onClick={() => void onCancelDeletion()}
            disabled={cancellingDeletion}
            className="inline-flex items-center gap-1.5 rounded-md border border-current px-3 py-1.5 text-xs font-semibold hover:opacity-80 disabled:opacity-60"
          >
            <Ban className="size-3.5" aria-hidden />
            {cancellingDeletion ? a.security.cancellingDeletion : a.security.cancelDeletion}
          </button>
        </div>
      ) : null}
      {deletionMsg ? (
        <p
          role={deletionMsg.kind === "ok" ? "status" : "alert"}
          className={`mb-5 rounded-md px-3 py-2 text-sm ${
            deletionMsg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
          }`}
        >
          {deletionMsg.text}
        </p>
      ) : null}

      {loading ? (
        <div className="gh-card grid gap-4 p-6">
          <div className="h-4 w-40 animate-pulse rounded-full bg-[var(--portal-well)]" />
          <div className="h-20 animate-pulse rounded-[14px] bg-[var(--portal-well)]" />
          <div className="h-28 animate-pulse rounded-[14px] bg-[var(--portal-well)]" />
          <span className="sr-only">{a.security.loading}</span>
        </div>
      ) : (
        <>
            <AdminSummaryStrip
              className="mb-5"
              items={[
                { label: "Email", value: verified ? a.security.verified : "Needs verification", hint: user?.email ?? "Account email", icon: <MailCheck aria-hidden /> },
                { label: "Data export", value: "Available", hint: "Download your account data", icon: <Download aria-hidden /> },
                { label: "Password", value: "Protected", hint: "Update credentials anytime", icon: <KeyRound aria-hidden /> },
                { label: "Account", value: "Patient", hint: "Security controls", icon: <ShieldCheck aria-hidden /> },
              ]}
            />

            <div className="mb-5">
              <PortalTabs
                ariaLabel={a.security.tabsAria}
                value={activeTab}
                onChange={(v) => setActiveTab(v as Tab)}
                items={[
                  { value: "password", label: a.security.tabPassword, icon: <KeyRound aria-hidden /> },
                  { value: "access", label: a.security.tabAccess, icon: <ShieldCheck aria-hidden /> },
                  { value: "data", label: a.security.yourData, icon: <Download aria-hidden /> },
                ]}
                syncParam="tab"
              />
            </div>

            <PortalTabPanel value="password" activeValue={activeTab}>
            {/* Change-password panel */}
            <FormSection title={a.security.changePassword} description={a.security.changePasswordBody}>
              <div className="gh-form-section__span-2 flex items-start gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <KeyRound className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <form onSubmit={onChangePassword} method="post" className="space-y-3">
                    <label className="block">
                      <span className="gh-field-label">{a.security.currentPassword}</span>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="gh-input mt-1 min-w-0"
                      />
                    </label>

                    <label className="block">
                      <span className="gh-field-label">{a.security.newPassword}</span>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                        maxLength={128}
                        autoComplete="new-password"
                        className="gh-input mt-1 min-w-0"
                      />
                    </label>

                    <label className="block">
                      <span className="gh-field-label">{a.security.confirmNewPassword}</span>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        maxLength={128}
                        autoComplete="new-password"
                        className="gh-input mt-1 min-w-0"
                      />
                    </label>

                    {pwdMsg ? (
                      <p
                        role={pwdMsg.kind === "ok" ? "status" : "alert"}
                        className={`rounded-md px-3 py-2 text-sm ${
                          pwdMsg.kind === "ok"
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-rose-50 text-rose-800"
                        }`}
                      >
                        {pwdMsg.text}
                      </p>
                    ) : null}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingPwd}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60 sm:w-auto"
                      >
                        {savingPwd ? a.security.updating : a.security.updatePassword}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </FormSection>
            </PortalTabPanel>

            <PortalTabPanel value="access" activeValue={activeTab}>
            {/* Email verification panel */}
            <FormSection title={a.security.emailVerification}>
              <div className="gh-form-section__span-2 flex items-start gap-3">
                <span
                  className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ${
                    verified
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <MailCheck className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  {verified ? (
                    <p className="text-sm text-[var(--portal-muted)]">
                      <span className="font-semibold text-emerald-700">{a.security.verified}</span>{" "}
                      {a.security.verifiedOn}{" "}
                      {formatAppDate(user!.emailVerifiedAt!)}.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-[var(--portal-muted)]">
                        {a.security.unverifiedBody.replace("{email}", user?.email ?? "")}
                      </p>
                      <button
                        type="button"
                        onClick={onResendVerification}
                        disabled={sendingVerify}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 sm:w-auto"
                      >
                        {sendingVerify ? a.security.sending : a.security.resendVerification}
                      </button>
                    </>
                  )}
                  {verifyMsg ? (
                    <p
                      role={verifyMsg.kind === "ok" ? "status" : "alert"}
                      className={`mt-3 rounded-md px-3 py-2 text-sm ${
                        verifyMsg.kind === "ok"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-rose-50 text-rose-800"
                      }`}
                    >
                      {verifyMsg.text}
                    </p>
                  ) : null}
                </div>
              </div>
            </FormSection>

            {/* Sign out of all devices */}
            <FormSection
              title={a.security.signOutAllDevices}
              description={a.security.signOutAllDevicesBody}
              className="mt-4"
            >
              <div className="gh-form-section__span-2">
                <button
                  type="button"
                  onClick={() => void onSignOutAll()}
                  disabled={signingOutAll}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 sm:w-auto"
                >
                  <LogOut className="size-4" aria-hidden />
                  {signingOutAll ? a.security.signingOutAll : a.security.signOutAllDevices}
                </button>
                {signOutMsg ? (
                  <p role="alert" className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    {signOutMsg}
                  </p>
                ) : null}
              </div>
            </FormSection>
            </PortalTabPanel>

            <PortalTabPanel value="data" activeValue={activeTab}>
            {/* Privacy controls — GDPR data-export + account-delete */}
            <FormSection title={a.security.yourData} description={a.security.gdprBody}>
              <div className="gh-form-section__span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <a
                  href={downloadOwnDataUrl()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 sm:w-auto"
                >
                  <Download className="size-4" aria-hidden />
                  {a.security.downloadData}
                </a>

                <DeleteAccountButton
                  i18n={a.security}
                  onScheduled={setDeletionScheduledAt}
                />
              </div>
            </FormSection>
            </PortalTabPanel>
          </>
      )}
    </div>
  );
}
