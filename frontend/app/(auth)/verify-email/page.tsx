"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Status = "pending" | "verifying" | "ok" | "error";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "pending");
  const [message, setMessage] = useState<string>("");
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  const ranRef = useRef(false);

  useEffect(() => {
    if (!token || ranRef.current) return;
    ranRef.current = true;
    async function verify() {
      try {
        const res = await fetch(`${apiBase}/api/auth/verify-email`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (res.ok && json.ok) {
          setStatus("ok");
          setMessage(json.message ?? "Email verified");
        } else {
          setStatus("error");
          setMessage(json.message ?? "Verification failed");
        }
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      }
    }
    void verify();
  }, [token, apiBase]);

  return (
    <div className="min-h-screen bg-[var(--color-background-soft)] px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {status === "pending" ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Verify your email</h1>
            <p className="mt-3 text-sm text-slate-600">
              Click the link in the email we sent you. If you didn&apos;t get it,
              check spam or sign in to request a new one.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Go to sign in
            </Link>
          </>
        ) : null}

        {status === "verifying" ? (
          <div className="flex items-center gap-3">
            <Loader2 aria-hidden className="size-5 animate-spin text-emerald-700" />
            <p className="text-sm text-slate-700">Verifying your email…</p>
          </div>
        ) : null}

        {status === "ok" ? (
          <>
            <CheckCircle2 aria-hidden className="size-10 text-emerald-700" />
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Email verified</h1>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
            <Link
              href="/account"
              className="mt-6 inline-flex rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Go to my account
            </Link>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <XCircle aria-hidden className="size-10 text-rose-600" />
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Verification failed</h1>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
            <p className="mt-3 text-sm text-slate-500">
              The link may be expired or already used. Sign in and request a new one.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Go to sign in
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
