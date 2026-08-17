import { randomBytes } from "node:crypto";
import { Prisma, type IdentityVerificationEvent, type VerificationStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { compareSelfieToIdDocument, isFaceMatchConfigured } from "../../services/face-match.service.js";

/**
 * Ireland controlled-medication patient identity verification.
 *
 * Flow: patient uploads ID + a live selfie → the selfie is face-matched
 * against the ID photo → a human (doctor or admin) confirms → the doctor sees
 * a verified badge during the consultation → a prescription issued for a
 * verified patient is pinned to that verification cycle and prints
 * "Patient Identity Verified".
 *
 * Two rules hold the whole design together:
 *
 *  1. The face-match score never decides. `reviewVerification` is the only
 *     path to VERIFIED and it always records a human actor.
 *  2. A prescription is pinned to the CYCLE, not to the patient's current
 *     status (`pinVerificationToDocument`). Re-verifying, or later rejecting,
 *     a patient must not retroactively change what an issued document said.
 */

/** ISO country code this workflow is scoped to. Nothing here runs elsewhere. */
export const IDENTITY_VERIFICATION_COUNTRY = "ie";

/**
 * Ireland-only by product decision. Country codes are stored lowercase, so
 * compare lowercase — an upper-cased value silently matches nothing.
 */
export function isIdentityVerificationCountry(countryCode: string | null | undefined): boolean {
  return (countryCode ?? "").trim().toLowerCase() === IDENTITY_VERIFICATION_COUNTRY;
}

/**
 * Short, opaque, human-quotable reference printed on the prescription and
 * echoed by the public certificate lookup. Crockford-ish base32 over random
 * bytes: no patient data, no sequence to enumerate, and unambiguous when a
 * pharmacist reads it aloud (no I/L/O/U).
 */
function newReferenceId(): string {
  const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `IDV-${out.slice(0, 4)}-${out.slice(4, 8)}`;
}

export type IdentityVerificationSummary = {
  status: VerificationStatus;
  verifiedAt: Date | null;
  hasIdDocument: boolean;
  /**
   * ID documents accept PDF (a scanned passport is very often one), but a PDF
   * cannot render in an <img>. The reviewer UI needs to know which element to
   * use, so resolve it here from the stored key rather than making the client
   * fetch the object just to read its content type.
   */
  idDocumentIsPdf: boolean;
  hasSelfie: boolean;
  selfieUploadedAt: Date | null;
  requestedAt: Date | null;
  requestedByDoctorId: string | null;
  latestEvent: {
    id: string;
    referenceId: string;
    status: VerificationStatus;
    method: string;
    faceMatchScore: number | null;
    faceMatchProvider: string | null;
    reviewedAt: Date | null;
    reviewedByRole: string | null;
    reviewNotes: string | null;
    createdAt: Date;
  } | null;
};

function toEventSummary(
  event: IdentityVerificationEvent | null,
): IdentityVerificationSummary["latestEvent"] {
  if (!event) return null;
  return {
    id: event.id,
    referenceId: event.referenceId,
    status: event.status,
    method: event.method,
    faceMatchScore: event.faceMatchScore,
    faceMatchProvider: event.faceMatchProvider,
    reviewedAt: event.reviewedAt,
    reviewedByRole: event.reviewedByRole,
    reviewNotes: event.reviewNotes,
    createdAt: event.createdAt,
  };
}

/** Current verification state for a patient, for both portals. */
export async function getVerificationSummary(
  patientProfileId: string,
): Promise<IdentityVerificationSummary | null> {
  const profile = await prisma.patientProfile.findUnique({
    where: { id: patientProfileId },
    select: {
      idVerificationStatus: true,
      idVerificationReviewedAt: true,
      idDocumentKey: true,
      selfieImageKey: true,
      selfieUploadedAt: true,
      idVerifyRequestedAt: true,
      idVerifyRequestedBy: true,
    },
  });
  if (!profile) return null;

  const latest = await prisma.identityVerificationEvent.findFirst({
    where: { patientProfileId },
    orderBy: { createdAt: "desc" },
  });

  return {
    status: profile.idVerificationStatus,
    // Only a VERIFIED profile has a meaningful "verified at" — a rejected or
    // pending one must not report the timestamp of an older review as if it
    // still stood.
    verifiedAt:
      profile.idVerificationStatus === "VERIFIED" ? profile.idVerificationReviewedAt : null,
    hasIdDocument: Boolean(profile.idDocumentKey),
    idDocumentIsPdf: (profile.idDocumentKey ?? "").toLowerCase().endsWith(".pdf"),
    hasSelfie: Boolean(profile.selfieImageKey),
    selfieUploadedAt: profile.selfieUploadedAt,
    requestedAt: profile.idVerifyRequestedAt,
    requestedByDoctorId: profile.idVerifyRequestedBy,
    latestEvent: toEventSummary(latest),
  };
}

/**
 * Bring the patient's open verification cycle in line with the images now on
 * file. Safe to call after EITHER upload, in either order.
 *
 * The two uploads are independent by design — a patient can take their selfie
 * before they have their passport to hand, or the reverse — so this reconciles
 * whatever exists rather than enforcing a sequence. It opens a cycle as soon as
 * a selfie exists (an ID alone is the pre-existing admin document flow and has
 * nothing to review here), backfills the ID snapshot when it arrives later, and
 * runs the face-match assist at the first moment both images are present.
 *
 * Deliberately never sets VERIFIED, however good the score is.
 */
export async function syncVerificationCycle(
  patientProfileId: string,
): Promise<IdentityVerificationEvent | null> {
  const profile = await prisma.patientProfile.findUnique({
    where: { id: patientProfileId },
    select: {
      idDocumentKey: true,
      selfieImageKey: true,
      idVerifyRequestedAt: true,
      idVerifyRequestedBy: true,
    },
  });
  if (!profile?.selfieImageKey) return null;

  // Reuse the cycle already awaiting review rather than opening a second one:
  // a patient uploading their ID after their selfie is still making ONE claim,
  // and two open cycles would give the doctor two things to review.
  const open = await prisma.identityVerificationEvent.findFirst({
    where: { patientProfileId, reviewedAt: null },
    orderBy: { createdAt: "desc" },
  });

  // Only score once both images exist, and only if this cycle has no score yet.
  const needsMatch =
    Boolean(profile.idDocumentKey) &&
    (open === null || (open.faceMatchRanAt === null && open.faceMatchScore === null));

  const match =
    needsMatch && profile.idDocumentKey
      ? await compareSelfieToIdDocument({
          selfieKey: profile.selfieImageKey,
          idDocumentKey: profile.idDocumentKey,
        })
      : null;

  const scoreFields = match
    ? {
        // Records what actually happened, not what was configured: a cycle with
        // no score is a pure manual review even when the provider is enabled.
        method: "AWS_REKOGNITION_COMPAREFACES",
        faceMatchScore: match.score,
        faceMatchProvider: match.provider,
        faceMatchRawResult: match.raw as Prisma.InputJsonValue,
        faceMatchRanAt: match.ranAt,
      }
    : {};

  if (open) {
    return prisma.identityVerificationEvent.update({
      where: { id: open.id },
      data: {
        // Snapshots track the CURRENT images, so a late ID upload is the one
        // the doctor is shown and the one the audit trail records.
        idDocumentKeySnapshot: profile.idDocumentKey,
        selfieImageKeySnapshot: profile.selfieImageKey,
        ...scoreFields,
      },
    });
  }

  return prisma.identityVerificationEvent.create({
    data: {
      referenceId: newReferenceId(),
      patientProfileId,
      status: "PENDING",
      method: match ? "AWS_REKOGNITION_COMPAREFACES" : "MANUAL_REVIEW",
      idDocumentKeySnapshot: profile.idDocumentKey,
      selfieImageKeySnapshot: profile.selfieImageKey,
      faceMatchScore: match?.score ?? null,
      faceMatchProvider: match?.provider ?? null,
      faceMatchRawResult: match ? (match.raw as Prisma.InputJsonValue) : undefined,
      faceMatchRanAt: match?.ranAt ?? null,
      requestedAt: profile.idVerifyRequestedAt,
      requestedByDoctorId: profile.idVerifyRequestedBy,
    },
  });
}

/** Whether an automated score was even possible for this cycle. */
export function faceMatchAvailable(): boolean {
  return isFaceMatchConfigured();
}

export class VerificationEventNotFoundError extends Error {
  constructor() {
    super("Verification not found");
    this.name = "VerificationEventNotFoundError";
  }
}

export class VerificationAlreadyReviewedError extends Error {
  constructor() {
    super("This verification has already been reviewed");
    this.name = "VerificationAlreadyReviewedError";
  }
}

/**
 * A human confirms or rejects a cycle. The only route to VERIFIED.
 *
 * Cycles are append-only in spirit: a reviewed cycle is closed, and changing
 * a patient's mind means a fresh submission, not editing history that a
 * prescription may already be pinned to.
 */
export async function reviewVerification(input: {
  eventId: string;
  patientProfileId: string;
  status: Extract<VerificationStatus, "VERIFIED" | "REJECTED">;
  reviewedByUserId: string;
  reviewedByRole: string;
  reviewNotes?: string | null;
}): Promise<IdentityVerificationEvent> {
  const event = await prisma.identityVerificationEvent.findFirst({
    where: { id: input.eventId, patientProfileId: input.patientProfileId },
  });
  if (!event) throw new VerificationEventNotFoundError();
  if (event.reviewedAt) throw new VerificationAlreadyReviewedError();

  const reviewedAt = new Date();

  const [updated] = await prisma.$transaction([
    prisma.identityVerificationEvent.update({
      where: { id: event.id },
      data: {
        status: input.status,
        reviewedByUserId: input.reviewedByUserId,
        reviewedByRole: input.reviewedByRole,
        reviewedAt,
        reviewNotes: input.reviewNotes?.trim() || null,
      },
    }),
    prisma.patientProfile.update({
      where: { id: input.patientProfileId },
      data: {
        idVerificationStatus: input.status,
        idVerificationReviewedBy: input.reviewedByUserId,
        idVerificationReviewedAt: reviewedAt,
        // The ask is answered either way — clear it so the patient stops being
        // nagged and the doctor's UI stops showing a pending request.
        idVerifyRequestedAt: null,
        idVerifyRequestedBy: null,
      },
    }),
  ]);

  return updated;
}

/**
 * A doctor (or the booking flow) asks the patient to verify. Idempotent —
 * re-asking refreshes who asked and when, it does not queue a second request.
 */
export async function requestVerification(input: {
  patientProfileId: string;
  requestedByDoctorId: string | null;
}): Promise<Date> {
  const requestedAt = new Date();
  await prisma.patientProfile.update({
    where: { id: input.patientProfileId },
    data: {
      idVerifyRequestedAt: requestedAt,
      idVerifyRequestedBy: input.requestedByDoctorId,
    },
  });
  return requestedAt;
}

/**
 * The verification a prescription may cite, or null.
 *
 * Null is the safe answer and the common one: wrong country, patient never
 * verified, verification withdrawn, or no closed cycle to point at. Callers
 * print nothing at all in that case — never "unverified", never a warning on
 * the document itself. A prescription that says nothing about identity is
 * exactly what the pre-existing behaviour produced.
 */
export async function resolveVerificationForPrescription(input: {
  patientEmail: string;
  countryCode: string | null | undefined;
}): Promise<{ eventId: string; referenceId: string; verifiedAt: Date } | null> {
  if (!isIdentityVerificationCountry(input.countryCode)) return null;

  const profile = await prisma.patientProfile.findFirst({
    where: { email: { equals: input.patientEmail.trim(), mode: "insensitive" } },
    select: { id: true },
  });
  if (!profile) return null;

  return prescriptionGradeVerification(profile.id);
}

/**
 * The verification a prescription is allowed to cite, by profile id.
 *
 * Requires a reviewed VERIFIED cycle, NOT merely `idVerificationStatus`. The
 * status column can be set straight to VERIFIED by the admin ID-document
 * screen, which reviews a document but never looks at a face — so it cannot
 * stand behind a controlled-medication identity claim.
 *
 * Both the document generator and the doctor's UI go through this, so what the
 * portal promises and what the PDF prints can never disagree.
 */
export async function prescriptionGradeVerification(
  patientProfileId: string,
): Promise<{ eventId: string; referenceId: string; verifiedAt: Date } | null> {
  const event = await prisma.identityVerificationEvent.findFirst({
    where: { patientProfileId, status: "VERIFIED", reviewedAt: { not: null } },
    orderBy: { reviewedAt: "desc" },
    select: { id: true, referenceId: true, reviewedAt: true },
  });
  if (!event?.reviewedAt) return null;

  return { eventId: event.id, referenceId: event.referenceId, verifiedAt: event.reviewedAt };
}

/**
 * Whether this patient should be shown the verification flow at all.
 *
 * Kept server-side with the rest of the country logic rather than letting the
 * portal guess: a patient books in one country and lives in another, and the
 * thing that actually matters is whether an Irish consultation could prescribe
 * for them. Also true once they are already in the flow, so a patient part-way
 * through never has the section disappear from under them.
 */
export async function isVerificationRelevantForPatient(input: {
  patientProfileId: string;
  patientEmail: string;
}): Promise<boolean> {
  const summary = await getVerificationSummary(input.patientProfileId);
  if (summary && (summary.status !== "NOT_VERIFIED" || summary.hasSelfie || summary.requestedAt)) {
    return true;
  }
  const irishAppointment = await prisma.appointment.findFirst({
    where: {
      email: { equals: input.patientEmail.trim(), mode: "insensitive" },
      countryCode: { equals: IDENTITY_VERIFICATION_COUNTRY, mode: "insensitive" },
    },
    select: { id: true },
  });
  return Boolean(irishAppointment);
}

/** Every prescription document issued on the strength of one verification. */
export async function listDocumentsForVerification(eventId: string) {
  return prisma.generatedDocument.findMany({
    where: { idVerifyEventId: eventId },
    select: {
      id: true,
      certificateId: true,
      documentType: true,
      fileName: true,
      idVerifiedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
