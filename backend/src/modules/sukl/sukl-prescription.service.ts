import { randomUUID } from "node:crypto";

import { prisma } from "../../db/prisma.js";
import {
  buildCancelPrescriptionRequest,
  buildCreatePrescriptionRequest,
  interpretCancelPrescriptionResponse,
  interpretCreatePrescriptionResponse,
  isSuklCallable,
  loadSuklSigningKey,
  suklInterfaceVersion,
  suklMissingCallConfig,
  suklPost,
  suklSwKlienta,
  suklUzivatel,
  suklWorkplaceCode,
  SuklNotConfiguredError,
  isSuklError,
  type SuklPrescribedItem,
  type SuklPatientIdentity,
  type SuklService,
} from "../../lib/sukl/index.js";
import { suklEnvironment } from "../../lib/sukl/config.js";
import { DEFAULT_ENDPOINT_PATH } from "../../lib/sukl/app-ping.js";
import { wrapInSoapEnvelope } from "../../lib/sukl/envelope.js";

/**
 * Issuing and withdrawing an eRecept.
 *
 * The database row is written BEFORE the call and is the reason this service
 * exists rather than the operation being called directly. SÚKL treat the
 * ID_Zpravy we send on a create as the submission identifier and as the
 * authorisation id for any later amendment or cancellation, so it has to
 * survive the request: a prescription whose submission id was never persisted
 * cannot be withdrawn at all.
 *
 * That ordering also gives the honest answer to an ambiguous failure. If the
 * call times out or returns 2xx with no identifier, the row stays PENDING and a
 * human decides — SÚKL may already hold the prescription, and a blind retry
 * would issue the same script twice (SCOPE_CONFIRMATION Q10).
 */

export interface IssuePrescriptionInput {
  service?: SuklService;
  doctorUserId: string;
  appointmentId?: string;
  patientUserId?: string;
  patient: SuklPatientIdentity;
  /**
   * ID_LP_Zdroj is optional to the caller and filled in below. It is our own
   * identifier for the line, so a caller with a meaningful one should pass it;
   * the admin console has none and gets a generated value.
   */
  items: Array<Omit<SuklPrescribedItem, "sourceItemId"> & { sourceItemId?: string }>;
  /** ISO date. Defaults to today. */
  issuedOn?: string;
  /** ISO date. Defaults to 30 days out, the usual eRecept validity. */
  validUntil?: string;
  note?: string;
  urgent?: boolean;
}

export interface IssuePrescriptionResult {
  prescriptionId: string;
  submissionId: string;
  ok: boolean;
  documentId: string | null;
  httpStatus: number;
  durationMs: number;
  errorCode: string | null;
  errorMessage: string | null;
  errorAdvice: string | null;
}

/**
 * A 14-digit `ID_LP_Zdroj` for a prescribed line.
 *
 * SÚKL require the source system's own identifier and constrain it to exactly
 * 14 digits, so it cannot be a cuid or a UUID. A millisecond timestamp is 13
 * digits, leaving one for the line index — unique within a prescription, and
 * ordered, which is what makes it useful when reconciling with SÚKL later.
 */
function sourceItemId(index: number, now = Date.now()): string {
  return `${now}${index % 10}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Loads the prescriber fields SÚKL require, and refuses clearly when they are
 * missing rather than letting SÚKL reject the prescription.
 */
async function loadPrescriber(doctorUserId: string, environment: string) {
  const identity = await prisma.suklDoctorIdentity.findUnique({
    where: { doctorUserId_environment: { doctorUserId, environment } },
  });
  if (!identity) {
    throw new SuklNotConfiguredError(
      "This doctor has no SÚKL identity mapping, so a prescription cannot name a prescriber.",
    );
  }

  const missing: string[] = [];
  if (!identity.suklProfessionalIdentifier?.trim()) missing.push("SÚKL login (Lekar)");
  if (!identity.icp?.trim()) missing.push("IČP");
  // PZS is the workplace code assigned in External Identities — SÚKL confirmed
  // 00150928369 on 2026-09-09 — but it is stored per doctor rather than assumed.
  if (!identity.pzs?.trim() && !suklWorkplaceCode()) missing.push("PZS");
  if (!identity.phone?.trim()) missing.push("phone");

  if (missing.length > 0) {
    throw new SuklNotConfiguredError(
      `The doctor's SÚKL mapping is incomplete — missing: ${missing.join(", ")}. ` +
        "SÚKL require all of these on every prescription.",
    );
  }

  return {
    lekar: identity.suklProfessionalIdentifier,
    icp: identity.icp!,
    pzs: identity.pzs?.trim() || suklWorkplaceCode()!,
    phone: identity.phone!,
    specialityCode: identity.specialityCode ?? undefined,
  };
}

export async function issueSuklPrescription(
  input: IssuePrescriptionInput,
): Promise<IssuePrescriptionResult> {
  const service: SuklService = input.service ?? "cuer";
  if (!isSuklCallable(service)) {
    throw new SuklNotConfiguredError(
      `Cannot call SÚKL — missing: ${suklMissingCallConfig(service).join(", ")}`,
    );
  }

  const environment = suklEnvironment() ?? "test";
  const prescriber = await loadPrescriber(input.doctorUserId, environment);

  const now = new Date();
  const issuedOn = input.issuedOn ?? isoDate(now);
  const validUntil =
    input.validUntil ?? isoDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

  // Persist FIRST. The submission id must outlive the request even if the
  // request never completes, because it is the only way to withdraw the
  // prescription afterwards.
  const submissionId = randomUUID();
  const record = await prisma.suklPrescription.create({
    data: {
      environment,
      appointmentId: input.appointmentId ?? null,
      doctorUserId: input.doctorUserId,
      patientUserId: input.patientUserId ?? null,
      submissionId,
      status: "PENDING",
      validUntil: new Date(`${validUntil}T00:00:00.000Z`),
    },
    select: { id: true },
  });

  const shared = { prescriptionId: record.id, submissionId };

  try {
    const signed = buildCreatePrescriptionRequest({
      service,
      submissionId,
      interfaceVersion: suklInterfaceVersion(service),
      swKlienta: suklSwKlienta(),
      sentAt: new Date(),
      issuedOn,
      validUntil,
      patient: input.patient,
      prescriber,
      // SÚKL require ID_LP_Zdroj on every line; supply one when the caller
      // has no identifier of its own to give.
      items: input.items.map((item, index) => ({
        ...item,
        sourceItemId: item.sourceItemId || sourceItemId(index, now.getTime()),
      })),
      note: input.note,
      urgent: input.urgent,
      key: loadSuklSigningKey(),
    });

    const response = await suklPost(service, DEFAULT_ENDPOINT_PATH, wrapInSoapEnvelope(signed), {
      soapAction: "ZalozitPredpis",
    });
    const v = interpretCreatePrescriptionResponse({
      httpStatus: response.httpStatus,
      body: response.body,
    });

    await prisma.suklPrescription.update({
      where: { id: record.id },
      data: v.ok
        ? {
            status: "ISSUED",
            documentId: v.documentId,
            suklState: "PREDEPSANY",
            issuedAt: new Date(),
            lastErrorCode: null,
            lastErrorMessage: null,
          }
        : {
            // An ambiguous outcome deliberately stays PENDING: only a
            // definite rejection becomes FAILED, because FAILED reads as
            // "nothing exists at SÚKL" and that would be a lie here.
            status: v.errorCode === "SUKL_DUPLICATE_OR_UNKNOWN_RESULT" ? "PENDING" : "FAILED",
            lastErrorCode: v.errorCode,
            lastErrorMessage: v.errorMessage,
          },
    });

    return {
      ...shared,
      ok: v.ok,
      documentId: v.documentId,
      httpStatus: response.httpStatus,
      durationMs: response.durationMs,
      errorCode: v.errorCode,
      errorMessage: v.errorMessage,
      errorAdvice: v.errorAdvice,
    };
  } catch (error) {
    const code = isSuklError(error) ? error.code : "SUKL_SERVICE_UNAVAILABLE";
    const message = isSuklError(error) ? error.safeMessage : "The prescription could not be sent.";

    // A transport failure is ambiguous unless it happened before anything was
    // sent, which we cannot tell from here — so the row stays PENDING.
    await prisma.suklPrescription.update({
      where: { id: record.id },
      data: { lastErrorCode: code, lastErrorMessage: message },
    });

    return {
      ...shared,
      ok: false,
      documentId: null,
      httpStatus: isSuklError(error) ? (error.httpStatus ?? 0) : 0,
      durationMs: 0,
      errorCode: code,
      errorMessage: message,
      errorAdvice: null,
    };
  }
}

export interface CancelPrescriptionResult {
  ok: boolean;
  documentId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

/**
 * Withdraws an issued prescription.
 *
 * Unsigned: SÚKL's Table 1 does not list cancellation among the operations
 * requiring a qualified signature, so a doctor can withdraw a prescription
 * without their signing credential being available.
 */
export async function cancelSuklPrescription(input: {
  prescriptionId: string;
  reason: string;
  service?: SuklService;
}): Promise<CancelPrescriptionResult> {
  const service: SuklService = input.service ?? "cuer";
  const record = await prisma.suklPrescription.findUnique({
    where: { id: input.prescriptionId },
  });
  if (!record) {
    throw new SuklNotConfiguredError("No such prescription.");
  }
  if (!record.documentId) {
    throw new SuklNotConfiguredError(
      "This prescription has no SÚKL document id, so there is nothing to withdraw. " +
        "If the create was ambiguous, check SeznamPredpisu before assuming it does not exist.",
    );
  }

  const envelope = wrapInSoapEnvelope(
    buildCancelPrescriptionRequest({
      service,
      messageId: randomUUID(),
      interfaceVersion: suklInterfaceVersion(service),
      swKlienta: suklSwKlienta(),
      sentAt: new Date(),
      uzivatel: suklUzivatel()!,
      pracoviste: suklWorkplaceCode()!,
      documentId: record.documentId,
      // The id from the original create — the whole reason it is stored.
      authorisationId: record.submissionId,
      cancelledOn: isoDate(new Date()),
      reason: input.reason,
    }),
  );

  const response = await suklPost(service, DEFAULT_ENDPOINT_PATH, envelope, {
    soapAction: "ZrusitPredpis",
  });
  const v = interpretCancelPrescriptionResponse({
    httpStatus: response.httpStatus,
    body: response.body,
  });

  await prisma.suklPrescription.update({
    where: { id: record.id },
    data: v.ok
      ? { status: "CANCELLED", cancelledAt: new Date(), lastErrorCode: null, lastErrorMessage: null }
      : { lastErrorCode: v.errorCode, lastErrorMessage: v.errorMessage },
  });

  return {
    ok: v.ok,
    documentId: v.documentId,
    errorCode: v.errorCode,
    errorMessage: v.errorMessage,
  };
}
