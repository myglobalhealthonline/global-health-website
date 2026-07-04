"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { GH2AuthShell } from "@/components/sections/GH2PagePrimitives";

function readClientLocale(): LocaleCode {
  try {
    const match = document.cookie.match(/(?:^|;\s*)gh_locale=([^;]+)/);
    const raw = match ? decodeURIComponent(match[1]) : "";
    return resolveLocale({ cookieLocale: raw });
  } catch {
    return "en";
  }
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  // `?invite=1` flips the page into doctor-onboarding mode: copy
  // mentions "welcome / set" instead of "reset", and the backend mints
  // a session cookie on success so we can router.replace("/doctor").
  // Without the flag the existing forgot-password flow is preserved
  // unchanged.
  const isInvite = searchParams.get("invite") === "1";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    // Cookie is browser-only; reading it during SSR would mismatch hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocale(readClientLocale());
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const t = loadLocaleBundle(locale).auth.resetPassword;
    if (password.length < 8) {
      setMsg({ kind: "err", text: t.tooShort });
      return;
    }
    if (password !== confirm) {
      setMsg({ kind: "err", text: t.noMatch });
      return;
    }
    setBusy(true);
    try {
      // Same-origin proxy at /api/auth/reset-password — required for the
      // invite path so the backend's Set-Cookie lands on this host (the
      // proxy strips the upstream Domain= attribute).
      const res = await fetch(`/api/auth/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          ...(isInvite ? { invite: true } : {}),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (res.ok && json.ok) {
        if (isInvite) {
          setMsg({ kind: "ok", text: t.inviteSuccess });
          setPassword("");
          setConfirm("");
          router.replace("/doctor");
          router.refresh();
        } else {
          setMsg({ kind: "ok", text: json.message ?? t.resetSuccess });
          setPassword("");
          setConfirm("");
        }
      } else {
        setMsg({ kind: "err", text: json.message ?? t.resetFailed });
      }
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : t.resetFailed });
    } finally {
      setBusy(false);
    }
  }

  const t = loadLocaleBundle(locale).auth.resetPassword;
  const heading = isInvite ? t.inviteTitle : t.resetTitle;
  const subhead = isInvite ? t.inviteSubtitle : t.resetSubtitle;
  const submitLabel = isInvite ? t.inviteSubmit : t.resetSubmit;

  return (
    <GH2AuthShell
      eyebrow={isInvite ? "Clinician onboarding" : "Account recovery"}
      title={isInvite ? "Set access" : "Reset access"}
      accent="securely."
      body={subhead}
    >
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{heading}</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{subhead}</p>

        {!token ? (
          <p className="mt-6 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert" aria-live="polite">
            {t.noToken.replace("{kind}", isInvite ? t.inviteTokenKind : t.resetTokenKind)}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="gh-field-label" data-required>{t.newPasswordLabel}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
                minLength={8}
                maxLength={128}
                className="gh-input mt-1 min-w-0"
                autoComplete="new-password"
              />
            </label>
            <label className="block">
              <span className="gh-field-label" data-required>{t.confirmPasswordLabel}</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                aria-required="true"
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
                role={msg.kind === "err" ? "alert" : "status"}
                aria-live="polite"
              >
                {msg.text}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="gh2-btn-lime disabled:opacity-60"
            >
              {busy ? t.saving : submitLabel}
            </button>

            {msg?.kind === "ok" && !isInvite ? (
              <Link
                href="/login"
                className="ml-3 text-sm font-semibold text-emerald-700 hover:underline"
              >
                {t.goToSignIn}
              </Link>
            ) : null}
          </form>
        )}
    </GH2AuthShell>
  );
}
