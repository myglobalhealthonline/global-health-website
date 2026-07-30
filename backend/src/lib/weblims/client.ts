import { env } from "../../config/env.js";

/**
 * Low-level WebLIMS 2 Remote API client (Synlab CZ, vendor STAPRO).
 *
 * Their integration is a FORM HANDOFF, not a booking API — worth stating up
 * front because it dictates the shape of everything here:
 *
 *   1. POST /api/OAuth/token          → server-to-server access token
 *   2. POST /api/Remote/new-request   → opaque, short-lived FORM token.
 *                                       Nothing exists in their LIS yet.
 *   3. GET  /api/Remote/show/{token}  → a HUMAN opens this in Chromium, logs
 *                                       into WebLIMS, picks the methods and
 *                                       saves the requisition. Our server never
 *                                       calls it — `weblimsShowUrl` just builds
 *                                       the URL for the operator's browser.
 *   4. GET  /api/Remote/methods/{token} → plain-text summary of what was ordered.
 *
 * There is no webhook, no requisition number, and no result endpoint. Results
 * come back on a separate channel (SFTP, not built yet).
 *
 * Native fetch + AbortSignal.timeout, mirroring lib/invoice-express/client.ts.
 * On a non-2xx these throw with a truncated body; the caller
 * (modules/lab-orders/weblims-requisition.service.ts) owns gating, consent and
 * persistence, and never lets a lab failure corrupt the requisition record.
 *
 * Open questions with Synlab that affect this file are tracked in
 * docs/guides/synlab-integration-questions.md (A1–A3, C1, C4, D3–D6).
 */

const TIMEOUT_MS = 20_000;

/** Refresh this many ms before the server-stated expiry, to absorb clock skew. */
const TOKEN_SAFETY_MARGIN_MS = 60_000;

/**
 * All three must be present for any call to fire. Everything downstream — the
 * service, the admin route, the UI action — checks this, so an unconfigured
 * deployment shows the lab queue but cannot hand anything to Synlab.
 */
export function isWeblimsConfigured(): boolean {
  return Boolean(
    env.WEBLIMS_BASE_URL?.trim() &&
      env.WEBLIMS_CLIENT_ID?.trim() &&
      env.WEBLIMS_CLIENT_SECRET?.trim(),
  );
}

export class WeblimsNotConfiguredError extends Error {
  constructor() {
    super(
      "WebLIMS is not configured — set WEBLIMS_BASE_URL, WEBLIMS_CLIENT_ID and WEBLIMS_CLIENT_SECRET",
    );
    this.name = "WeblimsNotConfiguredError";
  }
}

function baseUrl(): string {
  return (env.WEBLIMS_BASE_URL ?? "").trim().replace(/\/+$/, "");
}

/**
 * `X-Api-Version` is declared on every operation in their OpenAPI but no value
 * is documented. Omitted until they tell us (question A3) — sending a guess
 * would be worse than sending nothing.
 */
function versionHeader(): Record<string, string> {
  const v = env.WEBLIMS_API_VERSION?.trim();
  return v ? { "X-Api-Version": v } : {};
}

/**
 * Form tokens are capabilities: anyone holding one can open a form pre-filled
 * with a named patient's data. Keep them out of logs and error messages.
 */
function redact(url: string): string {
  return url.replace(
    /\/api\/Remote\/(show|methods)\/[^/?#]+/i,
    "/api/Remote/$1/***",
  );
}

// ─── OAuth 2.0 client credentials ────────────────────────────────────────────

type CachedToken = { accessToken: string; expiresAtMs: number };

let cachedToken: CachedToken | null = null;

/** Test seam — drops the module-level token cache. */
export function resetWeblimsTokenCache(): void {
  cachedToken = null;
}

interface OAuthTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  /** Their docs call this out as the field to trust for clock-skew reasons. */
  expires_at?: string;
}

/**
 * Cached bearer token. Expiry is taken from `expires_at` (absolute UTC, which
 * their documentation explicitly provides to eliminate client/server clock
 * drift) and only falls back to `expires_in` if that is missing.
 */
export async function getAccessToken(): Promise<string> {
  if (!isWeblimsConfigured()) throw new WeblimsNotConfiguredError();

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs - TOKEN_SAFETY_MARGIN_MS > now) {
    return cachedToken.accessToken;
  }

  const url = `${baseUrl()}/api/OAuth/token`;
  // The one endpoint in the whole interface that is form-encoded, not JSON.
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: (env.WEBLIMS_CLIENT_ID ?? "").trim(),
    client_secret: (env.WEBLIMS_CLIENT_SECRET ?? "").trim(),
    scope: "remote",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      ...versionHeader(),
    },
    body: body.toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    // The body of a 400 here follows the OAuth error schema and can echo the
    // request — truncate it and never include our own credentials.
    throw new Error(`WebLIMS OAuth token → ${res.status}${text.trim() ? `: ${text.trim().slice(0, 300)}` : ""}`);
  }

  let json: OAuthTokenResponse;
  try {
    json = JSON.parse(text) as OAuthTokenResponse;
  } catch {
    throw new Error("WebLIMS OAuth token returned a non-JSON body");
  }

  const accessToken = json.access_token?.trim();
  if (!accessToken) throw new Error("WebLIMS OAuth token response carried no access_token");

  const absolute = json.expires_at ? Date.parse(json.expires_at) : NaN;
  const expiresAtMs = Number.isFinite(absolute)
    ? absolute
    : now + (typeof json.expires_in === "number" ? json.expires_in : 300) * 1000;

  cachedToken = { accessToken, expiresAtMs };
  return accessToken;
}

// ─── Remote endpoints ────────────────────────────────────────────────────────

async function remotePost(path: string, payload: unknown): Promise<unknown> {
  const accessToken = await getAccessToken();
  const url = `${baseUrl()}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...versionHeader(),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await res.text().catch(() => "");
  if (res.status === 401) {
    // Credentials rotated or the cached token was revoked — drop it so the next
    // attempt re-authenticates instead of replaying a dead token.
    cachedToken = null;
  }
  if (!res.ok) {
    throw new Error(
      `WebLIMS POST ${redact(url)} → ${res.status}${text.trim() ? `: ${text.trim().slice(0, 500)}` : ""}`,
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`WebLIMS POST ${redact(url)} returned a non-JSON body`);
  }
}

/** `PatientSex` in their schema. */
export type WeblimsSex = "U" | "M" | "F";

/** `LabRequestPriority` in their schema. */
export type WeblimsPriority = "Rutina" | "Statim" | "Vital";

/**
 * `ApiRemoteRequestPatientParams`.
 *
 * Note the required set: the OpenAPI marks `patientId`, `surname` and
 * `birthDate` required, while the PDF marks `patientId` and `sex`. We build to
 * the OpenAPI (the stricter, machine-readable source) and have asked them to
 * confirm — question C4.
 */
export interface WeblimsPatientParams {
  /** Czech rodné číslo, e.g. "121212159". */
  patientId: string;
  /** True when `patientId` comes from travel insurance rather than a rodné číslo. */
  isTravel?: boolean | null;
  name?: string | null;
  surname: string;
  titleBefore?: string | null;
  titleAfter?: string | null;
  /** ISO 8601. Their schema declares `format: date-time`. */
  birthDate: string;
  sex?: WeblimsSex;
  /** MKN-10, e.g. "Z017". */
  diagMain?: string | null;
  diag1?: string | null;
  diag2?: string | null;
  diag3?: string | null;
  diag4?: string | null;
  diag5?: string | null;
  /** FOL insurance/invoice code carrying the "pro Web" flag. */
  insurance?: string | null;
}

/** `ApiRemoteRequestDetailParams`. */
export interface WeblimsRequestParams {
  collectionDate?: string | null;
  collected?: boolean | null;
  wardCode?: string | null;
  wardICP?: string | null;
  wardNode?: string | null;
  wardSpeciality?: string | null;
  doctorCode?: string | null;
  doctorKrzpId?: string | null;
  priority?: WeblimsPriority;
}

/** `ApiRemoteToken`. */
export interface WeblimsFormToken {
  token: string;
  expiresInSeconds: number;
  expiresAt: Date;
}

function parseFormToken(json: unknown, endpoint: string): WeblimsFormToken {
  const body = json as { token?: string; expires_in?: number; expires_at?: string };
  const token = body.token?.trim();
  if (!token) throw new Error(`WebLIMS ${endpoint} returned no token`);

  const expiresInSeconds = typeof body.expires_in === "number" ? body.expires_in : 0;
  const absolute = body.expires_at ? Date.parse(body.expires_at) : NaN;
  const expiresAt = Number.isFinite(absolute)
    ? new Date(absolute)
    : new Date(Date.now() + expiresInSeconds * 1000);

  return { token, expiresInSeconds, expiresAt };
}

/**
 * Prepare a new electronic requisition and get the form token for it.
 * Creates nothing in their LIS — a human still has to open the form and save.
 */
export async function createNewRequestToken(input: {
  patient: WeblimsPatientParams;
  request?: WeblimsRequestParams;
}): Promise<WeblimsFormToken> {
  const json = await remotePost("/api/Remote/new-request", input);
  return parseFormToken(json, "new-request");
}

/** Form token for the patient's list of electronic requisitions. */
export async function createRequestListToken(patientId?: string): Promise<WeblimsFormToken> {
  const json = await remotePost("/api/Remote/request-list", { patientId: patientId ?? null });
  return parseFormToken(json, "request-list");
}

/**
 * Form token for the patient's list of results. Until the SFTP channel is
 * live, this is the only way our staff can see a result at all — it opens
 * WebLIMS' own result screen for that patient.
 */
export async function createResultListToken(patientId: string): Promise<WeblimsFormToken> {
  const json = await remotePost("/api/Remote/result-list", { patientId });
  return parseFormToken(json, "result-list");
}

/**
 * The URL the operator's browser opens. Never fetched server-side: it 302s into
 * an authenticated WebLIMS session that belongs to the human, not to us.
 */
export function weblimsShowUrl(formToken: string): string {
  return `${baseUrl()}/api/Remote/show/${encodeURIComponent(formToken)}`;
}

/**
 * Text summary of the methods ordered on a saved requisition.
 *
 * Returns null on 204 (their "nothing saved yet" response), which is the normal
 * answer when the operator opened the form but has not saved it. 404 means the
 * token expired or never existed — also null, so the caller can distinguish
 * "no methods" from a transport failure by the absence of a thrown error.
 */
export async function getMethods(formToken: string): Promise<string | null> {
  if (!isWeblimsConfigured()) throw new WeblimsNotConfiguredError();

  const accessToken = await getAccessToken();
  const url = `${baseUrl()}/api/Remote/methods/${encodeURIComponent(formToken)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json, text/plain",
      ...versionHeader(),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (res.status === 204 || res.status === 404) return null;
  if (res.status === 401) cachedToken = null;

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(
      `WebLIMS GET ${redact(url)} → ${res.status}${text.trim() ? `: ${text.trim().slice(0, 500)}` : ""}`,
    );
  }

  // Their spec declares the 200 body as a bare JSON string for
  // application/json and as raw text for text/plain — accept both.
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === "string") return parsed.trim() || null;
    } catch {
      // Fall through to the raw text.
    }
  }
  return trimmed;
}
