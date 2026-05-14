"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signInAction } from "./actions";

export function LoginForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("next", next);
    setError(null);
    startTransition(async () => {
      const result = await signInAction(formData);
      if (result && result.ok === false) {
        setError(result.message);
      }
      // Success path triggers a server redirect inside the action.
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-1.5">
        <label htmlFor="login-email" className="gh-field-label">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="gh-input"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="login-password" className="gh-field-label">
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Your password"
            className="gh-input pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <button type="submit" disabled={isPending} className="gh-btn gh-btn-primary">
        {isPending ? "Signing in…" : "Sign in"}
      </button>

      {error ? (
        <p role="alert" className="gh-status-error rounded-md px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}
