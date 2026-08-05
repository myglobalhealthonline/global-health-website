"use client";

import { useState } from "react";

import { Btn, Pill } from "../../../_components/atoms";

/**
 * Reads a SÚKL service's WSDL through the backend.
 *
 * Only the deployed backend can reach SÚKL, so this is the one way to see the
 * document that unblocks the interface inventory. It performs a GET — nothing
 * is sent and nothing is created.
 *
 * The parsed summary is a convenience; the raw XML is shown underneath because
 * the summary comes from a regex reader, and anything that ends up in request
 * code must be taken from the source document. See lib/sukl/wsdl.ts.
 */

type WsdlResult = {
  service: string;
  label: string;
  requestedUrl: string;
  httpStatus: number;
  contentType: string | null;
  durationMs: number;
  summary: {
    looksLikeWsdl: boolean;
    targetNamespace: string | null;
    namespaces: Record<string, string>;
    services: string[];
    ports: Array<{ name: string | null; binding: string | null }>;
    addresses: string[];
    bindings: Array<{ name: string | null; transport: string | null }>;
    operations: string[];
    soapVersion: string;
    imports: string[];
    byteLength: number;
  };
  suggestedPaths: Array<{ address: string; path: string | null }>;
  raw: string;
};

const SERVICES = [
  { value: "cuep", label: "ePoukaz (CUEP)" },
  { value: "common", label: "Common" },
];

export function SuklWsdlPanel({ configured }: { configured: boolean }) {
  const [service, setService] = useState("cuep");
  const [path, setPath] = useState("/?wsdl");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WsdlResult | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    setShowRaw(false);
    try {
      const qs = new URLSearchParams({ service, path });
      const res = await fetch(`/api/admin/sukl/wsdl?${qs}`);
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string; data?: WsdlResult }
        | null;
      if (!res.ok || !json?.ok || !json.data) {
        setError(json?.message ?? "The WSDL could not be retrieved");
        return;
      }
      setResult(json.data);
    } catch {
      setError("The WSDL could not be retrieved");
    } finally {
      setBusy(false);
    }
  }

  const s = result?.summary;

  return (
    <div>
      <h2 className="m-0 mb-1 text-sm font-bold">Read the WSDL</h2>
      <p className="m-0 mb-3 text-xs" style={{ color: "var(--portal-muted)" }}>
        Fetches the service description over mutual TLS so the operation paths, namespaces and
        operation names can be filled into <code>docs/sukl/INTERFACE_INVENTORY.md</code>. A read
        only — no SOAP request is sent.
      </p>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span
            className="text-[10.5px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--portal-muted)" }}
          >
            Service
          </span>
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
        </label>
        <label className="flex flex-col gap-1">
          <span
            className="text-[10.5px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--portal-muted)" }}
          >
            Path
          </span>
          <input
            className="gh-input"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            style={{ minWidth: 260 }}
          />
        </label>
        <Btn onClick={run} disabled={busy || !configured} variant="primary" size="sm">
          {busy ? "Fetching…" : "Fetch WSDL"}
        </Btn>
      </div>

      {error ? (
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{error}</p>
      ) : null}

      {result && s ? (
        <div
          className="rounded-md border px-4 py-3 text-sm"
          style={{ borderColor: "var(--portal-line)" }}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Pill tone={s.looksLikeWsdl ? "active" : "pending"} withDot>
              {s.looksLikeWsdl ? "WSDL" : `HTTP ${result.httpStatus} — not a WSDL`}
            </Pill>
            <span className="text-xs" style={{ color: "var(--portal-muted)" }}>
              {result.durationMs} ms · {s.byteLength} bytes · {result.contentType ?? "no type"}
            </span>
          </div>

          <p className="m-0 mb-2 break-all text-xs" style={{ color: "var(--portal-muted)" }}>
            {result.requestedUrl}
          </p>

          {s.looksLikeWsdl ? (
            <dl className="grid gap-1 text-sm">
              <Line label="targetNamespace">{s.targetNamespace ?? "—"}</Line>
              <Line label="SOAP version">{s.soapVersion}</Line>
              <Line label="Services">{s.services.join(", ") || "—"}</Line>
              <Line label="Ports">
                {s.ports.map((p) => p.name).filter(Boolean).join(", ") || "—"}
              </Line>
              <Line label="soap:address">
                {s.addresses.length ? (
                  <ul className="m-0 list-none p-0">
                    {result.suggestedPaths.map((a) => (
                      <li key={a.address} className="break-all">
                        <code className="text-xs">{a.address}</code>
                        {a.path ? (
                          <>
                            {" "}
                            → path <code className="text-xs">{a.path}</code>
                          </>
                        ) : (
                          <> — different host, do not use without checking</>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )}
              </Line>
              <Line label={`Operations (${s.operations.length})`}>
                {s.operations.join(", ") || "—"}
              </Line>
              {s.imports.length ? (
                <Line label="Imports">
                  <span className="break-all">{s.imports.join(", ")}</span>
                </Line>
              ) : null}
            </dl>
          ) : null}

          <div className="mt-3">
            <Btn variant="secondary" size="sm" onClick={() => setShowRaw((v) => !v)}>
              {showRaw ? "Hide raw document" : "Show raw document"}
            </Btn>
            <span className="ml-2 text-xs" style={{ color: "var(--portal-muted)" }}>
              The summary is parsed with a regex reader — the raw document is the authority.
            </span>
          </div>

          {showRaw ? (
            <pre
              className="mt-2 overflow-auto rounded-md p-3 text-xs"
              style={{ background: "var(--portal-well)", maxHeight: 420 }}
            >
              {result.raw}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt
        className="text-[10.5px] font-bold uppercase tracking-[0.12em] sm:w-40 sm:shrink-0"
        style={{ color: "var(--portal-muted)" }}
      >
        {label}
      </dt>
      <dd className="m-0 min-w-0 break-words">{children}</dd>
    </div>
  );
}
