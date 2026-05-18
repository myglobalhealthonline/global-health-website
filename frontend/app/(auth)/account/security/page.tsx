"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function AccountSecurityPage() {
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

  async function onChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwdMsg(null);
    if (newPassword !== confirmPassword) {
      setPwdMsg({ kind: "err", text: "New password and confirmation do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPwdMsg({ kind: "err", text: "New password must be at least 8 characters." });
      return;
    }
    setSavingPwd(true);
    const res = await changeCurrentPassword({ currentPassword, newPassword });
    setSavingPwd(false);
    if (res.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwdMsg({ kind: "ok", text: "Password updated. Use the new one next time you sign in." });
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
        setVerifyMsg({ kind: "ok", text: "This email is already verified." });
      } else {
        setVerifyMsg({
          kind: "ok",
          text: "Verification email sent. Check your inbox — link expires in 24 hours.",
        });
      }
    } else {
      setVerifyMsg({ kind: "err", text: res.message });
    }
  }

  const verified = Boolean(user?.emailVerifiedAt);

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Account
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
          <ShieldCheck className="size-6 text-[var(--color-brand-primary)]" aria-hidden />
          Security
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Manage your password and email verification status.
        </p>
      </header>

      {loading ? (
        <div className="gh-card p-6 text-sm text-[var(--color-text-muted)]">
          Loading…
        </div>
      ) : (
        <>
            {/* Email verification panel */}
            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
                  <h2 className="text-base font-bold text-slate-900">Email verification</h2>
                  {verified ? (
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-semibold text-emerald-700">Verified</span> on{" "}
                      {formatAppDate(user!.emailVerifiedAt!)}.
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 text-sm text-slate-600">
                        Your email address ({user?.email}) hasn&apos;t been verified yet.
                        Verifying confirms you can receive booking + password-reset emails.
                      </p>
                      <button
                        type="button"
                        onClick={onResendVerification}
                        disabled={sendingVerify}
                        className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                      >
                        {sendingVerify ? "Sending…" : "Resend verification email"}
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
            <section className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Your data</h2>
              <p className="mt-1 text-sm text-slate-600">
                Under GDPR you can download everything we hold about you, or
                delete your account.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <a
                  href={downloadOwnDataUrl()}
                  className="inline-flex items-center gap-2 rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  <Download className="size-4" aria-hidden />
                  Download my data (JSON)
                </a>

                <DeleteAccountButton />
              </div>
            </section>

            {/* Change-password panel */}
            <section className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <KeyRound className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-slate-900">Change password</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    You&apos;ll need your current password to confirm the change.
                  </p>

                  <form onSubmit={onChangePassword} className="mt-4 space-y-3">
                    <label className="block">
                      <span className="gh-field-label">Current password</span>
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
                      <span className="gh-field-label">New password</span>
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
                      <span className="gh-field-label">Confirm new password</span>
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
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {savingPwd ? "Updating…" : "Update password"}
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
