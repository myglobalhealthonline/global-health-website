"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser } from "@/lib/api/auth-api";

export function LoginForm() {
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
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setLoading(true);
    setMessage(null);
    setIsError(false);
    const result = await loginUser({ email, password });
    if (result.ok) {
      setMessage(`Logged in as ${result.data.user.fullName}. Redirecting...`);
      setLoading(false);
      router.replace(getNextPath());
      router.refresh();
      return;
    }
    setIsError(true);
    setMessage(result.message);
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-4">
      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Email</span>
        <input name="email" type="email" className="gh-input" placeholder="you@example.com" required />
      </label>
      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Password</span>
        <input name="password" type="password" className="gh-input" placeholder="Your password" required />
      </label>
      <p className="text-sm text-[var(--color-text-muted)]">
        Forgot your password? <Link href="/forgot-password" className="gh-link">Request a reset</Link>
      </p>
      <button type="submit" className="gh-btn gh-btn-primary" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
      {message ? (
        <p
          className={
            isError
              ? "rounded-[var(--radius-card-sm)] border px-3 py-2 text-sm gh-status-error"
              : "rounded-[var(--radius-card-sm)] border px-3 py-2 text-sm gh-status-success"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
