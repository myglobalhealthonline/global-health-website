import { env } from "../../config/env.js";

/**
 * Memed Prescrição — the doctor-facing e-prescription/certificate WIDGET.
 *
 * A different Memed product surface from `lib/memed/client.ts` (that one is
 * the health-test-kit booking API — separate credentials, separate purpose;
 * do not conflate the two). This module is the server side of the widget
 * flow BR doctors use to digitally sign prescriptions/certificates/exam
 * requests themselves:
 *
 *   1. Doctor opens a document type in the portal → backend calls
 *      `ensurePrescriber` (registers the doctor's CRM with Memed once,
 *      caches the returned id on DoctorCountry.memedPrescriberId) then
 *      `createWidgetSession` (mints a short-lived SSO token).
 *   2. Frontend boots Memed's JS widget with that token. The doctor
 *      prescribes and SIGNS inside Memed's own UI — that in-widget
 *      confirmation is the actual legal signature, not anything on our side.
 *   3. Memed's widget returns a document id + PDF URL to the frontend, which
 *      posts it back to us; we mirror the PDF into our own object storage
 *      and create the `GeneratedDocument` row (see
 *      modules/generated-documents/generated-documents.service.ts
 *      createMemedIssuedDocument).
 *
 * We are an approved Memed partner but have NOT received credentials yet
 * (parcerias@memed.com.br). Endpoint paths/payload shapes below are
 * placeholders pending the real backend-api spec — confirm against
 * doc.memed.com.br/docs/backend-api once credentials land. Mirrors
 * lib/weblims/client.ts / lib/memed/client.ts: native fetch + AbortSignal
 * timeout, no secrets in thrown errors, caller owns persistence/idempotency.
 */

const TIMEOUT_MS = 20_000;

export function isMemedPrescriptionConfigured(): boolean {
  return Boolean(
    env.MEMED_PRESCRIPTION_BASE_URL?.trim() &&
      env.MEMED_PRESCRIPTION_CLIENT_ID?.trim() &&
      env.MEMED_PRESCRIPTION_SECRET?.trim(),
  );
}

export class MemedPrescriptionNotConfiguredError extends Error {
  constructor() {
    super(
      "Memed Prescrição is not configured — set MEMED_PRESCRIPTION_BASE_URL, MEMED_PRESCRIPTION_CLIENT_ID and MEMED_PRESCRIPTION_SECRET",
    );
    this.name = "MemedPrescriptionNotConfiguredError";
  }
}

function baseUrl(): string {
  return (env.MEMED_PRESCRIPTION_BASE_URL ?? "").trim().replace(/\/+$/, "");
}

function redact(url: string): string {
  return url.replace(/\/sessions\/[^/?#]+/i, "/sessions/***");
}

async function post(path: string, payload: unknown): Promise<unknown> {
  if (!isMemedPrescriptionConfigured()) throw new MemedPrescriptionNotConfiguredError();
  const url = `${baseUrl()}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Client-Id": (env.MEMED_PRESCRIPTION_CLIENT_ID ?? "").trim(),
      Authorization: `Bearer ${(env.MEMED_PRESCRIPTION_SECRET ?? "").trim()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(
      `Memed Prescrição POST ${redact(url)} → ${res.status}${text.trim() ? `: ${text.trim().slice(0, 500)}` : ""}`,
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Memed Prescrição POST ${redact(url)} returned a non-JSON body`);
  }
}

export interface DoctorCrm {
  chamberEntity: string | null;
  registrationNumber: string;
}

/**
 * Register (or look up) this doctor's Memed prescriber id from their CRM.
 * Caller is responsible for persisting the returned id onto
 * `DoctorCountry.memedPrescriberId` — this function is a pure API call, no
 * DB access, so it stays testable and the caching policy lives in one place
 * (the route handler).
 */
export async function registerPrescriber(input: {
  doctorFullName: string;
  crm: DoctorCrm;
}): Promise<string> {
  const json = await post("/prescribers", {
    name: input.doctorFullName,
    crm_number: input.crm.registrationNumber,
    crm_state: input.crm.chamberEntity ?? undefined,
  });
  const body = json as { id?: string; prescriber_id?: string };
  const id = body.id ?? body.prescriber_id;
  if (!id) throw new Error("Memed Prescrição prescriber registration returned no id");
  return id;
}

export interface CreateWidgetSessionInput {
  prescriberId: string;
  patientName: string;
  patientExternalId: string;
  appointmentId: string;
}

export interface WidgetSession {
  token: string;
  expiresAt: Date;
}

export async function createWidgetSession(input: CreateWidgetSessionInput): Promise<WidgetSession> {
  const json = await post("/sessions", {
    prescriber_id: input.prescriberId,
    patient: { name: input.patientName, external_id: input.patientExternalId },
    external_reference_id: input.appointmentId,
  });
  const body = json as { token?: string; expires_in?: number };
  const token = body.token?.trim();
  if (!token) throw new Error("Memed Prescrição session response carried no token");
  const expiresInSeconds = typeof body.expires_in === "number" ? body.expires_in : 900;
  return { token, expiresAt: new Date(Date.now() + expiresInSeconds * 1000) };
}
