import { env } from "../../config/env.js";

/**
 * Memed Prescrição — the doctor-facing e-prescription/certificate WIDGET.
 *
 * A different Memed product surface from `lib/memed/client.ts` (that one is
 * the health-test-kit booking API — separate credentials, separate purpose;
 * do not conflate the two).
 *
 * Confirmed against Memed's real docs (doc.memed.com.br/docs/primeiros-passos,
 * /docs/backend/usuario-prescritor, /docs/frontend/eventos-mdhub) — this
 * replaced an earlier version of this file that guessed OAuth2
 * client-credentials auth, which is wrong. The real contract:
 *
 *   1. Every request carries `api-key` + `secret-key` as QUERY PARAMS —
 *      there is no token exchange, no Authorization header.
 *   2. Register the doctor once via POST /sinapse-prescricao/usuarios
 *      (JSON:API body). The response carries a per-doctor `token` — THIS is
 *      what goes in the widget's `data-token` attribute. There is no
 *      separate "create a session" call; the registration token IS the
 *      widget credential, cached by the caller
 *      (modules/memed/prescription-widget.service.ts) on
 *      `DoctorCountry.memedPrescriberId`.
 *   3. When the doctor finishes prescribing, the widget's `prescricaoImpressa`
 *      event (frontend) gives a `prescriptionUuid` + `documents[].uuid` —
 *      the actual PDF bytes are fetched separately via
 *      GET /prescricoes/{prescricaoId}/pdf?document={documentId}.
 *
 * Base URLs (confirmed 2026-08-27): sandbox
 * `https://integrations.api.memed.com.br/v1`, production
 * `https://api.memed.com.br/v1` — set via `MEMED_PRESCRIPTION_BASE_URL`.
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

/** Every call's auth — `api-key`/`secret-key` as query params, per their docs. */
function authParams(): string {
  const qs = new URLSearchParams({
    "api-key": (env.MEMED_PRESCRIPTION_CLIENT_ID ?? "").trim(),
    "secret-key": (env.MEMED_PRESCRIPTION_SECRET ?? "").trim(),
  });
  return qs.toString();
}

/** Strips credentials out of a URL before it ever reaches a log line or thrown error. */
function redact(url: string): string {
  return url.replace(/([?&])(api-key|secret-key)=[^&]*/gi, "$1$2=***");
}

async function request(
  method: "GET" | "POST",
  path: string,
  opts: { body?: unknown; accept?: "json" | "pdf" } = {},
): Promise<{ json?: unknown; buffer?: Buffer }> {
  if (!isMemedPrescriptionConfigured()) throw new MemedPrescriptionNotConfiguredError();
  const url = `${baseUrl()}${path}${path.includes("?") ? "&" : "?"}${authParams()}`;

  const res = await fetch(url, {
    method,
    headers: {
      Accept: opts.accept === "pdf" ? "application/pdf" : "application/vnd.api+json",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (opts.accept === "pdf") {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Memed Prescrição ${method} ${redact(url)} → ${res.status}${text.trim() ? `: ${text.trim().slice(0, 300)}` : ""}`,
      );
    }
    return { buffer: Buffer.from(await res.arrayBuffer()) };
  }

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(
      `Memed Prescrição ${method} ${redact(url)} → ${res.status}${text.trim() ? `: ${text.trim().slice(0, 500)}` : ""}`,
    );
  }
  try {
    return { json: JSON.parse(text) };
  } catch {
    throw new Error(`Memed Prescrição ${method} ${redact(url)} returned a non-JSON body`);
  }
}

export interface DoctorBoard {
  /** e.g. "CRM" — `chamberEntity` on DoctorCountry. */
  boardCode: string;
  boardNumber: string;
  /** UF — two-letter state, e.g. "SP". */
  boardState: string;
}

export interface RegisterPrescriberInput {
  /** Our own id for this doctor+country — Memed's `external_id`. */
  externalId: string;
  firstName: string;
  lastName: string;
  cpf: string;
  board: DoctorBoard;
  /** dd/mm/YYYY, per Memed's documented format. */
  dateOfBirthBr: string;
  email: string;
  phone: string;
}

/**
 * Register (or re-register) a doctor as a Memed prescriber. Returns the
 * per-doctor `token` — this is stored (by the caller) as
 * `DoctorCountry.memedPrescriberId` and used directly as the widget's
 * `data-token`. No DB access here — pure API call, caching policy lives in
 * modules/memed/prescription-widget.service.ts.
 */
export async function registerPrescriber(input: RegisterPrescriberInput): Promise<string> {
  const { json } = await request("POST", "/sinapse-prescricao/usuarios", {
    body: {
      data: {
        type: "usuarios",
        attributes: {
          external_id: input.externalId,
          nome: input.firstName,
          sobrenome: input.lastName,
          cpf: input.cpf.replace(/\D/g, ""),
          board: {
            board_code: input.board.boardCode,
            board_number: input.board.boardNumber,
            board_state: input.board.boardState,
          },
          data_nascimento: input.dateOfBirthBr,
          email: input.email,
          telefone: input.phone,
        },
      },
    },
  });
  const body = json as { data?: { attributes?: { token?: string } } };
  const token = body.data?.attributes?.token?.trim();
  if (!token) throw new Error("Memed Prescrição registration response carried no token");
  return token;
}

/**
 * Fetch the signed PDF bytes for one document from a finished prescription.
 * Called server-side right after the widget's `prescricaoImpressa` event
 * fires on the frontend and posts the ids back to us — never trust a
 * frontend-supplied URL for something we can just fetch ourselves with our
 * own credentials.
 */
export async function fetchPrescriptionDocumentPdf(
  prescricaoId: string,
  documentId: string,
): Promise<Buffer> {
  const { buffer } = await request(
    "GET",
    `/prescricoes/${encodeURIComponent(prescricaoId)}/pdf?document=${encodeURIComponent(documentId)}`,
    { accept: "pdf" },
  );
  if (!buffer?.length) throw new Error("Memed Prescrição PDF download was empty");
  return buffer;
}
