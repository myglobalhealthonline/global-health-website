"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { GH2AuthShell } from "@/components/sections/GH2PagePrimitives";

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
    <GH2AuthShell
      eyebrow="Email verification"
      title="Confirm your"
      accent="account."
      body="Verification keeps patient records and booking updates tied to the right email address."
    >
      <div aria-live="polite">
        {status === "pending" ? (
          <>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t.title}</h1>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">{t.body}</p>
            <Link
              href="/login"
              className="gh2-btn-lime mt-6"
            >
              {t.goToSignIn}
            </Link>
          </>
        ) : null}

        {status === "verifying" ? (
          <div className="flex items-center gap-3">
            <Loader2 aria-hidden className="size-5 animate-spin text-[var(--color-brand-primary)]" />
            <p className="text-sm text-[var(--color-text-body)]">{t.verifying}</p>
          </div>
        ) : null}

        {status === "ok" ? (
          <>
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-[var(--color-brand-accent)] text-[#0a1f14]">
              <CheckCircle2 aria-hidden className="size-8" />
            </span>
            <h1 className="mt-4 text-2xl font-bold text-[var(--color-text-primary)]">{t.verified}</h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{message}</p>
            <Link
              href="/account"
              className="gh2-btn-lime mt-6"
            >
              {t.goToAccount}
            </Link>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-[var(--color-background-panel)] text-[var(--color-brand-primary)]">
              <XCircle aria-hidden className="size-8" />
            </span>
            <h1 className="mt-4 text-2xl font-bold text-[var(--color-text-primary)]">{t.failed}</h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{message}</p>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">{t.failedBody}</p>
            <Link
              href="/login"
              className="gh2-btn-lime mt-6"
            >
              {t.goToSignIn}
            </Link>
          </>
        ) : null}
      </div>
    </GH2AuthShell>
  );
}
