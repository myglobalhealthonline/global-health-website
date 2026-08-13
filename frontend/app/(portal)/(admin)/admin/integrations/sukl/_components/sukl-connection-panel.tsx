"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Btn, Pill } from "../../../_components/atoms";
import type { SuklConnectionTestDto } from "@/lib/admin/admin-api/sukl";

/**
 * Runs the SÚKL connection test and shows exactly what it proved.
 *
 * The wording matters: stage 2 opens a mutual-TLS connection and nothing more.
 * No official read-only SÚKL operation is documented to us, so a green result
 * must not be read as "ePoukaz works" — the panel says so explicitly.
 */
export function SuklConnectionPanel({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SuklConnectionTestDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sukl/test-connection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string; data?: SuklConnectionTestDto }
        | null;
      if (!res.ok || !json?.ok || !json.data) {
        setError(json?.message ?? "The connection test could not be run");
        return;
      }
      setResult(json.data);
      // Refresh the server component so the persisted status cards catch up.
      router.refresh();
    } catch {
      setError("The connection test could not be run");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-sm font-bold">Connection test</h2>
          <p className="m-0 mt-1 text-xs" style={{ color: "var(--portal-muted)" }}>
            Validates the certificate, then opens a mutual-TLS connection to SÚKL. It never sends
            a prescription and never creates anything.
          </p>
        </div>
        <Btn onClick={run} disabled={busy || !configured} variant="primary" size="sm">
          {busy ? "Testing…" : "Test connection"}
        </Btn>
      </div>

      {!configured ? (
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          The SÚKL environment variables are not set on this backend, so no test can run. Configure{" "}
          <code>SUKL_ENVIRONMENT</code>, a certificate source, <code>SUKL_TEST_PFX_PASSWORD</code>,{" "}
          <code>SUKL_TEST_WORKPLACE_CODE</code> and <code>SUKL_TEST_ENTITY_ICO</code> on the backend
          service only.
        </p>
      ) : null}

      {error ? (
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{error}</p>
      ) : null}

      {result ? (
        <div className="rounded-md border px-4 py-3 text-sm" style={{ borderColor: "var(--portal-line)" }}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Pill tone={result.ok ? "active" : "pending"} withDot>
              {result.ok ? "Handshake succeeded" : `Stopped at: ${result.stage}`}
            </Pill>
            <span className="text-xs" style={{ color: "var(--portal-muted)" }}>
              {result.durationMs} ms
            </span>
          </div>

          <ul className="m-0 list-none space-y-1 p-0">
            <li>
              <strong>Certificate:</strong>{" "}
              {result.certificate.valid ? "valid" : "could not be validated"}
              {result.certificate.hasPrivateKey ? " · private key present" : ""}
              {result.certificate.fingerprintSuffix
                ? ` · …${result.certificate.fingerprintSuffix}`
                : ""}
              {result.certificate.daysUntilExpiry !== null
                ? ` · ${result.certificate.daysUntilExpiry} days left`
                : ""}
            </li>
            {result.handshakes.map((h) => (
              <li key={h.service}>
                <strong>{h.label}:</strong>{" "}
                {!h.attempted
                  ? "not configured"
                  : h.ok
                    ? `mutual TLS ok in ${h.durationMs} ms`
                    : `failed — ${h.errorCode}`}
                {h.peerIssuer ? ` · peer issuer ${h.peerIssuer}` : ""}
                {!h.ok && h.attempted && h.errorMessage ? (
                  <span className="block text-xs" style={{ color: "var(--portal-text-2)" }}>
                    {h.errorMessage}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          {result.errorCode ? (
            <p className="mt-2 mb-0 text-xs" style={{ color: "var(--portal-text-2)" }}>
              <strong>{result.errorCode}</strong> — {result.errorMessage}
            </p>
          ) : null}

          {result.ok ? (
            <p className="mt-2 mb-0 text-xs" style={{ color: "var(--portal-muted)" }}>
              This proves the TLS channel only. No request was sent — operation paths must come
              from the ePoukaz v19 WSDL first, and this does not prove any ePoukaz operation is
              permitted for this workplace.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
