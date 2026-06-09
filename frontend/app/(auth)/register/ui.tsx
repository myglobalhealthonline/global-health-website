"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { registerUser } from "@/lib/api/auth-api";

type RegisterI18n = {
  title: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phoneOptional: string;
  phonePlaceholder: string;
  passwordLabel: string;
  passwordHint: string;
  hidePassword: string;
  showPassword: string;
  passwordHelp: string;
  termsNotice: string;
  creating: string;
  createAccount: string;
};

const DEFAULT_I18N: RegisterI18n = {
  title: "Create account",
  fullNameLabel: "Full name",
  fullNamePlaceholder: "Your full name",
  emailLabel: "Email address",
  emailPlaceholder: "you@example.com",
  phoneLabel: "Phone",
  phoneOptional: "(optional)",
  phonePlaceholder: "+353...",
  passwordLabel: "Password",
  passwordHint: "At least 8 characters",
  hidePassword: "Hide password",
  showPassword: "Show password",
  passwordHelp: "Use at least 8 characters with a mix of letters and numbers.",
  termsNotice: "By creating an account, you agree to use this platform for patient booking and consultation management.",
  creating: "Creating account...",
  createAccount: "Create account",
};

export function RegisterFormFallback({ i18n = DEFAULT_I18N }: { i18n?: RegisterI18n }) {
  return (
    <form className="mt-7 grid gap-5" aria-hidden>
      <div className="grid gap-2">
        <div className="h-4 w-28 rounded bg-[var(--color-border)]/40" />
        <div className="h-11 animate-pulse rounded-[var(--radius-input)] bg-[var(--color-border)]/30" />
      </div>
      <div className="grid gap-2">
        <div className="h-4 w-24 rounded bg-[var(--color-border)]/40" />
        <div className="h-11 animate-pulse rounded-[var(--radius-input)] bg-[var(--color-border)]/30" />
      </div>
      <div className="gh-btn gh-btn-primary mt-1 animate-pulse opacity-60">{i18n.createAccount}</div>
    </form>
  );
}

export function RegisterForm({ i18n = DEFAULT_I18N }: { i18n?: RegisterI18n }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function getNextPath() {
    const next = searchParams.get("next");
    // Same-origin only. Block protocol-relative `//evil.com` redirects
    // — browsers resolve those against the current scheme and treat
    // them as off-site, so a bare startsWith("/") check is insufficient.
    if (
      !next ||
      !next.startsWith("/") ||
      next.startsWith("//") ||
      next.startsWith("/\\")
    ) {
      return "/account";
    }
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setLoading(true);
    setMessage(null);
    setIsError(false);
    const result = await registerUser({ fullName, email, phone, password });
    if (result.ok) {
      setMessage("Account created. Redirecting to your account...");
      setLoading(false);
      router.replace(getNextPath());
      router.refresh();
      return;
    }
    setLoading(false);
    setIsError(true);
    setMessage(result.message);
  }

  return (
    <form onSubmit={onSubmit} className="mt-7 grid gap-5">
      <div className="grid gap-2">
        <label htmlFor="register-name" className="gh-field-label">
          {i18n.fullNameLabel}
        </label>
        <input
          id="register-name"
          name="fullName"
          type="text"
          className="gh-input"
          placeholder={i18n.fullNamePlaceholder}
          required
          autoComplete="name"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="register-email" className="gh-field-label">
          {i18n.emailLabel}
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          className="gh-input"
          placeholder={i18n.emailPlaceholder}
          required
          autoComplete="email"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="register-phone" className="gh-field-label">
          {i18n.phoneLabel} <span className="text-[var(--color-text-muted)]">{i18n.phoneOptional}</span>
        </label>
        <input
          id="register-phone"
          name="phone"
          type="tel"
          className="gh-input"
          placeholder={i18n.phonePlaceholder}
          autoComplete="tel"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="register-password" className="gh-field-label">
          {i18n.passwordLabel}
        </label>
        <div className="relative">
          <input
            id="register-password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="gh-input pr-12"
            placeholder={i18n.passwordHint}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            aria-label={showPassword ? i18n.hidePassword : i18n.showPassword}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          {i18n.passwordHelp}
        </p>
      </div>

      <p className="text-sm text-[var(--color-text-muted)]">
        {i18n.termsNotice}
      </p>

      <button type="submit" className="gh-btn gh-btn-primary mt-1" disabled={loading}>
        {loading ? i18n.creating : i18n.createAccount}
      </button>

      {message ? (
        <p
          className={`rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm ${
            isError ? "gh-status-error" : "gh-status-success"
          }`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}


