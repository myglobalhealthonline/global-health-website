import { prisma } from "../../db/prisma.js";
import { recordAudit } from "../audit/audit.service.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Bump this string whenever the confidentiality agreement text changes.
 * Existing `accepted` rows will be detected as outdated the next time
 * `hasAcceptedCurrentAgreement` is called, which triggers a re-accept prompt
 * on the doctor portal.
 */
export const CURRENT_AGREEMENT_VERSION = "1.0.0";

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
 * Return the current confidentiality agreement status for a doctor.
 * `accepted` is true only when the doctor has accepted the CURRENT version.
 */
export async function getConfidentialityStatus(
  doctorId: string,
): Promise<AgreementStatus> {
  const row = await (prisma as any).doctorConfidentialityAgreement.findFirst({
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
  await (prisma as any).doctorConfidentialityAgreement.create({
    data: {
      doctorId,
      agreementVersion: CURRENT_AGREEMENT_VERSION,
      acceptedAt: new Date(),
      ipAddress,
      userAgent,
    },
  });

  recordAudit({
    actorUserId: null,
    actorRole: "DOCTOR",
    action: "CONFIDENTIALITY_AGREEMENT_ACCEPTED" as never,
    entityType: "DoctorConfidentialityAgreement",
    entityId: doctorId,
    metadata: {
      agreementVersion: CURRENT_AGREEMENT_VERSION,
      ipAddress,
    },
  }).catch(() => {});
}

/**
 * Fast boolean check used by access guards.
 * Returns `true` only when the doctor's most recent acceptance matches the
 * current agreement version.
 */
export async function hasAcceptedCurrentAgreement(
  doctorId: string,
): Promise<boolean> {
  const row = await (prisma as any).doctorConfidentialityAgreement.findFirst({
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
  const acceptances = await (prisma as any).doctorConfidentialityAgreement.findMany({
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
    { agreementVersion: string; acceptedAt: Date }
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
