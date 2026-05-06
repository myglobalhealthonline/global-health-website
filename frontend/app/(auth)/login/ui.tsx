"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { loginUser } from "@/lib/api/auth-api";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function getNextPath(role: "PATIENT" | "ADMIN") {
    const next = searchParams.get("next");
    if (!next || !next.startsWith("/")) {
      return role === "ADMIN" ? "/admin" : "/account";
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
      setMessage(`Logged in as ${result.data.user.fullName}. Redirecting...`);
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
    <form onSubmit={onSubmit} className="mt-7 grid gap-5">
      <div className="grid gap-2">
        <label htmlFor="login-email" className="gh-field-label">
          Email address
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          className="gh-input"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="gh-field-label">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs font-semibold text-[var(--color-brand-primary)] hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="gh-input pr-12"
            placeholder="Your password"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>

      <button type="submit" className="gh-btn gh-btn-primary mt-1" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
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
