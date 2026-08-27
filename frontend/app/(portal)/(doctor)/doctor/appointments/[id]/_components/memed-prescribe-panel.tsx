"use client";

import { useCallback, useRef, useState } from "react";
import Script from "next/script";
import { Loader2, Stamp } from "lucide-react";
import { doctorApiErrorMessage, parseDoctorApiJson } from "@/lib/doctor-api-client";

/**
 * BR-only entry point: launches Memed's e-prescription widget so the doctor
 * signs the prescription/certificate/exam request inside Memed's own UI
 * (that in-widget confirmation is the actual legal signature — nothing on
 * our side signs anything). On success we record the returned document
 * reference via /memed-document, which fetches the signed PDF server-side
 * and mirrors it into our storage so it shows up in the normal documents
 * list.
 *
 * Script/event contract confirmed against Memed's real docs
 * (doc.memed.com.br/docs/frontend, /docs/frontend/eventos-mdhub) as of
 * 2026-08-27:
 *   - The widget script is loaded with a `data-token` ATTRIBUTE on the
 *     `<script>` tag itself — not passed via a JS init call.
 *   - Finish event: `MdSinapsePrescricao.event.add('core:moduleInit', cb)`
 *     fires once per module; inside it, once `moduleData.name ===
 *     'plataforma.prescricao'`, `MdHub.event.add('prescricaoImpressa', cb)`
 *     fires with `{ prescriptionUuid, documents: [{ uuid, file_name, ... }] }`
 *     — no direct PDF URL, fetched separately server-side.
 *
 * The doctor portal runs a nonce/'strict-dynamic' CSP (proxy.ts nonceCsp).
 * A plain `document.createElement('script')` injected after page load is
 * NOT trusted just by host under 'strict-dynamic' (tried that first — it
 * failed silently as "Failed to load Memed widget script", CSP-blocked).
 * `next/script`'s <Script> component is Next's own supported path: Next
 * detects the nonce from the CSP header it already emits for its own
 * bundle and applies it to any <Script> it renders, so this one is trusted
 * the same way Next's own hydration scripts are — no manual nonce-copying.
 *
 * Still unconfirmed (flagged, not guessed): exactly how the widget binds to
 * a container element on the page — Memed's "Modos de carregamento do
 * script" / "Modos de exibição" doc pages weren't pulled. The `<div>` below
 * is a placeholder mount point; if the widget instead renders itself
 * fixed/floating regardless of a container, this div can be dropped.
 */

type MemedDocType = "PRESCRIPTION" | "ABSENCE_CERTIFICATE" | "CUSTOM_CERTIFICATE" | "EXAMS_PRESCRIPTION";

type Status = "idle" | "starting" | "loading-widget" | "open" | "not-configured" | "error";

type MdHubGlobal = {
  event: { add: (name: string, cb: (payload: unknown) => void) => void };
  module: { show: (name: string) => void };
};
type MdSinapsePrescricaoGlobal = {
  event: { add: (name: "core:moduleInit", cb: (moduleData: { name: string }) => void) => void };
};

type PrescricaoImpressaPayload = {
  prescriptionUuid?: string;
  documents?: Array<{ uuid: string; file_name?: string; type?: string }>;
};

/** Resolves with the first document from the finished prescription. */
function waitForPrescricaoImpressa(): Promise<{ prescricaoId: string; documentId: string }> {
  return new Promise((resolve, reject) => {
    const win = window as unknown as {
      MdSinapsePrescricao?: MdSinapsePrescricaoGlobal;
      MdHub?: MdHubGlobal;
    };
    if (!win.MdSinapsePrescricao) {
      reject(new Error("Memed widget did not load correctly"));
      return;
    }
    win.MdSinapsePrescricao.event.add("core:moduleInit", (moduleData) => {
      if (moduleData.name !== "plataforma.prescricao") return;
      // Per Memed's own troubleshooting doc ("O módulo da Memed não
      // carrega"): the module loads inert and must be explicitly told to
      // display — without this the script runs with no visible UI, no
      // console error, and no move toward prescricaoImpressa either.
      win.MdHub?.module.show("plataforma.prescricao");
      win.MdHub?.event.add("prescricaoImpressa", (payload) => {
        const data = payload as PrescricaoImpressaPayload;
        const prescricaoId = data.prescriptionUuid;
        const documentId = data.documents?.[0]?.uuid;
        if (!prescricaoId || !documentId) {
          reject(new Error("Memed finished the prescription but returned no document id"));
          return;
        }
        resolve({ prescricaoId, documentId });
      });
    });
  });
}

export function MemedPrescribePanel({
  appointmentId,
  countryCode,
  onIssued,
}: {
  appointmentId: string;
  countryCode: string;
  onIssued?: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [docType, setDocType] = useState<MemedDocType>("PRESCRIPTION");
  const [session, setSession] = useState<{ token: string; scriptUrl: string } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scriptLoad = useRef<{ resolve: () => void; reject: (err: Error) => void } | null>(null);

  const start = useCallback(async () => {
    setStatus("starting");
    setMessage(null);
    try {
      const res = await fetch(`/api/doctor/appointments/${appointmentId}/memed-session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const json = await parseDoctorApiJson<{
        ok?: boolean;
        message?: string;
        data?: { token?: string; scriptUrl?: string | null };
      }>(res);
      if (res.status === 503) {
        setStatus("not-configured");
        return;
      }
      if (!res.ok || !json?.ok || !json.data?.token) {
        setStatus("error");
        setMessage(doctorApiErrorMessage(res, json, "Could not start Memed session"));
        return;
      }
      if (!json.data.scriptUrl) {
        setStatus("error");
        setMessage("Memed widget script URL is not configured");
        return;
      }

      setStatus("loading-widget");
      const finished = waitForPrescricaoImpressa();

      await new Promise<void>((resolve, reject) => {
        scriptLoad.current = { resolve, reject };
        // Triggers the <Script> below to render/load — its onLoad/onError
        // call back into this promise.
        setSession({ token: json.data!.token!, scriptUrl: json.data!.scriptUrl! });
      });

      setStatus("open");
      const issued = await finished;

      const recordRes = await fetch(`/api/doctor/appointments/${appointmentId}/memed-document`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: docType,
          prescricaoId: issued.prescricaoId,
          documentId: issued.documentId,
        }),
      });
      const recordJson = await parseDoctorApiJson<{ ok?: boolean; message?: string }>(recordRes);
      if (!recordRes.ok || !recordJson?.ok) {
        setStatus("error");
        setMessage(doctorApiErrorMessage(recordRes, recordJson, "Document signed but could not be recorded"));
        return;
      }

      setStatus("idle");
      setMessage("Document signed and saved.");
      onIssued?.();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Memed widget failed");
    }
  }, [appointmentId, docType, onIssued]);

  if (countryCode.toLowerCase() !== "br") return null;

  return (
    <div className="mb-4 space-y-2 rounded-md border border-[var(--portal-line)] bg-[var(--portal-surface-2)] p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Stamp className="size-4" aria-hidden />
        Prescrever via Memed
      </div>
      <p className="text-xs text-[var(--portal-muted)]">
        Assine digitalmente prescrições, atestados e pedidos de exame pelo Memed.
      </p>

      {status === "not-configured" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Memed ainda não está conectado — use as abas acima enquanto isso.
        </p>
      ) : (
        <>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as MemedDocType)}
            disabled={status === "starting" || status === "loading-widget" || status === "open"}
            className="gh-input w-full text-sm sm:w-auto"
          >
            <option value="PRESCRIPTION">Receita médica</option>
            <option value="ABSENCE_CERTIFICATE">Atestado de afastamento</option>
            <option value="CUSTOM_CERTIFICATE">Atestado / certificado</option>
            <option value="EXAMS_PRESCRIPTION">Pedido de exames</option>
          </select>
          <button
            type="button"
            onClick={start}
            disabled={status === "starting" || status === "loading-widget" || status === "open"}
            className="gh-btn gh-btn-soft text-sm"
          >
            {status === "starting" || status === "loading-widget" ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Stamp className="size-3.5" aria-hidden />
            )}
            Abrir Memed
          </button>
        </>
      )}

      {message ? <p className="text-xs text-[var(--portal-muted)]">{message}</p> : null}
      <div ref={containerRef} className={status === "open" ? "min-h-[480px]" : "hidden"} />
      {session ? (
        <Script
          id="memed-sinapse-prescricao-script"
          src={session.scriptUrl}
          data-token={session.token}
          strategy="afterInteractive"
          onLoad={() => scriptLoad.current?.resolve()}
          onError={() => scriptLoad.current?.reject(new Error("Failed to load Memed widget script"))}
        />
      ) : null}
    </div>
  );
}
