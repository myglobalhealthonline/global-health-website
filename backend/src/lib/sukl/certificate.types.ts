/** Shapes shared by the SÚKL certificate loader, validator and admin console. */

/** Where the PFX blob came from. Surfaced to admins so a Railway deployment can
 *  be told apart from a local one without exposing the path or the bytes. */
export type SuklCertificateSource = "base64" | "path";

/**
 * Certificate metadata safe to persist and to show an authenticated admin.
 *
 * Deliberately absent: the PFX bytes, the private key, the password. The full
 * `fingerprint256` is kept in-process and written to the facility row, but the
 * API only ever exposes its last 8 characters (see `fingerprintSuffix`).
 */
export interface SuklCertificateInfo {
  source: SuklCertificateSource;
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
  /** Uppercase hex, colon-separated, as Node reports it. */
  fingerprint256: string;
  daysUntilExpiry: number;
  expired: boolean;
  /** False means the PKCS#12 held only a certificate — unusable for mTLS. */
  hasPrivateKey: boolean;
}

/** One SÚKL SOAP service's configuration state. */
export interface SuklServiceStatus {
  service: string;
  label: string;
  envVar: string;
  configured: boolean;
  /** Host root only. The operation path comes from the ePoukaz v19 WSDL. */
  url: string | null;
}

/** Payload of GET /api/admin/sukl/status. Every field is redaction-safe. */
export interface SuklHealthStatus {
  configured: boolean;
  environment: "test" | "production" | null;
  certificateAuthority: "SUKL";
  /** Portal/application workplace identifier used in SOAP request payloads where
   *  the official schema requires it. Independent of the certificate subject —
   *  see `subject` below. */
  workplaceCode: string | null;
  ico: string | null;
  /** Per-service endpoint configuration (cuep, common). */
  services: SuklServiceStatus[];
  /** True when a real SOAP operation can be attempted — certificate AND service
   *  URL AND the accessing identity/version that every message carries. Kept
   *  separate from `configured` because a valid certificate that can reach SÚKL
   *  still cannot send anything without `Uzivatel`. */
  callable: boolean;
  /** Env vars still missing before any operation can be called. */
  missingForCall: string[];
  certificateValid: boolean;
  certificateSource: SuklCertificateSource | null;
  /** Certificate subject as issued. Its O/OU carry SÚKL's own identifiers, whose
   *  exact semantics are unconfirmed — deliberately NOT compared against
   *  `workplaceCode`. */
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
  /** Populated when the certificate could not be loaded or validated. */
  problem: { code: string; message: string } | null;
}
