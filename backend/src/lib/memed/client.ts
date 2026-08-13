import { env } from "../../config/env.js";

/**
 * Memed (doc.memed.com.br) — Brazil partner API for prescriptions, compounded
 * formulas, supplements, medical exams, certificates, referrals.
 *
 * We are an approved integration partner but have not yet received production
 * (or sandbox) credentials — see the onboarding checklist at
 * doc.memed.com.br/docs/obter-credenciais. This client is a STUB: the auth
 * scheme, base path, and exact booking payload below are our best read of
 * doc.memed.com.br/docs/backend-api and must be verified against the real API
 * once credentials arrive. `isMemedConfigured()` is the hard gate — with any
 * of MEMED_BASE_URL / MEMED_CLIENT_ID / MEMED_CLIENT_SECRET unset, every call
 * here throws MemedNotConfiguredError instead of hitting an undocumented
 * endpoint blind.
 *
 * Mirrors backend/src/lib/weblims/client.ts: native fetch + AbortSignal
 * timeout, cached bearer token, no PHI/secrets in thrown errors. The caller
 * (modules/memed/memed-booking.service.ts) owns idempotency and persistence,
 * and never lets a Memed failure corrupt the order record.
 */

const TIMEOUT_MS = 20_000;
const TOKEN_SAFETY_MARGIN_MS = 60_000;

export function isMemedConfigured(): boolean {
  return Boolean(
    env.MEMED_BASE_URL?.trim() &&
      env.MEMED_CLIENT_ID?.trim() &&
      env.MEMED_CLIENT_SECRET?.trim(),
  );
}

export class MemedNotConfiguredError extends Error {
  constructor() {
    super(
      "Memed is not configured — set MEMED_BASE_URL, MEMED_CLIENT_ID and MEMED_CLIENT_SECRET",
    );
    this.name = "MemedNotConfiguredError";
  }
}

function baseUrl(): string {
  return (env.MEMED_BASE_URL ?? "").trim().replace(/\/+$/, "");
}

function redact(url: string): string {
  return url.replace(/\/bookings\/[^/?#]+/i, "/bookings/***");
}

type CachedToken = { accessToken: string; expiresAtMs: number };
let cachedToken: CachedToken | null = null;

/** Test seam — drops the module-level token cache. */
export function resetMemedTokenCache(): void {
  cachedToken = null;
}

interface OAuthTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

/** Cached bearer token via OAuth2 client-credentials, same shape as WebLIMS. */
export async function getAccessToken(): Promise<string> {
  if (!isMemedConfigured()) throw new MemedNotConfiguredError();

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs - TOKEN_SAFETY_MARGIN_MS > now) {
    return cachedToken.accessToken;
  }

  const url = `${baseUrl()}/oauth/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: (env.MEMED_CLIENT_ID ?? "").trim(),
    client_secret: (env.MEMED_CLIENT_SECRET ?? "").trim(),
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Memed OAuth token → ${res.status}${text.trim() ? `: ${text.trim().slice(0, 300)}` : ""}`);
  }

  let json: OAuthTokenResponse;
  try {
    json = JSON.parse(text) as OAuthTokenResponse;
  } catch {
    throw new Error("Memed OAuth token returned a non-JSON body");
  }

  const accessToken = json.access_token?.trim();
  if (!accessToken) throw new Error("Memed OAuth token response carried no access_token");

  const expiresAtMs = now + (typeof json.expires_in === "number" ? json.expires_in : 300) * 1000;
  cachedToken = { accessToken, expiresAtMs };
  return accessToken;
}

export interface MemedPatient {
  name: string;
  email?: string | null;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  postalCode: string;
  countryCode: string;
}

export interface MemedBookingItem {
  /** Our HealthTest.title — Memed's own kit/exam catalogue id is unknown until
   *  credentials arrive, so we send the plain-text description for now. */
  description: string;
  quantity: number;
}

export interface CreateBookingInput {
  /** Our Order.id, sent as an external reference for Memed-side reconciliation. */
  externalReferenceId: string;
  doctorId: string;
  patient: MemedPatient;
  items: MemedBookingItem[];
}

export interface MemedBookingResult {
  memedReferenceId: string;
  status: string;
  raw: unknown;
}

/**
 * Create a health-test kit booking in Memed. Endpoint path/payload shape are
 * a placeholder pending the real backend-api spec — confirm against
 * doc.memed.com.br/docs/backend-api before flipping this on with real creds.
 */
export async function createBooking(input: CreateBookingInput): Promise<MemedBookingResult> {
  const accessToken = await getAccessToken();
  const url = `${baseUrl()}/bookings`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      external_reference_id: input.externalReferenceId,
      doctor_id: input.doctorId,
      patient: {
        name: input.patient.name,
        email: input.patient.email ?? undefined,
        phone: input.patient.phone ?? undefined,
        address: {
          line1: input.patient.addressLine1,
          line2: input.patient.addressLine2 ?? undefined,
          city: input.patient.city,
          postal_code: input.patient.postalCode,
          country_code: input.patient.countryCode,
        },
      },
      items: input.items.map((i) => ({ description: i.description, quantity: i.quantity })),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await res.text().catch(() => "");
  if (res.status === 401) cachedToken = null;
  if (!res.ok) {
    throw new Error(
      `Memed POST ${redact(url)} → ${res.status}${text.trim() ? `: ${text.trim().slice(0, 500)}` : ""}`,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Memed POST ${redact(url)} returned a non-JSON body`);
  }

  const body = json as { id?: string; booking_id?: string; status?: string };
  const memedReferenceId = body.id ?? body.booking_id;
  if (!memedReferenceId) throw new Error("Memed booking response carried no id");

  return { memedReferenceId, status: body.status ?? "PENDING", raw: json };
}
