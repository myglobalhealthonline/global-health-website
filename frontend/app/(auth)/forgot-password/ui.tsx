"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/lib/api/auth-api";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    setLoading(true);
    setMessage(null);
    const result = await requestPasswordReset({ email });
    setLoading(false);
    setMessage(
      result.ok
        ? (result.message ?? "If an account exists, reset instructions will be sent when email is configured.")
        : result.message,
    );
  }

  return (
    <form action={onSubmit} className="mt-6 grid gap-4">
      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Email</span>
        <input name="email" type="email" className="gh-input" placeholder="you@example.com" required />
      </label>
      <button type="submit" className="gh-btn gh-btn-primary" disabled={loading}>
        {loading ? "Submitting..." : "Request reset"}
      </button>
      <p className="text-sm text-[var(--color-text-muted)]">
        For security, we never confirm whether an email is registered.
      </p>
      {message ? (
        <p className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
          {message}
        </p>
      ) : null}
    </form>
  );
}
