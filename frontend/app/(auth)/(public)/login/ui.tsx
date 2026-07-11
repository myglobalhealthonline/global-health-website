"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { loginUser } from "@/lib/api/auth-api";
import styles from "./login.module.css";

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
    if (result.ok) {
      setMessage(i18n.loggedInAs.replace("{name}", result.data.user.fullName));
      setLoading(false);
      router.replace(getNextPath(result.data.user.role));
      router.refresh();
      return;
    }
    setIsError(true);
    setMessage(result.message);
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5" suppressHydrationWarning>
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
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[var(--color-text-muted)] transition-colors duration-150 hover:text-[var(--color-text-primary)]"
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
