import { DateTime } from "luxon";

import { env } from "../../config/env.js";
import { loadSuklPfx } from "./certificate.js";
import { SuklError, SuklNotConfiguredError } from "./errors.js";
import { suklRequest } from "./transport.js";

/**
 * NIA — authenticating a doctor through Identita občana.
 *
 * Why this exists: SÚKL confirmed on 2026-09-09 that a message authenticated
 * this way needs **no XML signature at all**. Vyhláška 329/2019 Sb. § 3(4) is
 * the legal basis, and it removes the whole question of holding a doctor's
 * qualified private key. `AppPingZEP` is the single exception — SÚKL require a
 * signature there always, precisely because it exists to test signing.
 *
 * The shape of the flow, from NIA_v0.8:
 *
 *   1. Generate a UUID for the call (`ext_id`).
 *   2. GET /login/{ext_id}/osoba/{os_id} with the facility certificate. The
 *      response is a NIA URL the DOCTOR must open in a browser.
 *   3. The doctor signs in at Identita občana. We cannot do this for them —
 *      it is an interactive citizen login, by design.
 *   4. Poll GET /stav/{ext_id} until it reports 3.
 *   5. GET /token/{ext_id} for the JWT.
 *
 * So it is not headless: a doctor signs in once, and the token then covers
 * every server-side call until it expires. SÚKL set that expiry to **midnight
 * of the issuing day** (or the end of the next day if issued after 22:00), so
 * a doctor logs in about once per working day rather than per prescription.
 *
 * The token is bound to the subject who logged in and cannot be reused for
 * another doctor — it is a per-doctor credential, and must be stored as one.
 */

/** NIA login states. 1 and 2 are transient; 3 is the only success. */
export const NIA_STATE = {
  AUTHENTICATING_AT_NIA: 1,
  PROCESSING_IN_EXTERNAL_IDENTITIES: 2,
  TOKEN_VALID: 3,
  NIA_VERIFICATION_INVALID: 4,
  EXTERNAL_IDENTITIES_ERROR: 5,
  NIA_ERROR: 6,
  TOKEN_INVALID: 7,
} as const;

export type NiaState = (typeof NIA_STATE)[keyof typeof NIA_STATE];

export function isNiaConfigured(): boolean {
  return Boolean(env.SUKL_NIA_BASE_URL?.trim());
}

function niaBaseUrl(): string {
  const raw = env.SUKL_NIA_BASE_URL?.trim();
  if (!raw) {
    throw new SuklNotConfiguredError(
      "NIA is not configured — set SUKL_NIA_BASE_URL (https://testnia.sukl.cz for test).",
    );
  }
  return raw.replace(/\/+$/, "");
}

/**
 * Maps NIA's documented status codes onto messages worth showing an operator.
 *
 * These are the codes NIA return specifically so a client can avoid sending a
 * doctor to a login that cannot succeed, so they are worth surfacing verbatim
 * rather than collapsing into "login failed".
 */
function describeLoginFailure(httpStatus: number): string {
  switch (httpStatus) {
    case 400:
      return "That call UUID has already been used. Generate a new one per login attempt.";
    case 403:
      return "The person or the workplace lacks the required permission in External Identities.";
    case 404:
      return (
        "The person does not exist in External Identities, or has not been identified against " +
        "the population register (ROB). NIA authentication requires that identification."
      );
    default:
      return `NIA returned HTTP ${httpStatus}.`;
  }
}

async function niaGet(path: string): Promise<{ httpStatus: number; body: string }> {
  // The same facility certificate that authenticates our SOAP calls: NIA
  // require the SÚKL authentication certificate on this channel too.
  const { pfx, passphrase } = loadSuklPfx();
  const response = await suklRequest({
    baseUrl: niaBaseUrl(),
    path,
    method: "GET",
    pfx,
    passphrase,
    timeoutMs: env.SUKL_REQUEST_TIMEOUT_MS,
    contentType: "application/json",
  });
  return { httpStatus: response.httpStatus, body: response.body };
}

export interface NiaLoginStart {
  /** The UUID identifying this login attempt — needed for every later call. */
  callId: string;
  /**
   * Where the DOCTOR must go to sign in. This cannot be fetched server-side:
   * it is an interactive Identita občana login.
   */
  niaUrl: string;
}

/**
 * Begins a NIA login and returns the URL the doctor has to open.
 *
 * `redirect=false` so the SAML request comes back in the body rather than as a
 * 302, which is what lets us hand the URL to a browser we do not control.
 */
export async function startNiaLogin(input: {
  callId: string;
  /** The doctor's SÚKL login — UUID or the 11-digit numeric form. */
  suklLogin: string;
}): Promise<NiaLoginStart> {
  const path =
    `/nia/ext/v1/login/${encodeURIComponent(input.callId)}` +
    `/osoba/${encodeURIComponent(input.suklLogin)}?redirect=false`;

  const response = await niaGet(path);
  if (response.httpStatus < 200 || response.httpStatus >= 300) {
    throw new SuklError(
      "SUKL_AUTHENTICATION_FAILED",
      "request",
      describeLoginFailure(response.httpStatus),
      { httpStatus: response.httpStatus },
    );
  }

  const niaUrl = response.body.trim();
  if (!/^https:\/\//i.test(niaUrl)) {
    throw new SuklError(
      "SUKL_AUTHENTICATION_FAILED",
      "response",
      "NIA did not return a sign-in URL.",
      { httpStatus: response.httpStatus },
    );
  }
  return { callId: input.callId, niaUrl };
}

/** Current state of a login attempt. Poll until it leaves 1 and 2. */
export async function getNiaState(callId: string): Promise<NiaState> {
  const response = await niaGet(`/nia/ext/v1/stav/${encodeURIComponent(callId)}`);
  if (response.httpStatus === 400) {
    throw new SuklError("SUKL_AUTHENTICATION_FAILED", "request", "Unknown NIA call UUID.", {
      httpStatus: 400,
    });
  }
  const state = Number(parseNiaState(response.body));
  if (!Number.isInteger(state) || state < 1 || state > 7) {
    throw new SuklError(
      "SUKL_AUTHENTICATION_FAILED",
      "response",
      "NIA returned an unrecognised state.",
      { httpStatus: response.httpStatus },
    );
  }
  return state as NiaState;
}

/** NIA return the state either bare or wrapped in JSON, so accept both. */
export function parseNiaState(body: string): string {
  const trimmed = body.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = /"(?:stav|state)"\s*:\s*"?(\d+)"?/i.exec(trimmed);
  return match?.[1] ?? "";
}

export interface NiaToken {
  token: string;
  /** Valid for prescribing and dispensing until this instant. */
  validUntil: Date | null;
  /** Batch downloads stay valid longer — SÚKL give 24h. */
  downloadsValidUntil: Date | null;
}

export function parseNiaToken(body: string): NiaToken {
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    throw new SuklError(
      "SUKL_AUTHENTICATION_FAILED",
      "response",
      "NIA's token response was not JSON.",
    );
  }
  const obj = raw as { token?: unknown; platDo?: unknown; stahovaniDo?: unknown };
  if (typeof obj.token !== "string" || obj.token.length === 0) {
    throw new SuklError("SUKL_AUTHENTICATION_FAILED", "response", "NIA returned no token.");
  }
  // "2021-07-01 00:00:00" — a space rather than a T, and NO timezone. SÚKL
  // mean Czech local time, so the zone is stated explicitly: parsing it as
  // server-local would be UTC on Railway and shift every expiry by an hour or
  // two, quietly discarding a token that is still valid.
  const asDate = (v: unknown): Date | null => {
    if (typeof v !== "string" || !v.trim()) return null;
    const dt = DateTime.fromFormat(v.trim(), "yyyy-MM-dd HH:mm:ss", { zone: "Europe/Prague" });
    return dt.isValid ? dt.toJSDate() : null;
  };
  return {
    token: obj.token,
    validUntil: asDate(obj.platDo),
    downloadsValidUntil: asDate(obj.stahovaniDo),
  };
}

/** Collects the JWT once the state is 3. */
export async function fetchNiaToken(callId: string): Promise<NiaToken> {
  const response = await niaGet(`/nia/ext/v1/token/${encodeURIComponent(callId)}`);
  if (response.httpStatus === 401) {
    throw new SuklError(
      "SUKL_AUTHENTICATION_FAILED",
      "request",
      "No token for that call UUID — the login is unfinished, or the token has expired.",
      { httpStatus: 401 },
    );
  }
  if (response.httpStatus < 200 || response.httpStatus >= 300) {
    throw new SuklError(
      "SUKL_AUTHENTICATION_FAILED",
      "response",
      `NIA returned HTTP ${response.httpStatus} for the token.`,
      { httpStatus: response.httpStatus },
    );
  }
  return parseNiaToken(response.body);
}

/**
 * Whether a stored token can still be used to prescribe.
 *
 * Deliberately strict: SÚKL expire the prescribing window at midnight, and a
 * call made with a lapsed token is a failed prescription attempt rather than a
 * clean refusal, so a small safety margin is applied.
 */
export function isNiaTokenUsable(validUntil: Date | null, now = new Date()): boolean {
  if (!validUntil) return false;
  const MARGIN_MS = 60_000;
  return validUntil.getTime() - MARGIN_MS > now.getTime();
}
