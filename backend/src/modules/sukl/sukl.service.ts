import type { SuklDoctorIdentityStatus } from "@prisma/client";

import { prisma } from "../../db/prisma.js";
import {
  fingerprintSuffix,
  inspectSuklCertificate,
  isAnySuklServiceConfigured,
  isSuklConfigured,
  isSuklServiceConfigured,
  isSuklCallable,
  suklMissingCallConfig,
  suklEnvironment,
  suklHandshakeProbe,
  suklIco,
  suklMissingConfig,
  suklServiceUrl,
  suklWorkplaceCode,
  suklGet,
  suklAppPing,
  summariseWsdl,
  addressToPath,
  SuklError,
  SuklNotConfiguredError,
  isSuklError,
  SUKL_SERVICES,
  SUKL_SERVICE_ENV_VARS,
  SUKL_SERVICE_LABELS,
  type SuklCertificateInfo,
  type SuklHealthStatus,
  type SuklService,
  type SuklServiceStatus,
  type SuklStage,
} from "../../lib/sukl/index.js";

/**
 * SÚKL integration service — status, connectivity proof and doctor mappings.
 *
 * There are no ePoukaz business operations here yet, and that is deliberate:
 * the operation names, XML namespaces and message shapes come from SÚKL's
 * WSDL/XSD, which has not been supplied. See docs/sukl/INTERFACE_INVENTORY.md
 * for the blocker list. Guessing a SOAP envelope would be worse than shipping
 * none.
 *
 * Redaction contract for every function in this file: the returned objects and
 * anything written to `SuklFacilityIntegration` contain only certificate PUBLIC
 * metadata, the normalised error code and a message authored by us. The
 * password, the PKCS#12 bytes, the private key and the resolved certificate
 * path never leave the process.
 */

/** Which env var holds the certificate. A NAME, never a value or a path. */
function secretReference(source: SuklCertificateInfo["source"]): string {
  return source === "base64" ? "SUKL_TEST_PFX_BASE64" : "SUKL_TEST_PFX_PATH";
}

function suklServiceStatuses(): SuklServiceStatus[] {
  return SUKL_SERVICES.map((service) => ({
    service,
    label: SUKL_SERVICE_LABELS[service],
    envVar: SUKL_SERVICE_ENV_VARS[service],
    configured: isSuklServiceConfigured(service),
    // The host is not a secret — it is a published SÚKL address, and showing it
    // is how an admin confirms test and production are not crossed.
    url: suklServiceUrl(service),
  }));
}

/**
 * Upserts the facility mirror row. Keyed on (environment, workplaceCode) so a
 * test registration can never overwrite a production one.
 *
 * Returns null when the gate is unsatisfied — with no workplace code there is
 * nothing to key the row on, and inventing a placeholder would leave a bogus
 * row behind once the real code arrives.
 */
async function upsertFacility(fields: {
  certificate?: SuklCertificateInfo | null;
  status?: "NOT_CONFIGURED" | "TEST_ONLY" | "ACTIVE" | "ERROR" | "DISABLED";
  lastConnectionAt?: Date | null;
  error?: { code: string; message: string } | null;
  lastExpiryAlertDays?: number | null;
}) {
  const environment = suklEnvironment();
  const workplaceCode = suklWorkplaceCode();
  const ico = suklIco();
  if (!environment || !workplaceCode || !ico) return null;

  const cert = fields.certificate;
  const data = {
    countryCode: "cz",
    ico,
    workplaceType: "AMBULANCE",
    ...(cert
      ? {
          certificateFingerprint: cert.fingerprint256,
          certificateSubject: cert.subject,
          certificateIssuer: cert.issuer,
          certificateExpiresAt: cert.validTo,
          secretReference: secretReference(cert.source),
        }
      : {}),
    ...(fields.status ? { status: fields.status } : {}),
    ...(fields.lastConnectionAt !== undefined ? { lastConnectionAt: fields.lastConnectionAt } : {}),
    ...(fields.lastExpiryAlertDays !== undefined
      ? { lastExpiryAlertDays: fields.lastExpiryAlertDays }
      : {}),
    ...(fields.error === null
      ? { lastErrorCode: null, lastErrorMessage: null, lastErrorAt: null }
      : fields.error
        ? {
            lastErrorCode: fields.error.code,
            lastErrorMessage: fields.error.message,
            lastErrorAt: new Date(),
          }
        : {}),
  };

  return prisma.suklFacilityIntegration.upsert({
    where: { environment_workplaceCode: { environment, workplaceCode } },
    create: { environment, workplaceCode, ...data },
    update: data,
  });
}

/**
 * Everything the admin console needs, in one redaction-safe object.
 *
 * Never throws for a configuration or certificate problem — those are the thing
 * being reported. A broken certificate must render a red card, not a 500.
 */
export async function getSuklHealthStatus(): Promise<SuklHealthStatus> {
  const configured = isSuklConfigured();
  const environment = suklEnvironment();
  const workplaceCode = suklWorkplaceCode();

  const base: SuklHealthStatus = {
    configured,
    environment,
    certificateAuthority: "SUKL",
    workplaceCode,
    ico: suklIco(),
    services: suklServiceStatuses(),
    // CUEP is the service that matters for issuing, so it drives the flag.
    callable: isSuklCallable("cuep"),
    missingForCall: suklMissingCallConfig("cuep"),
    certificateValid: false,
    certificateSource: null,
    subject: null,
    issuer: null,
    serialNumber: null,
    validFrom: null,
    expiresAt: null,
    daysUntilExpiry: null,
    fingerprintSuffix: null,
    lastConnectionAt: null,
    lastErrorCode: null,
    lastErrorAt: null,
    doctorIdentityCount: 0,
    problem: null,
  };

  if (!configured) {
    return {
      ...base,
      problem: {
        code: "SUKL_NOT_CONFIGURED",
        message: `Not configured — missing: ${suklMissingConfig().join(", ")}`,
      },
    };
  }

  const [row, doctorIdentityCount] = await Promise.all([
    environment && workplaceCode
      ? prisma.suklFacilityIntegration.findUnique({
          where: { environment_workplaceCode: { environment, workplaceCode } },
        })
      : Promise.resolve(null),
    environment
      ? prisma.suklDoctorIdentity.count({ where: { environment } })
      : Promise.resolve(0),
  ]);

  const persisted: SuklHealthStatus = {
    ...base,
    doctorIdentityCount,
    lastConnectionAt: row?.lastConnectionAt?.toISOString() ?? null,
    lastErrorCode: row?.lastErrorCode ?? null,
    lastErrorAt: row?.lastErrorAt?.toISOString() ?? null,
  };

  try {
    const cert = await inspectSuklCertificate();
    return {
      ...persisted,
      certificateValid: true,
      certificateSource: cert.source,
      subject: cert.subject,
      issuer: cert.issuer,
      serialNumber: cert.serialNumber,
      validFrom: cert.validFrom.toISOString(),
      expiresAt: cert.validTo.toISOString(),
      daysUntilExpiry: cert.daysUntilExpiry,
      fingerprintSuffix: fingerprintSuffix(cert.fingerprint256),
    };
  } catch (error) {
    const code = isSuklError(error) ? error.code : "SUKL_CERTIFICATE_INVALID";
    const message = isSuklError(error)
      ? error.safeMessage
      : "The certificate could not be validated.";
    return { ...persisted, problem: { code, message } };
  }
}

/** Outcome of the mutual-TLS probe against one service. */
export interface SuklHandshakeOutcome {
  service: SuklService;
  label: string;
  url: string | null;
  attempted: boolean;
  ok: boolean;
  /** Issuer of the certificate SÚKL presented. Useful, and not sensitive. */
  peerIssuer: string | null;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface SuklConnectionTestResult {
  ok: boolean;
  /** How far the test got before stopping. */
  stage: SuklStage | "complete";
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
  /** One entry per configured service. */
  handshakes: SuklHandshakeOutcome[];
  errorCode: string | null;
  errorMessage: string | null;
  durationMs: number;
}

/**
 * Two-stage connectivity proof.
 *
 * Stage 1 — validate the certificate locally: PKCS#12 parses, password correct,
 *           private key present, validity dates, issuer, serial and fingerprint.
 *           Always runs.
 * Stage 2 — open a real mutual-TLS connection to EACH configured service (cuep,
 *           common). One is probed independently of the other, because a host
 *           being down or unregistered tells you nothing about its sibling.
 *
 * Stage 2 makes no business call. It proves the TLS channel and nothing more —
 * the result says so explicitly, so a green tick is never read as "ePoukaz
 * works". Sending a real operation needs the path and message shape from the
 * ePoukaz v19 WSDL.
 *
 * The certificate subject's O/OU are recorded but deliberately NOT compared
 * against `SUKL_TEST_WORKPLACE_CODE`: they are separate certificate subject
 * identifiers whose semantics SÚKL has not confirmed, and asserting equality
 * would fail a perfectly valid setup.
 */
export async function runSuklConnectionTest(): Promise<SuklConnectionTestResult> {
  const startedAt = Date.now();
  const environment = suklEnvironment();
  const workplaceCode = suklWorkplaceCode();

  const result: SuklConnectionTestResult = {
    ok: false,
    stage: "config",
    environment,
    workplaceCode,
    certificate: {
      valid: false,
      subject: null,
      issuer: null,
      serialNumber: null,
      validFrom: null,
      expiresAt: null,
      daysUntilExpiry: null,
      fingerprintSuffix: null,
      hasPrivateKey: false,
      source: null,
    },
    handshakes: [],
    errorCode: null,
    errorMessage: null,
    durationMs: 0,
  };

  const finish = (r: SuklConnectionTestResult) => ({ ...r, durationMs: Date.now() - startedAt });

  if (!isSuklConfigured()) {
    return finish({
      ...result,
      errorCode: "SUKL_NOT_CONFIGURED",
      errorMessage: `Not configured — missing: ${suklMissingConfig().join(", ")}`,
    });
  }

  // ─── Stage 1: certificate ──────────────────────────────────────────────────
  let cert: SuklCertificateInfo;
  try {
    cert = await inspectSuklCertificate({ force: true });
  } catch (error) {
    const code = isSuklError(error) ? error.code : "SUKL_CERTIFICATE_INVALID";
    const message = isSuklError(error)
      ? error.safeMessage
      : "The certificate could not be validated.";
    await upsertFacility({ status: "ERROR", error: { code, message } });
    return finish({ ...result, stage: "certificate", errorCode: code, errorMessage: message });
  }

  result.certificate = {
    valid: true,
    subject: cert.subject,
    issuer: cert.issuer,
    serialNumber: cert.serialNumber,
    validFrom: cert.validFrom.toISOString(),
    expiresAt: cert.validTo.toISOString(),
    daysUntilExpiry: cert.daysUntilExpiry,
    fingerprintSuffix: fingerprintSuffix(cert.fingerprint256),
    hasPrivateKey: cert.hasPrivateKey,
    source: cert.source,
  };

  // ─── Stage 2: mutual TLS, per service ──────────────────────────────────────
  if (!isAnySuklServiceConfigured()) {
    const message =
      "Certificate is valid. No handshake was attempted because no SÚKL service URL is set — " +
      `set ${SUKL_SERVICES.map((s) => SUKL_SERVICE_ENV_VARS[s]).join(" and ")}.`;
    await upsertFacility({
      certificate: cert,
      status: "TEST_ONLY",
      error: { code: "SUKL_NOT_CONFIGURED", message },
    });
    return finish({
      ...result,
      stage: "handshake",
      errorCode: "SUKL_NOT_CONFIGURED",
      errorMessage: message,
    });
  }

  result.handshakes = await Promise.all(
    SUKL_SERVICES.map(async (service): Promise<SuklHandshakeOutcome> => {
      const shared = {
        service,
        label: SUKL_SERVICE_LABELS[service],
        url: suklServiceUrl(service),
      };
      if (!isSuklServiceConfigured(service)) {
        return {
          ...shared,
          attempted: false,
          ok: false,
          peerIssuer: null,
          durationMs: null,
          errorCode: "SUKL_NOT_CONFIGURED",
          errorMessage: `Not configured — set ${SUKL_SERVICE_ENV_VARS[service]}.`,
        };
      }
      try {
        const probe = await suklHandshakeProbe(service);
        return {
          ...shared,
          attempted: true,
          ok: true,
          peerIssuer: probe.peerIssuer || null,
          durationMs: probe.durationMs,
          errorCode: null,
          errorMessage: null,
        };
      } catch (error) {
        return {
          ...shared,
          attempted: true,
          ok: false,
          peerIssuer: null,
          durationMs: null,
          errorCode: isSuklError(error) ? error.code : "SUKL_TLS_HANDSHAKE_FAILED",
          errorMessage: isSuklError(error)
            ? error.safeMessage
            : "The handshake with SÚKL failed.",
        };
      }
    }),
  );

  const attempted = result.handshakes.filter((h) => h.attempted);
  // Green only when every service we actually tried succeeded. A partial result
  // is not a pass — one reachable host does not make the integration usable.
  const allOk = attempted.length > 0 && attempted.every((h) => h.ok);
  const firstFailure = attempted.find((h) => !h.ok);

  if (allOk) {
    await upsertFacility({
      certificate: cert,
      status: "TEST_ONLY",
      lastConnectionAt: new Date(),
      error: null,
    });
    return finish({ ...result, ok: true, stage: "complete" });
  }

  await upsertFacility({
    certificate: cert,
    status: "ERROR",
    error: {
      code: firstFailure?.errorCode ?? "SUKL_TLS_HANDSHAKE_FAILED",
      message: `${firstFailure?.label ?? "SÚKL"}: ${firstFailure?.errorMessage ?? "handshake failed"}`,
    },
  });
  return finish({
    ...result,
    stage: "handshake",
    errorCode: firstFailure?.errorCode ?? "SUKL_TLS_HANDSHAKE_FAILED",
    errorMessage: firstFailure
      ? `${firstFailure.label}: ${firstFailure.errorMessage}`
      : "The handshake with SÚKL failed.",
  });
}

// ─── WSDL discovery ──────────────────────────────────────────────────────────

export interface SuklWsdlResult {
  service: SuklService;
  label: string;
  requestedUrl: string;
  httpStatus: number;
  contentType: string | null;
  durationMs: number;
  summary: ReturnType<typeof summariseWsdl>;
  /** Published addresses mapped to the `path` suklPost() would need. */
  suggestedPaths: Array<{ address: string; path: string | null }>;
  /** The document itself. The summary is a convenience; this is the evidence. */
  raw: string;
}

/**
 * Retrieves a service's WSDL over the mutual-TLS channel.
 *
 * Exists because SÚKL's hosts are reachable only from the deployed backend, so
 * this is the one place that can read the document that unblocks
 * docs/sukl/INTERFACE_INVENTORY.md. It is a READ: a GET, no SOAP body, nothing
 * created, nothing sent that could be mistaken for a prescription.
 *
 * It does not probe. The caller names the path; the default is the single
 * conventional `?wsdl` location. The full response is returned alongside the
 * parsed summary so a human checks the source rather than trusting a regex —
 * see the note at the top of lib/sukl/wsdl.ts.
 */
export async function fetchSuklWsdl(
  service: SuklService,
  path = "/?wsdl",
): Promise<SuklWsdlResult> {
  if (!isSuklConfigured()) {
    throw new SuklNotConfiguredError(
      `SÚKL is not configured — missing: ${suklMissingConfig().join(", ")}`,
    );
  }
  const host = suklServiceUrl(service);
  if (!host) {
    throw new SuklNotConfiguredError(
      `${SUKL_SERVICE_LABELS[service]} is not configured — set ${SUKL_SERVICE_ENV_VARS[service]}.`,
    );
  }

  const response = await suklGet(service, path, { maxBytes: 4 * 1024 * 1024 });
  const summary = summariseWsdl(response.body);

  return {
    service,
    label: SUKL_SERVICE_LABELS[service],
    requestedUrl: `${host}${path.startsWith("/") ? path : `/${path}`}`,
    httpStatus: response.httpStatus,
    contentType: response.contentType,
    durationMs: response.durationMs,
    summary,
    suggestedPaths: summary.addresses.map((address) => ({
      address,
      path: addressToPath(address, host),
    })),
    raw: response.body,
  };
}

// ─── AppPing ─────────────────────────────────────────────────────────────────

export type { SuklAppPingResult } from "../../lib/sukl/index.js";

/**
 * Calls SÚKL's `AppPing` — the first real SOAP operation.
 *
 * Read-only and permitted, but SÚKL RATE LIMIT calls per user per minute and
 * temporarily block access on excess, so this stays a manual admin action. It
 * must never be attached to a timer, health check or uptime probe.
 *
 * A pass proves the whole stack short of business payloads: mutual TLS, the
 * envelope, the `Zprava` header, the accessing identity, and fault handling.
 */
export async function runSuklAppPing(service: SuklService, path?: string) {
  return suklAppPing(service, path ? { path } : {});
}

// ─── Doctor identity mappings ────────────────────────────────────────────────

export class SuklDoctorIdentityNotFoundError extends Error {
  constructor() {
    super("No SÚKL identity is mapped for this doctor in the current environment");
    this.name = "SuklDoctorIdentityNotFoundError";
  }
}

export interface SuklDoctorIdentityDto {
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
}

function toDto(row: {
  id: string;
  doctorUserId: string;
  doctorId: string | null;
  environment: string;
  suklProfessionalIdentifier: string;
  suklUsernameOrReference: string | null;
  workplaceCode: string;
  specialityCode: string | null;
  status: SuklDoctorIdentityStatus;
  verifiedAt: Date | null;
  notes: string | null;
  updatedAt: Date;
}): SuklDoctorIdentityDto {
  return {
    ...row,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSuklDoctorIdentities(): Promise<SuklDoctorIdentityDto[]> {
  const environment = suklEnvironment();
  if (!environment) return [];
  const rows = await prisma.suklDoctorIdentity.findMany({
    where: { environment },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toDto);
}

/**
 * Creates or updates a doctor's SÚKL mapping.
 *
 * The mapping is written as UNVERIFIED unless it already succeeded against SÚKL
 * — a pasted identifier is a claim, not a verified fact, and only a successful
 * call may promote it. `workplaceCode` must match the configured workplace: a
 * doctor cannot be mapped to a workplace this deployment does not hold a
 * certificate for.
 */
export async function upsertSuklDoctorIdentity(input: {
  doctorUserId: string;
  doctorId?: string | null;
  suklProfessionalIdentifier: string;
  suklUsernameOrReference?: string | null;
  specialityCode?: string | null;
  notes?: string | null;
  updatedByUserId?: string | null;
}): Promise<SuklDoctorIdentityDto> {
  const environment = suklEnvironment();
  const workplaceCode = suklWorkplaceCode();
  if (!environment || !workplaceCode) {
    throw new SuklNotConfiguredError(
      `Cannot map a doctor before the workplace is configured — missing: ${suklMissingConfig().join(", ")}`,
    );
  }

  const data = {
    doctorId: input.doctorId ?? null,
    suklProfessionalIdentifier: input.suklProfessionalIdentifier.trim(),
    suklUsernameOrReference: input.suklUsernameOrReference?.trim() || null,
    specialityCode: input.specialityCode?.trim() || null,
    notes: input.notes?.trim() || null,
    workplaceCode,
    updatedByUserId: input.updatedByUserId ?? null,
  };

  const row = await prisma.suklDoctorIdentity.upsert({
    where: { doctorUserId_environment: { doctorUserId: input.doctorUserId, environment } },
    create: { doctorUserId: input.doctorUserId, environment, status: "UNVERIFIED", ...data },
    update: {
      ...data,
      // Any change to the identifier invalidates a previous verification.
      status: "UNVERIFIED",
      verifiedAt: null,
    },
  });
  return toDto(row);
}

/** Revokes a mapping. Kept as a row, not deleted — it is a registration record. */
export async function revokeSuklDoctorIdentity(
  doctorUserId: string,
  updatedByUserId?: string | null,
): Promise<SuklDoctorIdentityDto> {
  const environment = suklEnvironment();
  if (!environment) throw new SuklNotConfiguredError("SUKL_ENVIRONMENT is not set");

  const existing = await prisma.suklDoctorIdentity.findUnique({
    where: { doctorUserId_environment: { doctorUserId, environment } },
  });
  if (!existing) throw new SuklDoctorIdentityNotFoundError();

  const row = await prisma.suklDoctorIdentity.update({
    where: { id: existing.id },
    data: { status: "REVOKED", verifiedAt: null, updatedByUserId: updatedByUserId ?? null },
  });
  return toDto(row);
}

export { SuklError, isSuklError };
