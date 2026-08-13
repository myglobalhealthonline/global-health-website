"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Stamp } from "lucide-react";
import { doctorApiErrorMessage, parseDoctorApiJson } from "@/lib/doctor-api-client";

/**
 * BR-only entry point: launches Memed's e-prescription widget so the doctor
 * signs the prescription/certificate/exam request inside Memed's own UI
 * (that in-widget confirmation is the actual legal signature — nothing on
 * our side signs anything). On success we record the returned document
 * reference via /memed-document, which mirrors the signed PDF into our
 * storage so it shows up in the normal documents list.
 *
 * We have no Memed credentials yet, so `/memed-session` 503s until the
 * backend is configured — this panel then shows a quiet "not connected"
 * notice and the doctor keeps using the existing DOCX flow in the other
 * tabs. Nothing here blocks that fallback.
 *
 * The widget's own JS API (script global name, init call, the event that
 * fires with the finished document) is NOT yet confirmed against Memed's
 * real docs — see doc.memed.com.br/docs/backend-api once credentials
 * arrive. `bootMemedWidget` below is the one place that needs updating;
 * everything else (session mint, script load, document recording) is real.
 */

type MemedDocType = "PRESCRIPTION" | "ABSENCE_CERTIFICATE" | "CUSTOM_CERTIFICATE" | "EXAMS_PRESCRIPTION";

type Status = "idle" | "starting" | "loading-widget" | "open" | "not-configured" | "error";

let memedScriptPromise: Promise<void> | null = null;

function loadMemedScript(scriptUrl: string): Promise<void> {
  if (memedScriptPromise) return memedScriptPromise;
  const promise: Promise<void> = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Memed widget script"));
    document.body.appendChild(script);
  }).catch((err: unknown) => {
    memedScriptPromise = null;
    throw err;
  });
  memedScriptPromise = promise;
  return promise;
}

/**
 * TODO(confirm against Memed docs): boots the widget into `container` using
 * `token`, and resolves with the issued document's id + PDF URL once the
 * doctor finishes signing inside Memed's UI. Placeholder shape below is our
 * best read of Memed's publicly-described partner integration, not verified
 * against real credentials.
 */
function bootMemedWidget(
  token: string,
  container: HTMLDivElement,
): Promise<{ documentId: string; url: string }> {
  return new Promise((resolve, reject) => {
    const win = window as unknown as {
      MdSinapsePrescricao?: {
        init: (opts: {
          token: string;
          container: HTMLDivElement;
          onDocumentoCriado?: (doc: { id: string; url: string }) => void;
          onError?: (err: unknown) => void;
        }) => void;
      };
    };
    if (!win.MdSinapsePrescricao) {
      reject(new Error("Memed widget did not load correctly"));
      return;
    }
    win.MdSinapsePrescricao.init({
      token,
      container,
      onDocumentoCriado: (doc) => resolve({ documentId: doc.id, url: doc.url }),
      onError: (err) => reject(err instanceof Error ? err : new Error("Memed widget error")),
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
  const containerRef = useRef<HTMLDivElement | null>(null);

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
      await loadMemedScript(json.data.scriptUrl);
      if (!containerRef.current) throw new Error("Widget container not ready");

      setStatus("open");
      const issued = await bootMemedWidget(json.data.token, containerRef.current);

      const recordRes = await fetch(`/api/doctor/appointments/${appointmentId}/memed-document`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: docType,
          memedDocumentId: issued.documentId,
          memedUrl: issued.url,
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
    </div>
  );
}
