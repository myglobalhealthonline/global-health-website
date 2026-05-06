"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/lib/api/auth-api";

export function ForgotPasswordForm() {
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
        <label htmlFor="forgot-email" className="gh-field-label">
          Email address
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          className="gh-input"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>

      <button type="submit" className="gh-btn gh-btn-primary" disabled={loading}>
        {loading ? "Submitting..." : "Request reset"}
      </button>

      <p className="text-sm text-[var(--color-text-muted)]">
        For security, we never confirm whether an email is registered.
      </p>

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
