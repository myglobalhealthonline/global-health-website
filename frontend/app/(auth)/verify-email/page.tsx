"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";

type Status = "pending" | "verifying" | "ok" | "error";

function readClientLocale(): LocaleCode {
  try {
    const match = document.cookie.match(/(?:^|;\s*)gh_locale=([^;]+)/);
    const raw = match ? decodeURIComponent(match[1]) : "";
    return resolveLocale({ cookieLocale: raw });
  } catch {
    return "en";
  }
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "pending");
  const [message, setMessage] = useState<string>("");
  const [locale, setLocale] = useState<LocaleCode>("en");
  const ranRef = useRef(false);

  useEffect(() => {
    setLocale(readClientLocale());
  }, []);

  useEffect(() => {
    if (!token || ranRef.current) return;
    ranRef.current = true;
    async function verify() {
      // Read locale directly at call time — avoids a stale closure on the
      // `locale` state which is "en" at mount and updates asynchronously.
      const currentLocale = readClientLocale();
      try {
        // Same-origin proxy at /api/auth/verify-email — going direct
        // to `${apiBase}/...` would 1) require CORS preflight, 2) not
        // attach the session cookie on Railway subdomains. Stick to
        // the proxy so this works on every deploy.
        const res = await fetch(`/api/auth/verify-email`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        const t = loadLocaleBundle(currentLocale).auth.verifyEmail;
        if (res.ok && json.ok) {
          setStatus("ok");
          setMessage(json.message ?? t.verified);
        } else {
          setStatus("error");
          setMessage(json.message ?? t.failed);
        }
      } catch (err) {
        const t = loadLocaleBundle(currentLocale).auth.verifyEmail;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : t.failed);
      }
    }
    void verify();
  }, [token]);

  const t = loadLocaleBundle(locale).auth.verifyEmail;

  return (
    <div className="min-h-screen bg-[var(--color-background-soft)] px-4 py-16">
      <div className="gh-admin-card mx-auto max-w-md rounded-2xl border border-[var(--color-border)] p-8 shadow-sm">
        {status === "pending" ? (
          <>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t.title}</h1>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">{t.body}</p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {t.goToSignIn}
            </Link>
          </>
        ) : null}

        {status === "verifying" ? (
          <div className="flex items-center gap-3">
            <Loader2 aria-hidden className="size-5 animate-spin text-emerald-700" />
            <p className="text-sm text-[var(--color-text-body)]">{t.verifying}</p>
          </div>
        ) : null}

        {status === "ok" ? (
          <>
            <CheckCircle2 aria-hidden className="size-10 text-emerald-700" />
            <h1 className="mt-4 text-2xl font-bold text-[var(--color-text-primary)]">{t.verified}</h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{message}</p>
            <Link
              href="/account"
              className="mt-6 inline-flex rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {t.goToAccount}
            </Link>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <XCircle aria-hidden className="size-10 text-rose-600" />
            <h1 className="mt-4 text-2xl font-bold text-[var(--color-text-primary)]">{t.failed}</h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{message}</p>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">{t.failedBody}</p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {t.goToSignIn}
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
