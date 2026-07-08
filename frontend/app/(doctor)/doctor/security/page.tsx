"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ShieldCheck, ShieldOff } from "lucide-react";
import {
  confirmTwoFactor,
  disableTwoFactor,
  fetchTwoFactorStatus,
  setupTwoFactor,
} from "@/lib/api/auth-api";
import { formatAppDate } from "@/lib/format-datetime";
import { PageHeader } from "@/components/portal-atoms";

type Msg = { kind: "ok" | "err"; text: string } | null;

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <span className="gh-field-label">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] px-3 py-2 text-xs text-[var(--portal-ink)]">
          {value}
        </code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--portal-line)] px-2.5 py-2 text-xs font-semibold text-[var(--portal-ink)] hover:bg-[var(--portal-well)]"
        >
          <Copy className="size-3.5" aria-hidden />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function DoctorSecurityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [enabledAt, setEnabledAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Setup flow state — populated by the setup endpoint, round-tripped to confirm.
  const [setup, setSetup] = useState<{ secret: string; qrUri: string; backupCodes: string[] } | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  // Disable flow state.
  const [disablePassword, setDisablePassword] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [disableMsg, setDisableMsg] = useState<Msg>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetchTwoFactorStatus();
      if (cancelled) return;
      if (res.ok) {
        setEnabled(res.data.twoFactorEnabled);
        setEnabledAt(res.data.twoFactorEnabledAt);
      } else {
        setLoadError(res.message);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onStartSetup() {
    setMsg(null);
    setSettingUp(true);
    const res = await setupTwoFactor();
    setSettingUp(false);
    if (res.ok) {
      setSetup(res.data);
    } else {
      setMsg({ kind: "err", text: res.message });
    }
  }

  async function onConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!setup) return;
    setMsg(null);
    setConfirming(true);
    const res = await confirmTwoFactor({
      token: code.trim(),
      secret: setup.secret,
      backupCodes: setup.backupCodes,
    });
    setConfirming(false);
    if (res.ok) {
      setEnabled(true);
      setEnabledAt(new Date().toISOString());
      setSetup(null);
      setCode("");
      setMsg({ kind: "ok", text: "Two-factor authentication is now enabled on your account." });
      // Refresh server components so the compliance banner drops the item.
      router.refresh();
    } else {
      setMsg({ kind: "err", text: res.message });
    }
  }

  async function onDisable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDisableMsg(null);
    setDisabling(true);
    const res = await disableTwoFactor({ currentPassword: disablePassword });
    setDisabling(false);
    if (res.ok) {
      setEnabled(false);
      setEnabledAt(null);
      setDisablePassword("");
      setDisableMsg({ kind: "ok", text: "Two-factor authentication has been disabled." });
      router.refresh();
    } else {
      setDisableMsg({ kind: "err", text: res.message });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-[var(--portal-primary)]" aria-hidden />
            Two-factor authentication
          </span>
        }
        description="Protect access to patient records with a time-based code from an authenticator app (Google Authenticator, Authy, 1Password, …)."
      />

      {loading ? (
        <div className="gh-card grid gap-4 p-6">
          <div className="h-4 w-40 animate-pulse rounded-full bg-[var(--portal-well)]" />
          <div className="h-24 animate-pulse rounded-[14px] bg-[var(--portal-well)]" />
          <span className="sr-only">Loading 2FA status…</span>
        </div>
      ) : loadError ? (
        <div className="gh-card p-6">
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{loadError}</p>
        </div>
      ) : enabled ? (
        <div className="gh-card p-6">
          <p className="flex items-start gap-2 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Two-factor authentication is enabled
              {enabledAt ? ` since ${formatAppDate(enabledAt)}` : ""}. You will be asked for a
              code from your authenticator app at each login.
            </span>
          </p>

          <form onSubmit={onDisable} className="mt-6 max-w-sm space-y-3">
            <h2 className="text-sm font-semibold text-[var(--portal-ink)]">Disable 2FA</h2>
            <p className="text-sm text-[var(--portal-muted)]">
              Confirm your account password to turn two-factor authentication off.
            </p>
            <label className="block">
              <span className="gh-field-label">Current password</span>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                required
                autoComplete="current-password"
                className="gh-input mt-1 min-w-0"
              />
            </label>
            {disableMsg ? (
              <p
                className={`rounded-md px-3 py-2 text-sm ${
                  disableMsg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                }`}
              >
                {disableMsg.text}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={disabling}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              <ShieldOff className="size-4" aria-hidden />
              {disabling ? "Disabling…" : "Disable 2FA"}
            </button>
          </form>
        </div>
      ) : setup ? (
        <div className="gh-card space-y-5 p-6">
          <div>
            <h2 className="text-sm font-semibold text-[var(--portal-ink)]">
              1. Add the account to your authenticator app
            </h2>
            <p className="mt-1 text-sm text-[var(--portal-muted)]">
              In your authenticator app choose “Enter a setup key” (or paste the otpauth link if
              your app supports it) and enter the secret below.
            </p>
            <div className="mt-3 space-y-3">
              <CopyableField label="Setup key (secret)" value={setup.secret} />
              <CopyableField label="otpauth link" value={setup.qrUri} />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[var(--portal-ink)]">
              2. Save your backup codes
            </h2>
            <p className="mt-1 text-sm text-[var(--portal-muted)]">
              Each code works once if you lose access to your authenticator app. Store them
              somewhere safe — they are shown only now.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-[var(--radius-card-sm)] border border-[var(--portal-line)] bg-[var(--portal-well)] p-4 sm:grid-cols-5">
              {setup.backupCodes.map((c) => (
                <code key={c} className="text-xs text-[var(--portal-ink)]">
                  {c}
                </code>
              ))}
            </div>
          </div>

          <form onSubmit={onConfirm} className="max-w-sm space-y-3">
            <h2 className="text-sm font-semibold text-[var(--portal-ink)]">
              3. Confirm with a code
            </h2>
            <label className="block">
              <span className="gh-field-label">6-digit code from your app</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                minLength={6}
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                autoComplete="one-time-code"
                className="gh-input mt-1 min-w-0 tracking-[0.3em]"
              />
            </label>
            {msg ? (
              <p
                className={`rounded-md px-3 py-2 text-sm ${
                  msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                }`}
              >
                {msg.text}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={confirming || code.length !== 6}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
            >
              {confirming ? "Verifying…" : "Enable 2FA"}
            </button>
          </form>
        </div>
      ) : (
        <div className="gh-card p-6">
          <p className="text-sm text-[var(--portal-muted)]">
            Two-factor authentication is not enabled yet. Enabling it adds a second check at
            login — a 6-digit code from an authenticator app on your phone — so a stolen
            password alone can’t reach patient records.
          </p>
          {msg ? (
            <p
              className={`mt-3 rounded-md px-3 py-2 text-sm ${
                msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
              }`}
            >
              {msg.text}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void onStartSetup()}
            disabled={settingUp}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
          >
            <ShieldCheck className="size-4" aria-hidden />
            {settingUp ? "Preparing…" : "Enable 2FA"}
          </button>
        </div>
      )}
    </>
  );
}
