"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) {
      setMsg({ kind: "err", text: "Password must be at least 8 characters" });
      return;
    }
    if (password !== confirm) {
      setMsg({ kind: "err", text: "Passwords don’t match" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (res.ok && json.ok) {
        setMsg({ kind: "ok", text: json.message ?? "Password updated. You can sign in now." });
        setPassword("");
        setConfirm("");
      } else {
        setMsg({ kind: "err", text: json.message ?? "Reset failed" });
      }
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Reset failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background-soft)] px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pick a password at least 8 characters long.
        </p>

        {!token ? (
          <p className="mt-6 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
            This page needs a reset token. Open the link from the password-reset
            email.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="gh-field-label">New password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                className="gh-input mt-1 min-w-0"
                autoComplete="new-password"
              />
            </label>
            <label className="block">
              <span className="gh-field-label">Confirm password</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                className="gh-input mt-1 min-w-0"
                autoComplete="new-password"
              />
            </label>

            {msg ? (
              <p
                className={`rounded-md px-3 py-2 text-sm ${
                  msg.kind === "ok"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-rose-50 text-rose-800"
                }`}
              >
                {msg.text}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save new password"}
            </button>

            {msg?.kind === "ok" ? (
              <Link
                href="/login"
                className="ml-3 text-sm font-semibold text-emerald-700 hover:underline"
              >
                Go to sign in →
              </Link>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
