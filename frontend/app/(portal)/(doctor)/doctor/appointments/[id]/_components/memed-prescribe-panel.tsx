"use client";

import { useCallback, useState } from "react";
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
 *     without an explicit call the widget shows only the patient's name,
 *     forcing the doctor to retype the rest. Fix: `await MdHub.command.send(
 *     'plataforma.prescricao', 'setPaciente', {...})`, called BEFORE
 *     `module.show` (doc.memed.com.br/docs/frontend/comandos-mdhub/set-patient).
 *
 * The doctor portal runs a nonce/'strict-dynamic' CSP (proxy.ts nonceCsp).
 * A plain `document.createElement('script')` injected after page load is
 * NOT trusted just by host under 'strict-dynamic' — `next/script`'s
 * <Script> is Next's own supported path: Next nonces any <Script> it
 * renders the same way it nonces its own bundle.
 *
 * "Load & initialize the widget" happens ONCE per page — the script tag
 * (next/script dedupes by id) and Memed's own `core:moduleInit` both only
 * fire the first time. That one-time state is kept in MODULE SCOPE
 * (`widgetState` below), not component state/refs: this component lives
 * inside a modal that can re-render or remount between opens (tab
 * switches, parent state changes), and a `useRef` reset on remount would
 * silently make every "already loaded" open look like a fresh first-time
 * load again — the button re-renders the <Script> tag, which next/script
 * treats as already-loaded and never fires `onLoad` again, so the promise
 * this component awaits never resolves and the button spins forever. That
 * exact bug shipped once already (refs instead of module state); module
 * scope survives remounts because it's tied to the JS module instance for
 * the page's lifetime, not to any one mount of this component.
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

type PendingResult = { resolve: (v: { prescricaoId: string; documentId: string }) => void; reject: (err: Error) => void };

/**
 * Module-scope, not component state — survives this component
 * remounting (see the file doc comment). `readyPromise` is set exactly
 * once, the first time anything calls `ensureWidgetLoaded`; every later
 * call (from any mount of this component) reuses the same promise
 * instead of re-triggering a script load that has already happened.
 */
const widgetState: {
  readyPromise: Promise<void> | null;
  scriptUrl: string | null;
  token: string | null;
  pending: PendingResult | null;
} = {
  readyPromise: null,
  scriptUrl: null,
  token: null,
  pending: null,
};

/** Runs once per page, however many times it's called from however many
 *  mounts: loads the script, waits for the module system, attaches the
 *  ONE long-lived finish-event listener. */
function ensureWidgetLoaded(token: string, scriptUrl: string): Promise<void> {
  if (widgetState.readyPromise) return widgetState.readyPromise;

  widgetState.token = token;
  widgetState.scriptUrl = scriptUrl;

  widgetState.readyPromise = new Promise<void>((resolveReady, rejectReady) => {
    const scriptId = "memed-sinapse-prescricao-script";
    const onScriptReady = () => {
      const win = memedGlobals();
      if (!win.MdSinapsePrescricao) {
        rejectReady(new Error("Memed widget did not load correctly"));
        return;
      }
      win.MdSinapsePrescricao.event.add("core:moduleInit", (moduleData) => {
        if (moduleData.name !== "plataforma.prescricao") return;
        win.MdHub?.event.add("prescricaoImpressa", (payload) => {
          const data = payload as PrescricaoImpressaPayload;
          const prescricaoId = data.prescriptionUuid;
          const documentId = data.documents?.[0]?.uuid;
          const pending = widgetState.pending;
          widgetState.pending = null;
          if (!prescricaoId || !documentId) {
            pending?.reject(new Error("Memed finished the prescription but returned no document id"));
            return;
          }
          pending?.resolve({ prescricaoId, documentId });
        });
        resolveReady();
      });
    };

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      // Script already in the DOM from an earlier mount of this
      // component (or a fast-refresh in dev) — don't render a second
      // <Script>, just proceed straight to module init.
      onScriptReady();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = scriptUrl;
    script.setAttribute("data-token", token);
    script.async = true;
    const nonceSource = document.querySelector<HTMLScriptElement>("script[nonce]");
    if (nonceSource?.nonce) script.nonce = nonceSource.nonce;
    script.onload = onScriptReady;
    script.onerror = () => rejectReady(new Error("Failed to load Memed widget script"));
    document.body.appendChild(script);
  }).catch((err: unknown) => {
    // A failed load must not wedge every future attempt — let the next
    // call retry from scratch.
    widgetState.readyPromise = null;
    throw err;
  });

  return widgetState.readyPromise;
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

      setStatus("loading-widget");
      await ensureWidgetLoaded(json.data.token, json.data.scriptUrl);

      setStatus("open");
      const finished = new Promise<{ prescricaoId: string; documentId: string }>((resolve, reject) => {
        widgetState.pending = { resolve, reject };
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
    </div>
  );
}
