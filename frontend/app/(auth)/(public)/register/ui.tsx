"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { registerUser } from "@/lib/api/auth-api";
import { PhoneField } from "@/components/forms/phone-field";

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
    <form className="grid gap-6" aria-hidden>
      <div className="grid gap-2">
        <div className="h-4 w-28 rounded bg-[var(--color-border)]/40" />
        <div className="h-11 animate-pulse rounded-[var(--radius-input)] bg-[var(--color-border)]/30" />
      </div>
      <div className="grid gap-2">
        <div className="h-4 w-24 rounded bg-[var(--color-border)]/40" />
        <div className="h-11 animate-pulse rounded-[var(--radius-input)] bg-[var(--color-border)]/30" />
      </div>
      <div className="gh2-btn-lime mt-1 animate-pulse justify-center opacity-60">{i18n.createAccount}</div>
    </form>
  );
}

export function RegisterForm({ i18n = DEFAULT_I18N }: { i18n?: RegisterI18n }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const acceptTerms = formData.get("acceptTerms") === "on";
    // PhoneField submits "+<dial> <national>" (or "" when left blank).
    // Validate digit count before hitting the API — 7–15 digits per E.164.
    const phoneDigits = phone.replace(/[\s().-]/g, "");
    if (phone && !/^\+\d{7,15}$/.test(phoneDigits)) {
      setIsError(true);
      setMessage("Enter a valid phone number (digits only, without the country code).");
      return;
    }
    setLoading(true);
    setMessage(null);
    setIsError(false);
    const result = await registerUser({ fullName, email, phone, password, acceptTerms });
    setLoading(false);
    if (result.ok) {
      // S-024: the backend returns this identical shape/status whether the
      // email was new or already registered. Auto-redirecting only when a
      // session exists (result.data.user !== null) would leak that
      // distinction right back through client-visible behavior — redirect
      // vs. stay-and-show-a-message is as much a signal as a different
      // HTTP status. Every registration attempt gets the same message and
      // stays on this page; a genuinely new account still gets its
      // session cookie and can navigate in once verified.
      setMessage("Account created. Check your email to verify your account.");
      return;
    }
    setIsError(true);
    setMessage(result.message);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" suppressHydrationWarning>
      <div className="grid gap-2">
        <label htmlFor="register-name" className="gh-field-label" data-required>
          {i18n.fullNameLabel}
        </label>
        <input
          id="register-name"
          name="fullName"
          type="text"
          className="gh-input"
          placeholder={i18n.fullNamePlaceholder}
          required
          aria-required="true"
          autoComplete="name"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="register-email" className="gh-field-label" data-required>
          {i18n.emailLabel}
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          className="gh-input"
          placeholder={i18n.emailPlaceholder}
          required
          aria-required="true"
          autoComplete="email"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="register-phone" className="gh-field-label">
          {i18n.phoneLabel} <span className="text-[var(--color-text-muted)]">{i18n.phoneOptional}</span>
        </label>
        {/* Placeholder stays the PhoneField default national-number example
            ("871234567") — the dial code lives in the select, so a "+353..."
            placeholder here would invite double-entering the country code. */}
        <PhoneField id="register-phone" name="phone" />
      </div>

      <div className="grid gap-2">
        <label htmlFor="register-password" className="gh-field-label" data-required>
          {i18n.passwordLabel}
        </label>
        <div className="relative">
          <input
            id="register-password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="gh-input"
            style={{ paddingRight: "2.75rem" }}
            placeholder={i18n.passwordHint}
            required
            aria-required="true"
            minLength={8}
            autoComplete="new-password"
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
        <p className="text-xs text-[var(--color-text-muted)]">
          {i18n.passwordHelp}
        </p>
      </div>

      <label
        className="flex cursor-pointer items-start gap-2.5 rounded-xl px-4 py-3 text-portal-meta leading-relaxed"
        style={{ background: "var(--color-background-soft)", color: "var(--color-text-muted)" }}
      >
        <input
          type="checkbox"
          name="acceptTerms"
          required
          aria-required="true"
          className="mt-0.5 size-4 shrink-0"
          style={{ accentColor: "var(--color-brand-accent)" }}
        />
        <span>
          By continuing, you agree to our{" "}
          <Link href="/terms" className="font-semibold underline-offset-2 hover:underline" style={{ color: "var(--color-brand-accent)" }}>Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="font-semibold underline-offset-2 hover:underline" style={{ color: "var(--color-brand-accent)" }}>Privacy Policy</Link>.
          Your health data stays private.
        </span>
      </label>

      <div className="pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        <button type="submit" className="gh2-btn-lime w-full justify-center disabled:opacity-60" disabled={loading} style={{ width: "100%" }}>
          {loading ? i18n.creating : i18n.createAccount}
        </button>
      </div>

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

