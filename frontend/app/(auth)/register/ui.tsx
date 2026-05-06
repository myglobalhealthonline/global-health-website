"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { registerUser } from "@/lib/api/auth-api";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  function getNextPath() {
    const next = searchParams.get("next");
    if (!next || !next.startsWith("/")) return "/account";
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
    <form onSubmit={onSubmit} className="mt-6 grid gap-4">
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
      <p className="text-sm text-[var(--color-text-muted)]">
        Use at least 8 characters and avoid reusing passwords from other sites.
      </p>
      <button type="submit" className="gh-btn gh-btn-primary" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </button>
      {message ? (
        <p
          className={
            isError ? "text-sm text-red-600 dark:text-red-400" : "text-sm text-[var(--color-text-muted)]"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
