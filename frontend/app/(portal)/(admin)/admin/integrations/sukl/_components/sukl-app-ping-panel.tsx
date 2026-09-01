"use client";

import { useState } from "react";

import { Btn, Pill } from "../../../_components/atoms";
import type { SuklAppInfoDto, SuklAppPingDto } from "@/lib/admin/admin-api/sukl";

/**
 * Calls SÚKL's `AppPing` — the first real SOAP operation.
 *
 * Read-only, but SÚKL rate limit calls per user per minute and temporarily
 * block access on excess, so this is a manual button and the copy says so. Do
 * not attach it to anything automatic.
 *
 * A pass proves everything except business payloads: mutual TLS, the envelope,
 * the message header, the accessing identity, and fault handling.
 */

const SERVICES = [
  { value: "cuep", label: "ePoukaz (CUEP)" },
  { value: "common", label: "Common" },
];

/**
 * Only "/" remains. Tested 2026-08-13: every path derived from the internal
 * soap:address returned 404, while "/" returned 401 — 404 means absent, 401
 * means present and refusing us. Keeping the disproven options would invite
 * someone to re-run a settled question against a rate-limited service.
 */
const PATHS = ["/"];

export function SuklAppPingPanel({ callable }: { callable: boolean }) {
  const [service, setService] = useState("common");
  const [path, setPath] = useState("/");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuklAppPingDto | null>(null);
  const [info, setInfo] = useState<SuklAppInfoDto | null>(null);

  async function runInfo() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/sukl/app-info?service=${service}`, { method: "POST" });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string; data?: SuklAppInfoDto }
        | null;
      if (!res.ok || !json?.ok || !json.data) {
        setError(json?.message ?? "GetAppInfo could not be sent");
        return;
      }
      setInfo(json.data);
    } catch {
      setError("GetAppInfo could not be sent");
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    setInfo(null);
    try {
      const qs = new URLSearchParams({ service, path });
      const res = await fetch(`/api/admin/sukl/app-ping?${qs}`, { method: "POST" });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string; data?: SuklAppPingDto }
        | null;
      if (!res.ok || !json?.ok || !json.data) {
        setError(json?.message ?? "The ping could not be sent");
        return;
      }
      setResult(json.data);
    } catch {
      setError("The ping could not be sent");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="m-0 text-sm font-bold">Send a real request (AppPing)</h2>
          <p className="m-0 mt-1 text-xs" style={{ color: "var(--portal-muted)" }}>
            The first genuine SOAP call. Read-only — it creates nothing. A pass proves the
            envelope, the message header and the accessing identity are all accepted.
          </p>
          <p className="m-0 mt-1 text-xs" style={{ color: "var(--portal-warning-text)" }}>
            SÚKL limit calls per minute and temporarily block access if exceeded. Press it
            deliberately, not repeatedly.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <select
            className="gh-input"
            value={service}
            onChange={(e) => setService(e.target.value)}
          >
            {SERVICES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select className="gh-input" value={path} onChange={(e) => setPath(e.target.value)}>
            {PATHS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <Btn onClick={run} disabled={busy || !callable} variant="primary" size="sm">
            {busy ? "Sending…" : "Send AppPing"}
          </Btn>
          <Btn onClick={runInfo} disabled={busy || !callable} variant="secondary" size="sm">
            {busy ? "…" : "GetAppInfo"}
          </Btn>
        </div>
      </div>

      {!callable ? (
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          Not ready to call SÚKL. Every operation — including this ping — carries the accessing
          identity and the interface version, so <code>SUKL_TEST_UZIVATEL</code> and{" "}
          <code>SUKL_INTERFACE_VERSION</code> must be set on the backend service in addition to
          the certificate and service URL.
        </p>
      ) : null}

      {error ? (
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{error}</p>
      ) : null}

      {info ? (
        <div
          className="mb-3 rounded-md border px-4 py-3 text-sm"
          style={{ borderColor: "var(--portal-line)" }}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Pill tone={info.ok ? "active" : "inactive"} withDot>
              {info.ok ? "GetAppInfo" : `Rejected — ${info.errorCode}`}
            </Pill>
            <span className="text-xs" style={{ color: "var(--portal-muted)" }}>
              {info.label} · HTTP {info.httpStatus} · {info.durationMs} ms
            </span>
          </div>
          {info.ok ? (
            <>
              <p className="m-0 text-sm">
                SÚKL report interface version <strong>{info.version ?? "—"}</strong>
                {info.name ? ` · ${info.name}` : ""}
              </p>
              <p className="m-0 mt-1 text-xs" style={{ color: "var(--portal-muted)" }}>
                Compare this with <code>SUKL_INTERFACE_VERSION</code>. Ours was inferred from a
                published table; this is SÚKL&rsquo;s own answer, so it wins.
                {info.serverTime ? ` Server time: ${info.serverTime}.` : ""}
                {info.documentTypes.length > 0
                  ? ` Document types: ${info.documentTypes.join(", ")}.`
                  : ""}
              </p>
            </>
          ) : (
            <p className="m-0 whitespace-pre-wrap break-words text-sm">{info.errorMessage}</p>
          )}
        </div>
      ) : null}

      {result ? (
        <div
          className="rounded-md border px-4 py-3 text-sm"
          style={{ borderColor: "var(--portal-line)" }}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Pill tone={result.ok ? "active" : "inactive"} withDot>
              {result.ok ? "SÚKL accepted the request" : "Rejected"}
            </Pill>
            <span className="text-xs" style={{ color: "var(--portal-muted)" }}>
              {result.label} · HTTP {result.httpStatus} · {result.durationMs} ms · interface{" "}
              {result.interfaceVersion} · path <code>{result.path}</code>
            </span>
          </div>

          <p className="m-0 text-xs" style={{ color: "var(--portal-muted)" }}>
            Request id <code>{result.requestId}</code>
            {result.responseMessageId ? (
              <>
                {" "}
                · SÚKL message id <code>{result.responseMessageId}</code>
              </>
            ) : null}
          </p>

          {result.errorCode ? (
            <div className="mt-2">
              <p className="m-0 text-sm">
                <strong>{result.errorCode}</strong>
              </p>
              {result.errorMessage ? (
                // Wrapped rather than inline: SÚKL's fault strings are long and
                // the useful part (which element it objected to) is at the END,
                // so a single truncated line hides exactly what is needed.
                <p
                  className="m-0 mt-1 whitespace-pre-wrap break-words text-sm"
                  style={{ color: "var(--portal-text-2)" }}
                >
                  {result.errorMessage}
                </p>
              ) : null}
            </div>
          ) : null}

          {result.responseHeaders && Object.keys(result.responseHeaders).length > 0 ? (
            <div className="mt-3">
              <p
                className="m-0 mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--portal-muted)" }}
              >
                Response headers
              </p>
              <ul className="m-0 list-none p-0 text-xs">
                {Object.entries(result.responseHeaders).map(([k, v]) => (
                  <li key={k}>
                    <code>{k}</code>: {v}
                  </li>
                ))}
              </ul>
              {result.responseHeaders["www-authenticate"] ? (
                <p className="m-0 mt-1 text-xs" style={{ color: "var(--portal-warning-text)" }}>
                  SÚKL is ASKING for a credential scheme, not rejecting the certificate. Set{" "}
                  <code>SUKL_TEST_PASSWORD</code> (the test-access account password, paired with
                  the login name) and try again.
                </p>
              ) : null}
            </div>
          ) : null}

          {result.bodyExcerpt ? (
            <div className="mt-3">
              <p
                className="m-0 mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--portal-muted)" }}
              >
                What SÚKL actually returned
              </p>
              <pre
                className="m-0 overflow-auto rounded-md p-3 text-xs"
                style={{ background: "var(--portal-well)", maxHeight: 220 }}
              >
                {result.bodyExcerpt}
              </pre>
              <p className="m-0 mt-1 text-xs" style={{ color: "var(--portal-muted)" }}>
                Truncated. SÚKL require an HTTP Authorization header in addition to the client
                certificate — if their text mentions <code>Authorization header</code> or fault{" "}
                <code>S019</code>, set <code>SUKL_TEST_PASSWORD</code> to the test-access account
                password and try again. The path is not the problem: <code>/</code> is confirmed
                by their own <code>faultactor</code>.
              </p>
            </div>
          ) : null}

          {result.ok ? (
            <p className="mt-2 mb-0 text-xs" style={{ color: "var(--portal-muted)" }}>
              Mutual TLS, the SOAP envelope, the message header and our identity are all working.
              Issuing a voucher additionally needs the IČP and, possibly, a qualified signature.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
