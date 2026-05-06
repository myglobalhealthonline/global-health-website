"use client";

import { useState } from "react";
import { registerUser } from "@/lib/api/auth-api";

export function RegisterForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setLoading(true);
    setMessage(null);
    const result = await registerUser({ fullName, email, phone, password });
    setLoading(false);
    setMessage(result.ok ? "Account created. You are now signed in." : result.message);
  }

  return (
    <form action={onSubmit} className="mt-6 grid gap-4">
      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Full name</span>
        <input name="fullName" type="text" className="gh-input" placeholder="Your full name" required />
      </label>
      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Email</span>
        <input name="email" type="email" className="gh-input" placeholder="you@example.com" required />
      </label>
      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Phone (optional)</span>
        <input name="phone" type="tel" className="gh-input" placeholder="+353..." />
      </label>
      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Password</span>
        <input name="password" type="password" className="gh-input" placeholder="At least 8 characters" required />
      </label>
      <button type="submit" className="gh-btn gh-btn-primary" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </button>
      {message ? <p className="text-sm text-[var(--color-text-muted)]">{message}</p> : null}
    </form>
  );
}
