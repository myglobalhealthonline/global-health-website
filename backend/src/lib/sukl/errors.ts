/**
 * Normalised SÚKL error taxonomy.
 *
 * Every failure the integration can produce collapses into one of these codes,
 * so the admin console, the audit trail and the ops alert all speak the same
 * vocabulary and a caller never has to string-match a driver message.
 *
 * Two rules hold for every error in this file:
 *
 *   1. The message is safe to log and safe to return to an authenticated admin.
 *      It must never contain the certificate password, PFX bytes, private-key
 *      material, a full certificate fingerprint, patient data, or raw XML that
 *      could carry health data. `SuklError.safeMessage` is what routes return.
 *   2. The underlying driver error is kept on `cause` for local debugging but is
 *      never serialised into an HTTP response.
 */

export const SUKL_ERROR_CODES = [
  "SUKL_NOT_CONFIGURED",
  "SUKL_CERTIFICATE_INVALID",
  "SUKL_CERTIFICATE_EXPIRED",
  "SUKL_TLS_HANDSHAKE_FAILED",
  "SUKL_AUTHENTICATION_FAILED",
  "SUKL_TIMEOUT",
  "SUKL_SCHEMA_VALIDATION_FAILED",
  "SUKL_SOAP_FAULT",
  "SUKL_BUSINESS_VALIDATION_FAILED",
  "SUKL_DUPLICATE_OR_UNKNOWN_RESULT",
  "SUKL_SERVICE_UNAVAILABLE",
] as const;

export type SuklErrorCode = (typeof SUKL_ERROR_CODES)[number];

/** Which leg of a SÚKL call failed. Drives the admin console's progress display. */
export type SuklStage = "config" | "certificate" | "handshake" | "request" | "response";

export class SuklError extends Error {
  readonly code: SuklErrorCode;
  readonly stage: SuklStage;
  /** Upstream HTTP status, when the failure happened after a response arrived. */
  readonly httpStatus?: number;
  /**
   * A short, truncated excerpt of the upstream response.
   *
   * Populated ONLY for transport-level rejections (401/403), where the body is
   * an infrastructure error page rather than a business document — that is the
   * one case where SÚKL's own words are the fastest route to a diagnosis, and
   * discarding them leaves an operator with nothing to act on.
   *
   * Never populated for a successful or business response, which may carry
   * patient data. Truncated hard, and treated as untrusted text by callers.
   */
  readonly bodyExcerpt?: string;

  constructor(
    code: SuklErrorCode,
    stage: SuklStage,
    message: string,
    options?: { cause?: unknown; httpStatus?: number; bodyExcerpt?: string },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = "SuklError";
    this.code = code;
    this.stage = stage;
    this.httpStatus = options?.httpStatus;
    this.bodyExcerpt = options?.bodyExcerpt;
  }

  /** The only field that may cross an HTTP boundary or reach a log. */
  get safeMessage(): string {
    return this.message;
  }
}

export class SuklNotConfiguredError extends SuklError {
  constructor(detail: string) {
    super("SUKL_NOT_CONFIGURED", "config", detail);
    this.name = "SuklNotConfiguredError";
  }
}

/**
 * Truthy for any error this module raised. Route handlers use it to decide
 * between a mapped status code and a generic 502.
 */
export function isSuklError(e: unknown): e is SuklError {
  return e instanceof SuklError;
}

/** HTTP status for each code. 503 for "we are not set up", never 500. */
export function suklErrorStatus(code: SuklErrorCode): number {
  switch (code) {
    case "SUKL_NOT_CONFIGURED":
    case "SUKL_CERTIFICATE_INVALID":
    case "SUKL_CERTIFICATE_EXPIRED":
    case "SUKL_SERVICE_UNAVAILABLE":
      return 503;
    case "SUKL_BUSINESS_VALIDATION_FAILED":
    case "SUKL_SCHEMA_VALIDATION_FAILED":
      return 422;
    case "SUKL_TIMEOUT":
      return 504;
    default:
      return 502;
  }
}
