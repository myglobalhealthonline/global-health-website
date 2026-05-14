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
      // Success path triggers a redirect inside the action; no follow-up here.
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-1.5">
        <label htmlFor="login-email" className="text-xs font-semibold text-[#2D3B36]">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="h-12 rounded-md border border-[#D8E0D8] px-3 text-base outline-none transition focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/15"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="login-password" className="text-xs font-semibold text-[#2D3B36]">
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
            className="h-12 w-full rounded-md border border-[#D8E0D8] pl-3 pr-11 text-base outline-none transition focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/15"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6B64] hover:text-[#0F2E25]"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 items-center justify-center rounded-full bg-[#1B4D3E] px-7 text-sm font-bold text-white transition hover:-translate-y-px hover:bg-[#143B30] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#991B1B]"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
