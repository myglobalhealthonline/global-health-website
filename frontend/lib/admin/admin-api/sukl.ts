import { adminRequest } from "./core";

/**
 * Admin API for the SÚKL integration (Czech ePoukaz / eRecept).
 * Backend: `routes/admin-sukl.route.ts`.
 *
 * Every field below is redaction-safe by construction — the backend only ever
 * returns certificate PUBLIC metadata plus the last 8 characters of the
 * fingerprint. There is no DTO here for the certificate itself, its password or
 * its path, because none of those ever crosses the API boundary.
 */

export type SuklDoctorIdentityStatus = "UNVERIFIED" | "VERIFIED" | "REJECTED" | "REVOKED";

/** One SÚKL SOAP service (cuep = ePoukaz, common = code lists/versions/ping). */
export type SuklServiceStatusDto = {
  service: string;
  label: string;
  envVar: string;
  configured: boolean;
  /** Host root only — operation paths come from the ePoukaz v19 WSDL. */
  url: string | null;
};

export type SuklHealthStatusDto = {
  /** False when the SUKL_* env gate is unsatisfied — every action stays disabled. */
  configured: boolean;
  environment: "test" | "production" | null;
  certificateAuthority: "SUKL";
  /** Identifier sent in SOAP payloads. NOT compared to the certificate subject. */
  workplaceCode: string | null;
  ico: string | null;
  services: SuklServiceStatusDto[];
  /** True when a real SOAP call can be attempted (identity + version present). */
  callable: boolean;
  missingForCall: string[];
  certificateValid: boolean;
  certificateSource: "base64" | "path" | null;
  subject: string | null;
  issuer: string | null;
  serialNumber: string | null;
  validFrom: string | null;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  /** Last 8 hex characters of the SHA-256 fingerprint. Never the whole value. */
  fingerprintSuffix: string | null;
  lastConnectionAt: string | null;
  lastErrorCode: string | null;
  lastErrorAt: string | null;
  doctorIdentityCount: number;
  problem: { code: string; message: string } | null;
};

export type SuklDoctorIdentityDto = {
  id: string;
  doctorUserId: string;
  doctorId: string | null;
  environment: string;
  suklProfessionalIdentifier: string;
  suklUsernameOrReference: string | null;
  workplaceCode: string;
  specialityCode: string | null;
  status: SuklDoctorIdentityStatus;
  verifiedAt: string | null;
  notes: string | null;
  updatedAt: string;
};

export type SuklHandshakeOutcomeDto = {
  service: string;
  label: string;
  url: string | null;
  attempted: boolean;
  ok: boolean;
  peerIssuer: string | null;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type SuklConnectionTestDto = {
  ok: boolean;
  stage: "config" | "certificate" | "handshake" | "request" | "response" | "complete";
  environment: string | null;
  workplaceCode: string | null;
  certificate: {
    valid: boolean;
    subject: string | null;
    issuer: string | null;
    serialNumber: string | null;
    validFrom: string | null;
    expiresAt: string | null;
    daysUntilExpiry: number | null;
    fingerprintSuffix: string | null;
    hasPrivateKey: boolean;
    source: string | null;
  };
  /** One entry per service. */
  handshakes: SuklHandshakeOutcomeDto[];
  errorCode: string | null;
  errorMessage: string | null;
  durationMs: number;
};

/** Result of SÚKL's AppPing — the first real SOAP operation. */
export type SuklAppPingDto = {
  service: string;
  label: string;
  ok: boolean;
  httpStatus: number;
  durationMs: number;
  /** Our correlation id. Quote this to SÚKL when investigating a call. */
  requestId: string;
  responseMessageId: string | null;
  interfaceVersion: string;
  errorCode: string | null;
  errorMessage: string | null;
  /** The path used, so a working attempt is reproducible. */
  path: string;
  /** Truncated upstream excerpt on a 401/403. Untrusted text — render as text. */
  bodyExcerpt: string | null;
  /** Selected response headers on a 401/403. `www-authenticate` is the useful one. */
  responseHeaders: Record<string, string> | null;
};

export async function fetchSuklStatus() {
  return adminRequest<{
    status: SuklHealthStatusDto;
    doctorIdentities: SuklDoctorIdentityDto[];
  }>("/api/admin/sukl/status");
}
