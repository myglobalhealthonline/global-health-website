import { prisma } from "../../db/prisma.js";
import { recordCriticalAudit } from "../audit/audit.service.js";
import {
  agreementTextFor,
  CONFIDENTIALITY_AGREEMENT_VERSION,
  resolveAgreementLocale,
  type AgreementLocale,
} from "./confidentiality-agreement-content.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Bump this string whenever the confidentiality agreement's SUBSTANCE
 * changes. Existing `accepted` rows will be detected as outdated the next
 * time `hasAcceptedCurrentAgreement` is called, which triggers a re-accept
 * prompt on the doctor portal.
 *
 * The version is shared across every locale — see
 * `confidentiality-agreement-content.ts` for why a translation-only edit
 * must NOT bump it.
 */
export const CURRENT_AGREEMENT_VERSION = CONFIDENTIALITY_AGREEMENT_VERSION;

/**
 * @deprecated English-only. Kept for the one caller
 * (`scripts/preview-confidentiality-pdf.ts`) that renders a fixed preview —
 * every request path now calls `agreementTextFor(locale)` instead so the
 * doctor sees the agreement in the language they operate in.
 */
export const CURRENT_AGREEMENT_TEXT = agreementTextFor("en");

export { agreementTextFor, resolveAgreementLocale };
export type { AgreementLocale };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgreementStatus = {
  accepted: boolean;
  acceptedAt: Date | null;
  agreementVersion: string;
  currentVersion: string;
};

type DoctorAgreementRow = {
  doctorId: string;
  doctorName: string;
  accepted: boolean;
  acceptedAt: Date | null;
  agreementVersion: string | null;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The language a doctor operates the platform in: their own explicit
 * `preferredLocale` (User.preferredLocale — set via the portal's language
 * switcher) when present, otherwise the default locale of their primary
 * country. Used so the confidentiality agreement — a document doctors are
 * asked to hand-sign — is shown and printed in the language they actually
 * practise in, not hardcoded English.
 */
export async function getDoctorAgreementLocale(doctorId: string): Promise<AgreementLocale> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      country: { select: { defaultLocale: true } },
      loginUser: { select: { preferredLocale: true } },
    },
  });
  const raw = doctor?.loginUser?.preferredLocale ?? doctor?.country?.defaultLocale;
  return resolveAgreementLocale(raw);
}

/**
 * Return the current confidentiality agreement status for a doctor.
 * `accepted` is true only when the doctor has accepted the CURRENT version.
 */
export async function getConfidentialityStatus(
  doctorId: string,
): Promise<AgreementStatus> {
  const row = await prisma.doctorConfidentialityAgreement.findFirst({
    where: { doctorId },
    orderBy: { acceptedAt: "desc" },
    select: {
      agreementVersion: true,
      acceptedAt: true,
    },
  });

  if (!row) {
    return {
      accepted: false,
      acceptedAt: null,
      agreementVersion: "",
      currentVersion: CURRENT_AGREEMENT_VERSION,
    };
  }

  return {
    accepted: row.agreementVersion === CURRENT_AGREEMENT_VERSION,
    acceptedAt: row.acceptedAt,
    agreementVersion: row.agreementVersion,
    currentVersion: CURRENT_AGREEMENT_VERSION,
  };
}

/**
 * Record that a doctor has accepted the current confidentiality agreement.
 * Creates a new row (append-only history so past acceptances are preserved).
 * Emits an audit event.
 */
export async function acceptConfidentialityAgreement(
  doctorId: string,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<void> {
  await prisma.doctorConfidentialityAgreement.create({
    data: {
      doctorId,
      agreementVersion: CURRENT_AGREEMENT_VERSION,
      acceptedAt: new Date(),
      ipAddress,
      userAgent,
    },
  });

  // S-008: this is the compliance evidence that gates PHI access
  // (assertMedicalAccess requires confidentialityAgreementAccepted) — audit
  // write must not be silently swallowed. Wrapped in its own try/catch: the
  // DoctorConfidentialityAgreement row above already committed, so an
  // audit-write failure here must not propagate to the caller's catch and
  // 500 a request that actually succeeded (a client retry on that false 500
  // would create a duplicate acceptance row).
  try {
    await recordCriticalAudit({
      actorUserId: null,
      actorRole: "DOCTOR",
      action: "CONFIDENTIALITY_AGREEMENT_ACCEPTED" as never,
      entityType: "DoctorConfidentialityAgreement",
      entityId: doctorId,
      metadata: {
        agreementVersion: CURRENT_AGREEMENT_VERSION,
        ipAddress,
      },
    });
  } catch (auditError) {
    console.error(
      "[confidentiality] CRITICAL: CONFIDENTIALITY_AGREEMENT_ACCEPTED audit write failed",
      { doctorId, err: auditError instanceof Error ? auditError.message : auditError },
    );
  }
}

/**
 * Fast boolean check used by access guards.
 * Returns `true` only when the doctor's most recent acceptance matches the
 * current agreement version.
 */
export async function hasAcceptedCurrentAgreement(
  doctorId: string,
): Promise<boolean> {
  const row = await prisma.doctorConfidentialityAgreement.findFirst({
    where: {
      doctorId,
      agreementVersion: CURRENT_AGREEMENT_VERSION,
    },
    select: { id: true },
  });

  return row !== null;
}

/**
 * Admin view: list all doctors with their most recent agreement acceptance.
 * Returns one row per doctor with the latest acceptance data (or nulls if
 * they have never accepted).
 *
 * Performs two queries: a full doctor list, then the latest acceptance per
 * doctor. This is intentional — a LEFT JOIN on the doctor list is cleaner
 * than trying to express it as a Prisma nested query.
 */
export async function listDoctorAgreementStatuses(): Promise<DoctorAgreementRow[]> {
  const doctors = await prisma.doctor.findMany({
    select: {
      id: true,
      fullName: true,
    },
    orderBy: { fullName: "asc" },
  });

  if (doctors.length === 0) {
    return [];
  }

  const doctorIds = doctors.map((d) => d.id);

  // Fetch the most recent acceptance for each doctor in one query.
  // Prisma doesn't support DISTINCT ON, so we fetch all rows and
  // deduplicate in-process (bounded by the number of doctors).
  const acceptances = await prisma.doctorConfidentialityAgreement.findMany({
    where: { doctorId: { in: doctorIds } },
    orderBy: { acceptedAt: "desc" },
    select: {
      doctorId: true,
      agreementVersion: true,
      acceptedAt: true,
    },
  });

  // Keep only the most recent row per doctor (rows are already sorted desc).
  const latestByDoctor = new Map<
    string,
    { agreementVersion: string; acceptedAt: Date | null }
  >();
  for (const row of acceptances) {
    if (!latestByDoctor.has(row.doctorId)) {
      latestByDoctor.set(row.doctorId, {
        agreementVersion: row.agreementVersion,
        acceptedAt: row.acceptedAt,
      });
    }
  }

  return doctors.map((doctor) => {
    const latest = latestByDoctor.get(doctor.id);
    if (!latest) {
      return {
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        accepted: false,
        acceptedAt: null,
        agreementVersion: null,
      };
    }
    return {
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      accepted: latest.agreementVersion === CURRENT_AGREEMENT_VERSION,
      acceptedAt: latest.acceptedAt,
      agreementVersion: latest.agreementVersion,
    };
  });
}
