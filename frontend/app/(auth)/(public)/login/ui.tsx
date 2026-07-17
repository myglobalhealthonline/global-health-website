"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { loginUser, verifyPending2fa, resendLoginOtp, type Pending2faMethod } from "@/lib/api/auth-api";
import { setClientLocaleCookie } from "@/lib/i18n/get-client-locale";
import styles from "./login.module.css";

/**
 * Phase 3 login-seed (docs/LOCALE_INVESTIGATION_2026-07-16.md §9): if this
 * browser has no `gh_locale` cookie yet (new device, cleared cookies), seed
 * it from the account's last explicit language choice so the user doesn't
 * land back on Accept-Language/country-default after signing in elsewhere.
 * Policy is seed-only-when-absent — an active device choice always wins,
 * this never overwrites it.
 */
function seedLocaleFromProfile(preferredLocale: string | null): void {
  if (!preferredLocale) return;
  const hasCookie = document.cookie
    .split(";")
    .some((part) => part.trim().startsWith("gh_locale="));
  if (hasCookie) return;
  setClientLocaleCookie(preferredLocale.toLowerCase());
}

type LoginI18n = {
  title: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  forgotPassword: string;
  passwordPlaceholder: string;
  hidePassword: string;
  showPassword: string;
  rememberMe: string;
  signingIn: string;
  signIn: string;
  loggedInAs: string;
  twoFa: {
    titleEmail: string;
    titleTotp: string;
    descEmail: string;
    descTotp: string;
    codeLabel: string;
    verify: string;
    verifying: string;
    resend: string;
    resending: string;
    resendSent: string;
    back: string;
  };
};

const DEFAULT_I18N: LoginI18n = {
  title: "Sign in",
  emailLabel: "Email address",
  emailPlaceholder: "you@example.com",
  passwordLabel: "Password",
  forgotPassword: "Forgot password?",
  passwordPlaceholder: "Your password",
  hidePassword: "Hide password",
  showPassword: "Show password",
  rememberMe: "Remember me on this device",
  signingIn: "Signing in…",
  signIn: "Sign in",
  loggedInAs: "Logged in as {name}. Redirecting...",
  twoFa: {
    titleEmail: "Check your email",
    titleTotp: "Enter your authenticator code",
    descEmail: "We've sent a 6-digit code to your email. It expires in 10 minutes.",
    descTotp: "Enter the 6-digit code from your authenticator app, or a backup code.",
    codeLabel: "Code",
    verify: "Verify & sign in",
    verifying: "Verifying…",
    resend: "Resend code",
    resending: "Sending…",
    resendSent: "A new code has been sent.",
    back: "Back to sign in",
  },
};

export function LoginFormFallback({ i18n = DEFAULT_I18N }: { i18n?: LoginI18n }) {
  return (
    <form className="grid gap-5" aria-hidden>
      <div className="grid gap-2">
        <div className="h-4 w-24 rounded bg-[var(--color-border)]/40" />
        <div className="h-[52px] animate-pulse rounded-[var(--radius-input)] bg-[var(--color-border)]/30" />
      </div>
      <div className="grid gap-2">
        <div className="h-4 w-20 rounded bg-[var(--color-border)]/40" />
        <div className="h-[52px] animate-pulse rounded-[var(--radius-input)] bg-[var(--color-border)]/30" />
      </div>
      <div className="gh2-btn-lime mt-2 animate-pulse justify-center opacity-60">
        {i18n.signIn}
      </div>
    </form>
  );
}

export function LoginForm({ i18n = DEFAULT_I18N }: { i18n?: LoginI18n }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Pending-2FA step (TOTP or Task 4's email-OTP fallback).
  const [pending, setPending] = useState<{ pendingToken: string; method: Pending2faMethod } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState(false);
  const [resending, setResending] = useState(false);

  function getNextPath(
    role: "PATIENT" | "ADMIN" | "DOCTOR" | "LOCAL_ADMIN" | "SUPER_ADMIN" | "CORPORATE_ADMIN",
  ) {
    const next = searchParams.get("next");
    if (
      !next ||
      !next.startsWith("/") ||
      next.startsWith("//") ||
      next.startsWith("/\\")
    ) {
      if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "LOCAL_ADMIN") return "/admin";
      if (role === "DOCTOR") return "/doctor";
      if (role === "CORPORATE_ADMIN") return "/corporate";
      return "/account";
    }
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setLoading(true);
    setMessage(null);
    setIsError(false);
    const result = await loginUser({ email, password });
    setLoading(false);
    if (!result.ok) {
      setIsError(true);
      setMessage(result.message);
      return;
    }
    if (result.data.needs2fa) {
      setPending({ pendingToken: result.data.pendingToken, method: result.data.method });
      setOtpMessage(null);
      setOtpError(false);
      setOtpCode("");
      return;
    }
    seedLocaleFromProfile(result.data.user.preferredLocale);
    setMessage(i18n.loggedInAs.replace("{name}", result.data.user.fullName));
    router.replace(getNextPath(result.data.user.role));
    router.refresh();
  }

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending) return;
    setVerifying(true);
    setOtpError(false);
    setOtpMessage(null);
    const result = await verifyPending2fa({ pendingToken: pending.pendingToken, token: otpCode.trim() });
    setVerifying(false);
    if (!result.ok) {
      setOtpError(true);
      setOtpMessage(result.message);
      return;
    }
    seedLocaleFromProfile(result.data.user.preferredLocale);
    router.replace(getNextPath(result.data.user.role));
    router.refresh();
  }

  async function onResend() {
    if (!pending) return;
    setResending(true);
    setOtpError(false);
    setOtpMessage(null);
    const result = await resendLoginOtp({ pendingToken: pending.pendingToken });
    setResending(false);
    setOtpError(!result.ok);
    setOtpMessage(result.ok ? i18n.twoFa.resendSent : result.message);
  }

  if (pending) {
    const isEmailOtp = pending.method === "EMAIL_OTP";
    return (
      <form onSubmit={onVerify} method="post" className="grid gap-5" suppressHydrationWarning>
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
            <ShieldCheck className="size-5" style={{ color: "#3E8B63" }} aria-hidden />
            {isEmailOtp ? i18n.twoFa.titleEmail : i18n.twoFa.titleTotp}
          </h2>
          <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {isEmailOtp ? i18n.twoFa.descEmail : i18n.twoFa.descTotp}
          </p>
        </div>

        <div className="grid gap-2">
          <label htmlFor="login-2fa-code" className="gh-field-label" data-required>
            {i18n.twoFa.codeLabel}
          </label>
          <input
            id="login-2fa-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="gh-input tracking-[0.3em]"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\s/g, ""))}
            minLength={6}
            maxLength={8}
            required
            autoFocus
          />
        </div>

        {otpMessage ? (
          <p
            className={`rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm ${
              otpError ? "gh-status-error" : "gh-status-success"
            }`}
            role={otpError ? "alert" : "status"}
            aria-live="polite"
          >
            {otpMessage}
          </p>
        ) : null}

        <button
          type="submit"
          className="gh2-btn-lime mt-1 w-full justify-center disabled:opacity-60"
          disabled={verifying || otpCode.trim().length < 6}
          style={{ width: "100%" }}
        >
          {verifying ? i18n.twoFa.verifying : i18n.twoFa.verify}
          {!verifying && <ArrowRight className="ml-1.5 size-4 shrink-0" aria-hidden />}
        </button>

        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setPending(null)}
            className="font-semibold underline-offset-4 hover:underline"
            style={{ color: "var(--color-text-muted)" }}
          >
            {i18n.twoFa.back}
          </button>
          {isEmailOtp ? (
            <button
              type="button"
              onClick={() => void onResend()}
              disabled={resending}
              className="font-semibold underline-offset-4 hover:underline disabled:opacity-60"
              style={{ color: "var(--color-brand-accent)" }}
            >
              {resending ? i18n.twoFa.resending : i18n.twoFa.resend}
            </button>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} method="post" className="grid gap-5" suppressHydrationWarning>
      {/* Email */}
      <div className="grid gap-2">
        <label htmlFor="login-email" className="gh-field-label" data-required>
          {i18n.emailLabel}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#3E8B63" }}>
            <Mail className="size-[17px]" aria-hidden />
          </span>
          <input
            id="login-email"
            name="email"
            type="email"
            className="gh-input"
            style={{ paddingLeft: "2.75rem" }}
            placeholder={i18n.emailPlaceholder}
            required
            aria-required="true"
            autoComplete="email"
          />
        </div>
      </div>

      {/* Password */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="gh-field-label" data-required>
            {i18n.passwordLabel}
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold underline-offset-4 hover:underline"
            style={{ color: "var(--color-brand-accent)" }}
          >
            {i18n.forgotPassword}
          </Link>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#3E8B63" }}>
            <Lock className="size-[17px]" aria-hidden />
          </span>
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="gh-input"
            style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem" }}
            placeholder={i18n.passwordPlaceholder}
            required
            aria-required="true"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-white/55 transition-colors duration-150 hover:text-[var(--color-brand-accent)]"
            aria-label={showPassword ? i18n.hidePassword : i18n.showPassword}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>

      {/* Remember me */}
      <label className="flex cursor-pointer items-center gap-2 text-portal-compact text-[var(--color-text-body)]">
        <input
          type="checkbox"
          name="remember"
          defaultChecked
          className={`${styles.rememberCheckbox} size-4`}
        />
        {i18n.rememberMe}
      </label>

      {/* Submit */}
      <button
        type="submit"
        className="gh2-btn-lime mt-1 w-full justify-center disabled:opacity-60"
        disabled={loading}
        style={{ width: "100%" }}
      >
        {loading ? i18n.signingIn : i18n.signIn}
        {!loading && <ArrowRight className="ml-1.5 size-4 shrink-0" aria-hidden />}
      </button>

      {message ? (
        <p
          className={`rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm ${
            isError ? "gh-status-error" : "gh-status-success"
          }`}
          role={isError ? "alert" : "status"}
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
