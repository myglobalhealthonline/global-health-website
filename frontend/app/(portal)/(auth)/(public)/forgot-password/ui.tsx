"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/lib/api/auth-api";

type ForgotPasswordI18n = {
  emailLabel: string;
  emailPlaceholder: string;
  submitting: string;
  requestReset: string;
  securityNote: string;
};

const DEFAULT_I18N: ForgotPasswordI18n = {
  emailLabel: "Email address",
  emailPlaceholder: "you@example.com",
  submitting: "Submitting...",
  requestReset: "Request reset",
  securityNote: "For security, we never confirm whether an email is registered.",
};

export function ForgotPasswordForm({ i18n = DEFAULT_I18N }: { i18n?: ForgotPasswordI18n }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    setLoading(true);
    setMessage(null);
    setIsError(false);
    const result = await requestPasswordReset({ email });
    setLoading(false);
    setMessage(
      result.ok
        ? (result.message ?? "If an account exists, reset instructions will be sent when email is configured.")
        : result.message,
    );
    if (!result.ok) setIsError(true);
  }

  return (
    <form action={onSubmit} className="mt-7 grid gap-5">
      <div className="grid gap-2">
        <label htmlFor="forgot-email" className="gh-field-label" data-required>
          {i18n.emailLabel}
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          className="gh-input"
          placeholder={i18n.emailPlaceholder}
          required
          aria-required="true"
          autoComplete="email"
        />
      </div>

      <button type="submit" className="gh2-btn-lime w-full justify-center disabled:opacity-60" disabled={loading}>
        {loading ? i18n.submitting : i18n.requestReset}
      </button>

      <p className="text-sm text-[var(--color-text-muted)]">
        {i18n.securityNote}
      </p>

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
