"use client";

import { useState } from "react";
import { loginUser } from "@/lib/api/auth-api";

export function LoginForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setLoading(true);
    setMessage(null);
    const result = await loginUser({ email, password });
    setLoading(false);
    setMessage(result.ok ? `Logged in as ${result.data.user.fullName}.` : result.message);
  }

  return (
    <form action={onSubmit} className="mt-6 grid gap-4">
      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Email</span>
        <input name="email" type="email" className="gh-input" placeholder="you@example.com" required />
      </label>
      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Password</span>
        <input name="password" type="password" className="gh-input" placeholder="Your password" required />
      </label>
      <button type="submit" className="gh-btn gh-btn-primary" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
      {message ? <p className="text-sm text-[var(--color-text-muted)]">{message}</p> : null}
    </form>
  );
}
