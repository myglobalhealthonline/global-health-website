"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GH2AuthShell, type GH2AuthShellI18n } from "@/components/sections/GH2PagePrimitives";
import { verifyPending2fa, resendLoginOtp, type Pending2faMethod } from "@/lib/api/auth-api";

// `auth.resetPassword` locale slice, resolved server-side and passed in (P-001).
type ResetPasswordStrings = (typeof import("@/locales/en/auth.json"))["resetPassword"];
// Reuses the login page's 2FA strings — same challenge UI, same copy.
type TwoFaStrings = (typeof import("@/locales/en/auth.json"))["login"]["twoFa"];

export function ResetPasswordClient({
  t,
  twoFa,
  shell,
}: {
  t: ResetPasswordStrings;
  twoFa: TwoFaStrings;
  shell?: GH2AuthShellI18n;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  // `?invite=1` flips the page into doctor-onboarding mode: copy
  // mentions "welcome / set" instead of "reset", and the backend mints
  // a session cookie on success so we can router.replace("/doctor").
  // Without the flag the existing forgot-password flow is preserved
  // unchanged.
  const isInvite = searchParams.get("invite") === "1";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Invite path for a 2FA-required role (doctors): the backend no longer
  // mints a session on password set — it emails a code and returns a
  // pending token, completed via the same verify-login endpoint as /login.
  const [pending, setPending] = useState<{ pendingToken: string; method: Pending2faMethod } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [otpMsg, setOtpMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [resending, setResending] = useState(false);

  async function onVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pending) return;
    setVerifying(true);
    setOtpMsg(null);
    const result = await verifyPending2fa({ pendingToken: pending.pendingToken, token: otpCode.trim() });
    setVerifying(false);
    if (!result.ok) {
      setOtpMsg({ kind: "err", text: result.message });
      return;
    }
    router.replace("/doctor");
    router.refresh();
  }

  async function onResend() {
    if (!pending) return;
    setResending(true);
    setOtpMsg(null);
    const result = await resendLoginOtp({ pendingToken: pending.pendingToken });
    setResending(false);
    setOtpMsg(result.ok ? { kind: "ok", text: twoFa.resendSent } : { kind: "err", text: result.message });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) {
      setMsg({ kind: "err", text: t.tooShort });
      return;
    }
    if (password !== confirm) {
      setMsg({ kind: "err", text: t.noMatch });
      return;
    }
    setBusy(true);
    try {
      // Same-origin proxy at /api/auth/reset-password — required for the
      // invite path so the backend's Set-Cookie lands on this host (the
      // proxy strips the upstream Domain= attribute).
      const res = await fetch(`/api/auth/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          ...(isInvite ? { invite: true } : {}),
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { needs2fa?: boolean; pendingToken?: string; method?: Pending2faMethod };
      };
      if (res.ok && json.ok) {
        if (isInvite && json.data?.needs2fa && json.data.pendingToken && json.data.method) {
          setPending({ pendingToken: json.data.pendingToken, method: json.data.method });
          setPassword("");
          setConfirm("");
        } else if (isInvite) {
          setMsg({ kind: "ok", text: t.inviteSuccess });
          setPassword("");
          setConfirm("");
          router.replace("/doctor");
          router.refresh();
        } else {
          setMsg({ kind: "ok", text: json.message ?? t.resetSuccess });
          setPassword("");
          setConfirm("");
        }
      } else {
        setMsg({ kind: "err", text: json.message ?? t.resetFailed });
      }
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : t.resetFailed });
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    const isEmailOtp = pending.method === "EMAIL_OTP";
    return (
      <GH2AuthShell
        shell={shell}
        eyebrow={t.inviteEyebrow}
        title={t.inviteHeroTitle}
        accent={t.heroAccent}
        body={isEmailOtp ? twoFa.descEmail : twoFa.descTotp}
      >
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {isEmailOtp ? twoFa.titleEmail : twoFa.titleTotp}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {isEmailOtp ? twoFa.descEmail : twoFa.descTotp}
        </p>
        <form onSubmit={onVerify} method="post" className="mt-6 space-y-4">
          <label className="block">
            <span className="gh-field-label" data-required>{twoFa.codeLabel}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\s/g, ""))}
              minLength={6}
              maxLength={8}
              required
              autoFocus
              className="gh-input mt-1 min-w-0 tracking-[0.3em]"
            />
          </label>

          {otpMsg ? (
            <p
              className={`rounded-md px-3 py-2 text-sm ${
                otpMsg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
              }`}
              role={otpMsg.kind === "err" ? "alert" : "status"}
              aria-live="polite"
            >
              {otpMsg.text}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            {isEmailOtp ? (
              <button
                type="button"
                onClick={() => void onResend()}
                disabled={resending}
                className="text-sm font-semibold text-emerald-700 underline-offset-4 hover:underline disabled:opacity-60"
              >
                {resending ? twoFa.resending : twoFa.resend}
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={verifying || otpCode.trim().length < 6}
              className="gh2-btn-lime disabled:opacity-60"
            >
              {verifying ? twoFa.verifying : twoFa.verify}
            </button>
          </div>
        </form>
      </GH2AuthShell>
    );
  }

  const heading = isInvite ? t.inviteTitle : t.resetTitle;
  const subhead = isInvite ? t.inviteSubtitle : t.resetSubtitle;
  const submitLabel = isInvite ? t.inviteSubmit : t.resetSubmit;

  return (
    <GH2AuthShell
      shell={shell}
      eyebrow={isInvite ? t.inviteEyebrow : t.resetEyebrow}
      title={isInvite ? t.inviteHeroTitle : t.resetHeroTitle}
      accent={t.heroAccent}
      body={subhead}
    >
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{heading}</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{subhead}</p>

        {!token ? (
          <p className="mt-6 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert" aria-live="polite">
            {t.noToken.replace("{kind}", isInvite ? t.inviteTokenKind : t.resetTokenKind)}
          </p>
        ) : (
          <form onSubmit={onSubmit} method="post" className="mt-6 space-y-4">
            <label className="block">
              <span className="gh-field-label" data-required>{t.newPasswordLabel}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
                minLength={8}
                maxLength={128}
                className="gh-input mt-1 min-w-0"
                autoComplete="new-password"
              />
            </label>
            <label className="block">
              <span className="gh-field-label" data-required>{t.confirmPasswordLabel}</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                aria-required="true"
                minLength={8}
                maxLength={128}
                className="gh-input mt-1 min-w-0"
                autoComplete="new-password"
              />
            </label>

            {msg ? (
              <p
                className={`rounded-md px-3 py-2 text-sm ${
                  msg.kind === "ok"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-rose-50 text-rose-800"
                }`}
                role={msg.kind === "err" ? "alert" : "status"}
                aria-live="polite"
              >
                {msg.text}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="gh2-btn-lime disabled:opacity-60"
            >
              {busy ? t.saving : submitLabel}
            </button>

            {msg?.kind === "ok" && !isInvite ? (
              <Link
                href="/login"
                className="ml-3 text-sm font-semibold text-emerald-700 hover:underline"
              >
                {t.goToSignIn}
              </Link>
            ) : null}
          </form>
        )}
    </GH2AuthShell>
  );
}
