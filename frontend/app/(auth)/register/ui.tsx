"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { registerUser } from "@/lib/api/auth-api";

export function RegisterFormFallback() {
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
      <div className="gh-btn gh-btn-primary mt-1 animate-pulse opacity-60">Create account</div>
    </form>
  );
}

export function RegisterForm() {
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
          Full name
        </label>
        <input
          id="register-name"
          name="fullName"
          type="text"
          className="gh-input"
          placeholder="Your full name"
          required
          autoComplete="name"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="register-email" className="gh-field-label">
          Email address
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          className="gh-input"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="register-phone" className="gh-field-label">
          Phone <span className="text-[var(--color-text-muted)]">(optional)</span>
        </label>
        <input
          id="register-phone"
          name="phone"
          type="tel"
          className="gh-input"
          placeholder="+353..."
          autoComplete="tel"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="register-password" className="gh-field-label">
          Password
        </label>
        <div className="relative">
          <input
            id="register-password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="gh-input pr-12"
            placeholder="At least 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
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
        <p className="text-xs text-[var(--color-text-muted)]">
          Use at least 8 characters with a mix of letters and numbers.
        </p>
      </div>

      <p className="text-sm text-[var(--color-text-muted)]">
        By creating an account, you agree to use this platform for patient booking and consultation management.
      </p>

      <button type="submit" className="gh-btn gh-btn-primary mt-1" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
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


