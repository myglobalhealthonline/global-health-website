import { env } from "../../config/env.js";

/**
 * The single SÚKL configuration gate.
 *
 * Mirrors `isWeblimsConfigured()` in lib/weblims/client.ts: one predicate that
 * the transport, the service, the scheduler job, the admin route and the admin
 * UI all consult, so an unconfigured deployment shows the console but cannot
 * make a call.
 *
 * The service URLs are intentionally NOT part of this gate. Their absence only
 * blocks the network leg — certificate loading and validation are still worth
 * running and reporting without them. `isSuklServiceConfigured()` covers that
 * per service.
 */
export function isSuklConfigured(): boolean {
  return Boolean(
    env.SUKL_ENVIRONMENT &&
      env.SUKL_TEST_PFX_PASSWORD?.trim() &&
      (env.SUKL_TEST_PFX_BASE64?.trim() || env.SUKL_TEST_PFX_PATH?.trim()) &&
      env.SUKL_TEST_WORKPLACE_CODE?.trim() &&
      env.SUKL_TEST_ENTITY_ICO?.trim(),
  );
}

/**
 * The ePoukaz SOAP services. SÚKL splits these across separate hosts:
 *
 *   cuep   — the ePoukaz voucher service (create / read / cancel).
 *   common — shared operations: code lists, interface versions, ping.
 *
 * Not listed, on purpose: the cross-border pharmacist service. It stays
 * unconfigured until SÚKL confirms what an outpatient workplace may do
 * cross-border (SCOPE_CONFIRMATION.md Q7). Adding it here would be the first
 * step toward calling an operation we may not be permitted to call.
 */
export const SUKL_SERVICES = ["cuep", "common"] as const;
export type SuklService = (typeof SUKL_SERVICES)[number];

export const SUKL_SERVICE_LABELS: Record<SuklService, string> = {
  cuep: "ePoukaz (CUEP)",
  common: "Common (code lists, versions, ping)",
};

/** Which env var configures each service — used in operator-facing messages. */
export const SUKL_SERVICE_ENV_VARS: Record<SuklService, string> = {
  cuep: "SUKL_EPOUKAZ_CUEP_TEST_URL",
  common: "SUKL_EPOUKAZ_COMMON_TEST_URL",
};

/**
 * Host root for a service, trailing slash stripped.
 *
 * This is the HOST only. The operation path must come from the `soap:address`
 * in the current ePoukaz v19 WSDL — callers pass it explicitly and must not
 * invent one.
 */
export function suklServiceUrl(service: SuklService): string | null {
  const raw =
    service === "cuep"
      ? env.SUKL_EPOUKAZ_CUEP_TEST_URL
      : env.SUKL_EPOUKAZ_COMMON_TEST_URL;
  const trimmed = raw?.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : null;
}

export function isSuklServiceConfigured(service: SuklService): boolean {
  return suklServiceUrl(service) !== null;
}

/** True when at least one service host is set, so a network leg is attemptable. */
export function isAnySuklServiceConfigured(): boolean {
  return SUKL_SERVICES.some(isSuklServiceConfigured);
}

/** Human-readable list of what is still missing. Safe to log and to return. */
export function suklMissingConfig(): string[] {
  const missing: string[] = [];
  if (!env.SUKL_ENVIRONMENT) missing.push("SUKL_ENVIRONMENT");
  if (!env.SUKL_TEST_PFX_BASE64?.trim() && !env.SUKL_TEST_PFX_PATH?.trim()) {
    missing.push("SUKL_TEST_PFX_BASE64 or SUKL_TEST_PFX_PATH");
  }
  if (!env.SUKL_TEST_PFX_PASSWORD?.trim()) missing.push("SUKL_TEST_PFX_PASSWORD");
  if (!env.SUKL_TEST_WORKPLACE_CODE?.trim()) missing.push("SUKL_TEST_WORKPLACE_CODE");
  if (!env.SUKL_TEST_ENTITY_ICO?.trim()) missing.push("SUKL_TEST_ENTITY_ICO");
  return missing;
}

export function suklWorkplaceCode(): string | null {
  return env.SUKL_TEST_WORKPLACE_CODE?.trim() ?? null;
}

export function suklIco(): string | null {
  return env.SUKL_TEST_ENTITY_ICO?.trim() ?? null;
}

export function suklEnvironment(): "test" | "production" | null {
  return env.SUKL_ENVIRONMENT ?? null;
}

export function suklTimeoutMs(): number {
  return env.SUKL_REQUEST_TIMEOUT_MS;
}

// ─── Request identity ────────────────────────────────────────────────────────
//
// Every operation carries `Pristupujici { Uzivatel, Pracoviste }` plus a
// `Zprava` header — even the read-only AppPing. These accessors give the one
// blocking value (Uzivatel) a single place to be reported as missing, rather
// than letting it surface as an opaque SÚKL fault.

/**
 * The calling account's login. A CREDENTIAL — never log or return it.
 *
 * TEST-ONLY SHORTCUT. SÚKL confirmed 2026-08-20 that `Uzivatel` identifies the
 * prescribing DOCTOR, not the facility: the entity account (00150928363) is
 * rejected with S026, and each doctor needs their own healthcare-professional
 * identity requested from the test-access portal.
 *
 * A single env var is right while one doctor is being proven end to end. In
 * production the value must come from that doctor's `SuklDoctorIdentity` row —
 * which also means production would hold per-doctor credentials server-side,
 * one of the reasons the Identita občana route is still open
 * (SCOPE_CONFIRMATION.md Q16/Q19).
 */
export function suklUzivatel(): string | null {
  return env.SUKL_TEST_UZIVATEL?.trim() ?? null;
}

/** Optional HTTP Basic password paired with `suklUzivatel()`. A CREDENTIAL. */
export function suklPassword(): string | null {
  return env.SUKL_TEST_PASSWORD?.trim() ?? null;
}

/** Interface version for the `Zprava` header, e.g. "202601B". */
export function suklInterfaceVersion(): string | null {
  return env.SUKL_INTERFACE_VERSION?.trim() ?? null;
}

/** Our software identifier, max 12 chars. Defaulted — SÚKL does not issue it. */
export function suklSwKlienta(): string {
  return env.SUKL_SW_KLIENTA?.trim() || "GlobalHlth";
}

/**
 * True when an actual SOAP operation can be attempted: certificate, a service
 * host, and the identity plus version that every message carries.
 *
 * Deliberately distinct from `isSuklConfigured()` (certificate) and
 * `isSuklServiceConfigured()` (network). A deployment can hold a valid
 * certificate AND reach SÚKL and still be unable to send anything; the console
 * should say which of the three is missing rather than showing one red light.
 */
export function isSuklCallable(service: SuklService): boolean {
  return (
    isSuklConfigured() &&
    isSuklServiceConfigured(service) &&
    Boolean(suklUzivatel()) &&
    Boolean(suklInterfaceVersion()) &&
    Boolean(suklWorkplaceCode())
  );
}

/** What is still missing before any operation can be called. Safe to display. */
export function suklMissingCallConfig(service: SuklService): string[] {
  const missing = suklMissingConfig();
  if (!isSuklServiceConfigured(service)) missing.push(SUKL_SERVICE_ENV_VARS[service]);
  if (!suklUzivatel()) missing.push("SUKL_TEST_UZIVATEL");
  if (!suklInterfaceVersion()) missing.push("SUKL_INTERFACE_VERSION");
  return missing;
}

/**
 * Last 8 hex characters of a SHA-256 fingerprint, colons stripped. Enough for a
 * human to confirm "Railway is serving the same certificate I have locally"
 * without publishing a value that identifies the certificate outright.
 */
export function fingerprintSuffix(fingerprint256: string): string {
  return fingerprint256.replace(/:/g, "").slice(-8).toUpperCase();
}
