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
 *   - Patient data (name/CPF/DOB/address) does NOT come from the token —
 *     without an explicit call the widget shows only the patient's name
 *     (Memed's own recent-patient lookup?) with everything else blank,
 *     forcing the doctor to retype it. Fix: `await MdHub.command.send(
 *     'plataforma.prescricao', 'setPaciente', {...})`, called BEFORE
 *     `module.show` (doc.memed.com.br/docs/frontend/comandos-mdhub/set-patient).
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
 * `core:moduleInit` and the script tag itself only fire/load ONCE per page —
 * `next/script` dedupes by `id` and won't call `onLoad` again on a second
 * mount, and Memed's own module only initializes once. The ORIGINAL version
 * of this component redid the whole fetch-session → render-Script →
 * await-onLoad → register-moduleInit-listener sequence on every click,
 * which worked exactly once: the second click re-triggered a script load
 * that had already happened, so `onLoad` never fired again and the button
 * spun forever. Fixed by splitting "load & initialize the widget" (once,
 * guarded by `widgetReady`) from "open it for one more prescription" (every
 * click, via `pendingRef` swapped out per attempt against a SINGLE
 * long-lived `prescricaoImpressa` listener registered during init).
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
  command: { send: (moduleName: string, command: string, payload: unknown) => Promise<void> };
};
type MdSinapsePrescricaoGlobal = {
  event: { add: (name: "core:moduleInit", cb: (moduleData: { name: string }) => void) => void };
};

type PrescricaoImpressaPayload = {
  prescriptionUuid?: string;
  documents?: Array<{ uuid: string; file_name?: string; type?: string }>;
};

export type MemedPatient = {
  idExterno: string;
  nome: string;
  cpf?: string;
  passaporte?: string;
  dataNascimento?: string;
  endereco?: string;
  cidade?: string;
};

function memedGlobals() {
  return window as unknown as {
    MdSinapsePrescricao?: MdSinapsePrescricaoGlobal;
    MdHub?: MdHubGlobal;
  };
}

async function sendPatientToWidget(patient: MemedPatient): Promise<void> {
  const win = memedGlobals();
  try {
    await win.MdHub?.command.send("plataforma.prescricao", "setPaciente", {
      idExterno: patient.idExterno,
      nome: patient.nome,
      ...(patient.cpf ? { cpf: patient.cpf } : {}),
      ...(patient.passaporte ? { passaporte: patient.passaporte } : {}),
      ...(patient.dataNascimento ? { data_nascimento: patient.dataNascimento } : {}),
      ...(patient.endereco ? { endereco: patient.endereco } : {}),
      ...(patient.cidade ? { cidade: patient.cidade } : {}),
    });
  } catch {
    // Best-effort — a failed pre-fill shouldn't block the doctor from
    // opening the module and typing the patient in by hand.
  }
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
  /** True once the script has loaded AND the persistent prescricaoImpressa
   *  listener is attached — both one-time-only setup steps. */
  const widgetReady = useRef(false);
  /** Swapped out for each open-the-widget attempt; the one long-lived
   *  prescricaoImpressa listener (attached once, in initWidget) resolves
   *  whichever pending promise is current when the doctor finishes. */
  const pendingRef = useRef<{ resolve: (v: { prescricaoId: string; documentId: string }) => void; reject: (err: Error) => void } | null>(null);

  /** One-time setup: wait for the module system, attach the single
   *  long-lived finish-event listener. Never runs twice. */
  const initWidget = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      const win = memedGlobals();
      if (!win.MdSinapsePrescricao) {
        reject(new Error("Memed widget did not load correctly"));
        return;
      }
      win.MdSinapsePrescricao.event.add("core:moduleInit", (moduleData) => {
        if (moduleData.name !== "plataforma.prescricao") return;
        win.MdHub?.event.add("prescricaoImpressa", (payload) => {
          const data = payload as PrescricaoImpressaPayload;
          const prescricaoId = data.prescriptionUuid;
          const documentId = data.documents?.[0]?.uuid;
          const pending = pendingRef.current;
          pendingRef.current = null;
          if (!prescricaoId || !documentId) {
            pending?.reject(new Error("Memed finished the prescription but returned no document id"));
            return;
          }
          pending?.resolve({ prescricaoId, documentId });
        });
        widgetReady.current = true;
        resolve();
      });
    });
  }, []);

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
        data?: { token?: string; scriptUrl?: string | null; patient?: MemedPatient };
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
      if (!json.data.patient) {
        setStatus("error");
        setMessage("Memed session started but carried no patient data");
        return;
      }
      const patient = json.data.patient;

      if (!widgetReady.current) {
        setStatus("loading-widget");
        await new Promise<void>((resolve, reject) => {
          scriptLoad.current = { resolve, reject };
          // Triggers the <Script> below to render/load — its onLoad/onError
          // call back into this promise. Only happens once: the script tag
          // stays mounted (and next/script dedupes by id) for every
          // subsequent open.
          setSession({ token: json.data!.token!, scriptUrl: json.data!.scriptUrl! });
        });
        await initWidget();
      }

      setStatus("open");
      const finished = new Promise<{ prescricaoId: string; documentId: string }>((resolve, reject) => {
        pendingRef.current = { resolve, reject };
      });
      await sendPatientToWidget(patient);
      memedGlobals().MdHub?.module.show("plataforma.prescricao");
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
  }, [appointmentId, docType, onIssued, initWidget]);

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
