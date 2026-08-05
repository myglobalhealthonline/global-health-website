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

/**
 * Last 8 hex characters of a SHA-256 fingerprint, colons stripped. Enough for a
 * human to confirm "Railway is serving the same certificate I have locally"
 * without publishing a value that identifies the certificate outright.
 */
export function fingerprintSuffix(fingerprint256: string): string {
  return fingerprint256.replace(/:/g, "").slice(-8).toUpperCase();
}
