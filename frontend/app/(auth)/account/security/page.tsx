"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, KeyRound, MailCheck, Download } from "lucide-react";
import {
  changeCurrentPassword,
  downloadOwnDataUrl,
  fetchCurrentUser,
  resendVerificationEmail,
  type AuthUser,
} from "@/lib/api/auth-api";
import { formatAppDate } from "@/lib/format-datetime";
import { DeleteAccountButton } from "./_components/delete-account-button";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { readClientLocale } from "@/lib/i18n/get-client-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { AdminSummaryStrip } from "@/components/portal-atoms";

export default function AccountSecurityPage() {
  const [locale] = useState<LocaleCode>(() => readClientLocale());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Change-password form state.
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Resend-verification state.
  const [sendingVerify, setSendingVerify] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetchCurrentUser();
      if (cancelled) return;
      if (res.ok) setUser(res.data.user);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const a = loadLocaleBundle(locale).account;

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

  return (
    <div className="gh-patient-page gh-patient-security-page">
      <header className="gh-patient-page-header mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--portal-muted)]">
          {a.security.breadcrumb}
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--portal-text)]">
          <ShieldCheck className="size-6 text-[var(--portal-primary)]" aria-hidden />
          {a.security.title}
        </h2>
        <p className="text-sm text-[var(--portal-muted)]">
          {a.security.subtitle}
        </p>
      </header>

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
                { label: "Email", value: verified ? a.security.verified : "Needs verification", hint: user?.email ?? "Account email" },
                { label: "Data export", value: "Available", hint: "Download your account data" },
                { label: "Password", value: "Protected", hint: "Update credentials anytime" },
                { label: "Account", value: "Patient", hint: "Security controls" },
              ]}
            />

            {/* Email verification panel */}
            <section className="gh-patient-security-card gh-admin-card rounded-2xl border border-[var(--portal-line)] p-6 shadow-[var(--portal-shadow)]">
              <div className="flex items-start gap-3">
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
                  <h2 className="text-base font-bold text-[var(--portal-text)]">
                    {a.security.emailVerification}
                  </h2>
                  {verified ? (
                    <p className="mt-1 text-sm text-[var(--portal-muted)]">
                      <span className="font-semibold text-emerald-700">{a.security.verified}</span>{" "}
                      {a.security.verifiedOn}{" "}
                      {formatAppDate(user!.emailVerifiedAt!)}.
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 text-sm text-[var(--portal-muted)]">
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
            </section>

            {/* Privacy controls — GDPR data-export + account-delete */}
            <section className="gh-patient-security-card mt-4 gh-admin-card rounded-2xl border border-[var(--portal-line)] p-6 shadow-[var(--portal-shadow)]">
              <h2 className="text-base font-bold text-[var(--portal-text)]">
                {a.security.yourData}
              </h2>
              <p className="mt-1 text-sm text-[var(--portal-muted)]">
                {a.security.gdprBody}
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <a
                  href={downloadOwnDataUrl()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 sm:w-auto"
                >
                  <Download className="size-4" aria-hidden />
                  {a.security.downloadData}
                </a>

                <DeleteAccountButton i18n={a.security} />
              </div>
            </section>

            {/* Change-password panel */}
            <section className="gh-patient-security-card mt-4 gh-admin-card rounded-2xl border border-[var(--portal-line)] p-6 shadow-[var(--portal-shadow)]">
              <div className="flex items-start gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <KeyRound className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-[var(--portal-text)]">
                    {a.security.changePassword}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--portal-muted)]">
                    {a.security.changePasswordBody}
                  </p>

                  <form onSubmit={onChangePassword} className="mt-4 space-y-3">
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
                        className={`rounded-md px-3 py-2 text-sm ${
                          pwdMsg.kind === "ok"
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-rose-50 text-rose-800"
                        }`}
                      >
                        {pwdMsg.text}
                      </p>
                    ) : null}

                    <button
                      type="submit"
                      disabled={savingPwd}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60 sm:w-auto"
                    >
                      {savingPwd ? a.security.updating : a.security.updatePassword}
                    </button>
                  </form>
                </div>
              </div>
          </section>
        </>
      )}
    </div>
  );
}
