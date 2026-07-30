import type { LabRequisitionStatus, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { computeBlindIndex } from "../../lib/blind-index.js";
import { decryptPhi } from "../../lib/crypto/phi-crypto.js";
import { generateOrderNumber } from "../../lib/order-number.js";
import {
  createNewRequestToken,
  createResultListToken,
  getMethods,
  isWeblimsConfigured,
  weblimsShowUrl,
  WeblimsNotConfiguredError,
} from "../../lib/weblims/client.js";
import { recordAudit, recordCriticalAudit } from "../audit/audit.service.js";
import { resolveOrderPaymentUrl, orderPayShortLink } from "../orders/order-payment-url.service.js";
import {
  buildWeblimsPatientParams,
  buildWeblimsRequestParams,
  normalizePriority,
  type LabPatientSource,
} from "./weblims-payload.js";

/**
 * External-laboratory requisitions (Synlab CZ / WebLIMS 2).
 *
 * The lifecycle this service drives is deliberately human-in-the-loop, because
 * their API is:
 *
 *   doctor prescribes exams        → PRESCRIBED        (createRequisitionFromPrescription)
 *   admin agrees basket by phone   → PATIENT_CONFIRMED (confirmRequisitionItems)
 *   admin sends the payment link   → AWAITING_PAYMENT  (createSelfPayOrder)
 *   patient pays                   → READY_TO_SEND     (markRequisitionsReadyOnOrderPaid)
 *   admin saves the WebLIMS form   → SENT_TO_LAB       (mintFormToken + fetchMethods)
 *   patient attends, results land  → SAMPLE_COLLECTED / RESULT_RECEIVED
 *
 * Nothing here can create a requisition in Synlab's LIS on its own — step 5 is
 * an operator working their form. See docs/guides/synlab-integration-questions.md.
 */

export class LabRequisitionNotFoundError extends Error {
  constructor() {
    super("Lab requisition not found");
    this.name = "LabRequisitionNotFoundError";
  }
}

export class LabConsentMissingError extends Error {
  constructor() {
    super(
      "This patient has not consented to sharing exam requests with third-party laboratories. " +
        "Record a THIRD_PARTY_LAB consent before sending anything to Synlab.",
    );
    this.name = "LabConsentMissingError";
  }
}

export class LabRequisitionStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LabRequisitionStateError";
  }
}

export { WeblimsNotConfiguredError };

// ─── Creation, from the doctor's exams prescription ───────────────────────────

export interface PrescribedExamInput {
  /** ExamType.id when picked from the catalogue; omitted for free text. */
  examTypeId?: string | null;
  label: string;
}

/**
 * Open a requisition from an exams prescription.
 *
 * Called on the doctor's "send exams prescription" path. Also mints one
 * `ExamResult` row per exam in status REQUESTED, so the doctor's own
 * "tests I ordered" view and the admin queue are driven by the same rows
 * instead of drifting apart.
 *
 * Idempotent per generated document: re-sending or redrawing the same
 * prescription updates the existing requisition rather than opening a second
 * one in the admin queue.
 */
export async function createRequisitionFromPrescription(input: {
  patientProfileId: string;
  countryCode: string;
  appointmentId?: string | null;
  doctorId?: string | null;
  generatedDocumentId?: string | null;
  exams: PrescribedExamInput[];
  actorUserId?: string | null;
}): Promise<{ id: string; created: boolean } | null> {
  const exams = input.exams
    .map((e) => ({ examTypeId: e.examTypeId?.trim() || null, label: e.label.trim() }))
    .filter((e) => e.label.length > 0);
  if (exams.length === 0) return null;

  const result = await prisma.$transaction(async (tx) => {
    const existing = input.generatedDocumentId
      ? await tx.labRequisition.findFirst({
          where: {
            generatedDocumentId: input.generatedDocumentId,
            status: { notIn: ["CANCELLED", "CLOSED"] },
          },
          select: { id: true, status: true },
        })
      : null;

    // Past PATIENT_CONFIRMED an admin has already agreed a basket with the
    // patient and may have taken payment — a redraw of the PDF must not
    // silently rewrite what was agreed.
    if (existing && existing.status !== "PRESCRIBED") {
      return { id: existing.id, created: false };
    }

    if (existing) {
      await tx.labRequisitionItem.deleteMany({ where: { requisitionId: existing.id } });
      await tx.labRequisitionItem.createMany({
        data: exams.map((e) => ({
          requisitionId: existing.id,
          examTypeId: e.examTypeId,
          label: e.label,
        })),
      });
      return { id: existing.id, created: false };
    }

    const requisition = await tx.labRequisition.create({
      data: {
        countryCode: input.countryCode.toLowerCase(),
        patientProfileId: input.patientProfileId,
        appointmentId: input.appointmentId ?? null,
        doctorId: input.doctorId ?? null,
        generatedDocumentId: input.generatedDocumentId ?? null,
        createdByUserId: input.actorUserId ?? null,
        status: "PRESCRIBED",
        items: {
          create: exams.map((e) => ({ examTypeId: e.examTypeId, label: e.label })),
        },
      },
      select: { id: true },
    });

    // Mirror into ExamResult(REQUESTED) so the doctor's appointment view shows
    // the same order. Only possible when we know the appointment and doctor —
    // ExamResult requires both.
    if (input.appointmentId && input.doctorId) {
      const items = await tx.labRequisitionItem.findMany({
        where: { requisitionId: requisition.id },
        select: { id: true, label: true },
      });
      for (const item of items) {
        const exam = await tx.examResult.create({
          data: {
            appointmentId: input.appointmentId,
            doctorId: input.doctorId,
            testName: item.label.slice(0, 200),
            status: "REQUESTED",
          },
          select: { id: true },
        });
        await tx.labRequisitionItem.update({
          where: { id: item.id },
          data: { examResultId: exam.id },
        });
      }
    }

    return { id: requisition.id, created: true };
  });

  if (result.created) {
    await recordAudit({
      actorUserId: input.actorUserId ?? null,
      actorRole: "DOCTOR",
      action: "LAB_REQUISITION_CREATED",
      entityType: "LabRequisition",
      entityId: result.id,
      metadata: { examCount: exams.length, countryCode: input.countryCode.toLowerCase() },
    }).catch(() => {});
  }

  return result;
}

// ─── Admin queue reads ───────────────────────────────────────────────────────

export interface LabRequisitionListFilters {
  countryCode?: string;
  status?: LabRequisitionStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function listLabRequisitions(filters: LabRequisitionListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));

  const where: Prisma.LabRequisitionWhereInput = {
    // Country codes are stored lowercase but arrive from anywhere — match
    // case-insensitively, never with an exact upper-cased value.
    ...(filters.countryCode
      ? { countryCode: { equals: filters.countryCode, mode: "insensitive" } }
      : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.q?.trim()
      ? {
          patientProfile: {
            OR: [
              { fullName: { contains: filters.q.trim(), mode: "insensitive" } },
              { email: { contains: filters.q.trim(), mode: "insensitive" } },
              { globalHealthNumber: { contains: filters.q.trim(), mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.labRequisition.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        items: { orderBy: { createdAt: "asc" } },
        patientProfile: {
          select: { id: true, fullName: true, email: true, globalHealthNumber: true },
        },
      },
    }),
    prisma.labRequisition.count({ where }),
  ]);

  return {
    items: rows.map(serializeRequisition),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getLabRequisition(id: string) {
  const row = await prisma.labRequisition.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      patientProfile: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          globalHealthNumber: true,
        },
      },
      results: { orderBy: { receivedAt: "desc" } },
    },
  });
  if (!row) return null;

  return {
    ...serializeRequisition(row),
    patient: {
      ...row.patientProfile,
      dateOfBirth: row.patientProfile.dateOfBirth?.toISOString() ?? null,
    },
    results: row.results.map((r) => ({
      id: r.id,
      matchStatus: r.matchStatus,
      reportedAt: r.reportedAt?.toISOString() ?? null,
      receivedAt: r.receivedAt.toISOString(),
    })),
  };
}

type RequisitionRow = Prisma.LabRequisitionGetPayload<{
  include: {
    items: true;
    patientProfile: {
      select: { id: true; fullName: true; email: true; globalHealthNumber: true };
    };
  };
}>;

/**
 * `formToken` is never serialized — it is a capability that opens a form
 * pre-filled with this patient's identity, and the only consumer that needs it
 * receives the assembled `showUrl` instead.
 */
function serializeRequisition(row: RequisitionRow) {
  return {
    id: row.id,
    countryCode: row.countryCode,
    provider: row.provider,
    status: row.status,
    priority: row.priority,
    appointmentId: row.appointmentId,
    orderId: row.orderId,
    testCenterId: row.testCenterId,
    adminNotes: row.adminNotes,
    methodsText: row.methodsText,
    methodsFetchedAt: row.methodsFetchedAt?.toISOString() ?? null,
    externalRequisitionNo: row.externalRequisitionNo,
    collectionDate: row.collectionDate?.toISOString() ?? null,
    handedOffAt: row.formOpenedAt?.toISOString() ?? null,
    hasLiveFormToken: Boolean(
      row.formToken && row.formTokenExpiresAt && row.formTokenExpiresAt.getTime() > Date.now(),
    ),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    patient: {
      id: row.patientProfile.id,
      fullName: row.patientProfile.fullName,
      email: row.patientProfile.email,
      globalHealthNumber: row.patientProfile.globalHealthNumber,
    },
    items: row.items.map((i) => ({
      id: i.id,
      examTypeId: i.examTypeId,
      label: i.label,
      patientAccepted: i.patientAccepted,
      unitPriceCents: i.unitPriceCents,
      currencyCode: i.currencyCode,
    })),
  };
}

// ─── Admin: the confirmation call ────────────────────────────────────────────

/**
 * Record the outcome of the call with the patient: which exams they want, where
 * they will go, and when. Prices each accepted item from the chosen collection
 * centre's catalogue (`TestCenterExam`), snapshotting the patient-facing price
 * so a later catalogue change never rewrites what was agreed.
 */
export async function confirmRequisitionItems(
  id: string,
  input: {
    acceptedItemIds: string[];
    testCenterId?: string | null;
    collectionDate?: Date | null;
    priority?: string | null;
    adminNotes?: string | null;
  },
  actor: { userId?: string | null } = {},
) {
  const requisition = await prisma.labRequisition.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!requisition) throw new LabRequisitionNotFoundError();
  if (requisition.status === "CANCELLED") {
    throw new LabRequisitionStateError("This requisition has been cancelled");
  }

  const accepted = new Set(input.acceptedItemIds);
  const testCenterId = input.testCenterId ?? requisition.testCenterId;

  // Catalogue prices for the accepted items, in one query.
  const examTypeIds = requisition.items
    .filter((i) => accepted.has(i.id) && i.examTypeId)
    .map((i) => i.examTypeId!);
  const offerings =
    testCenterId && examTypeIds.length > 0
      ? await prisma.testCenterExam.findMany({
          where: { testCenterId, examTypeId: { in: examTypeIds }, isActive: true },
        })
      : [];
  const offeringByExamType = new Map(offerings.map((o) => [o.examTypeId, o]));

  await prisma.$transaction(async (tx) => {
    for (const item of requisition.items) {
      const isAccepted = accepted.has(item.id);
      const offering = item.examTypeId ? offeringByExamType.get(item.examTypeId) : undefined;
      await tx.labRequisitionItem.update({
        where: { id: item.id },
        data: {
          patientAccepted: isAccepted,
          unitPriceCents: isAccepted && offering ? patientPriceCents(offering) : null,
          currencyCode: isAccepted && offering ? offering.currencyCode : null,
        },
      });
    }

    await tx.labRequisition.update({
      where: { id },
      data: {
        status: requisition.status === "PRESCRIBED" ? "PATIENT_CONFIRMED" : requisition.status,
        testCenterId: testCenterId ?? null,
        collectionDate: input.collectionDate ?? requisition.collectionDate,
        priority: normalizePriority(input.priority ?? requisition.priority),
        adminNotes: input.adminNotes ?? requisition.adminNotes,
      },
    });
  });

  await recordAudit({
    actorUserId: actor.userId ?? null,
    actorRole: "ADMIN",
    action: "LAB_REQUISITION_ITEMS_CONFIRMED",
    entityType: "LabRequisition",
    entityId: id,
    metadata: { acceptedCount: accepted.size, totalCount: requisition.items.length },
  }).catch(() => {});

  return getLabRequisition(id);
}

/**
 * Patient-facing price from the centre's cost + markup. Mirrors the
 * `TestCenterExam` contract: FIXED adds cents, PERCENT applies basis points
 * (100 = 1.00%). Computed at read time, never stored on the catalogue row.
 */
function patientPriceCents(offering: {
  costCents: number;
  markupMode: string;
  markupValue: number;
}): number {
  if (offering.markupMode === "PERCENT") {
    return Math.round(offering.costCents * (1 + offering.markupValue / 10_000));
  }
  return offering.costCents + offering.markupValue;
}

// ─── Admin: self-pay order ───────────────────────────────────────────────────

/**
 * Mint a self-pay order for the accepted items and return a payment link.
 *
 * Reuses `resolveOrderPaymentUrl`, so the order behaves exactly like any other
 * unpaid order: same Stripe account routing per country, same cancelled/paid
 * guard, same short `/pay/:orderId` link the automations already send.
 */
export async function createSelfPayOrder(
  id: string,
  actor: { userId?: string | null } = {},
): Promise<{ orderId: string; payUrl: string; shortLink: string }> {
  const requisition = await prisma.labRequisition.findUnique({
    where: { id },
    include: {
      items: true,
      patientProfile: { select: { email: true, fullName: true, phone: true, userId: true } },
    },
  });
  if (!requisition) throw new LabRequisitionNotFoundError();

  const billable = requisition.items.filter(
    (i) => i.patientAccepted && typeof i.unitPriceCents === "number" && i.unitPriceCents > 0,
  );
  if (billable.length === 0) {
    throw new LabRequisitionStateError(
      "No priced, accepted exams on this requisition — confirm the items against a collection centre first",
    );
  }

  const currencyCode = billable[0]!.currencyCode;
  if (!currencyCode || billable.some((i) => i.currencyCode !== currencyCode)) {
    throw new LabRequisitionStateError("Accepted exams are priced in more than one currency");
  }

  const subtotalCents = billable.reduce((sum, i) => sum + (i.unitPriceCents ?? 0), 0);
  const orderNumber = await generateOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: requisition.patientProfile.userId,
      email: requisition.patientProfile.email,
      fullName: requisition.patientProfile.fullName ?? requisition.patientProfile.email,
      phone: requisition.patientProfile.phone,
      countryCode: requisition.countryCode,
      currencyCode,
      subtotalCents,
      totalCents: subtotalCents,
      items: {
        create: billable.map((i) => ({
          kind: "LAB_EXAM" as const,
          name: i.label,
          unitPriceCents: i.unitPriceCents!,
          quantity: 1,
          lineTotalCents: i.unitPriceCents!,
          patientEmail: requisition.patientProfile.email,
          patientFullName: requisition.patientProfile.fullName,
        })),
      },
    },
    select: { id: true },
  });

  await prisma.labRequisition.update({
    where: { id },
    data: { orderId: order.id, status: "AWAITING_PAYMENT" },
  });

  const payUrl = await resolveOrderPaymentUrl(order.id);

  await recordAudit({
    actorUserId: actor.userId ?? null,
    actorRole: "ADMIN",
    action: "LAB_REQUISITION_STATUS_CHANGED",
    entityType: "LabRequisition",
    entityId: id,
    metadata: { status: "AWAITING_PAYMENT", orderId: order.id, totalCents: subtotalCents },
  }).catch(() => {});

  return { orderId: order.id, payUrl, shortLink: orderPayShortLink(order.id) };
}

/**
 * Payment fulfilment hook — advance any requisition this order was paying for.
 *
 * Called from inside the paid-order transaction in
 * `modules/orders/complete-order-payment.service.ts`, so a paid lab order and
 * its requisition state can never disagree.
 */
export async function markRequisitionsReadyOnOrderPaid(
  tx: Prisma.TransactionClient | PrismaClient,
  orderId: string,
): Promise<void> {
  await tx.labRequisition.updateMany({
    where: { orderId, status: "AWAITING_PAYMENT" },
    data: { status: "READY_TO_SEND" },
  });
}

// ─── Admin: the WebLIMS handoff ──────────────────────────────────────────────

/**
 * The patient's decrypted identifiers. Read in one place so the decryption and
 * the "never log this" rule stay together.
 */
async function loadPatientSource(patientProfileId: string): Promise<LabPatientSource> {
  const profile = await prisma.patientProfile.findUnique({
    where: { id: patientProfileId },
    select: {
      fullName: true,
      dateOfBirth: true,
      nationalIdNumber: true,
      insurancePolicyNumber: true,
    },
  });
  if (!profile) throw new LabRequisitionNotFoundError();

  return {
    fullName: profile.fullName,
    dateOfBirth: profile.dateOfBirth,
    nationalIdNumber: decryptPhi(profile.nationalIdNumber),
    insurancePolicyNumber: decryptPhi(profile.insurancePolicyNumber),
  };
}

/** Latest THIRD_PARTY_LAB consent row wins — the table is append-only. */
async function hasThirdPartyLabConsent(patientProfileId: string): Promise<boolean> {
  const latest = await prisma.patientConsent.findFirst({
    where: { patientProfileId, consentType: "THIRD_PARTY_LAB" },
    orderBy: { createdAt: "desc" },
    select: { consentValue: true },
  });
  return latest?.consentValue === true;
}

/**
 * Prepare the WebLIMS form and return the URL for the operator to open.
 *
 * This is the moment patient identification data leaves us for the laboratory,
 * so it is gated on THIRD_PARTY_LAB consent and audited with
 * `recordCriticalAudit` — if the audit write fails, the handoff fails.
 *
 * The returned URL must be opened by a human. Because we print sample labels
 * ourselves, the operator normally hands it to WebLIMS Browser
 * (`wlbrowser.exe <url>`); `showUrl` works in any Chromium window for
 * operators who are not printing.
 */
export async function mintFormToken(
  id: string,
  actor: { userId?: string | null } = {},
): Promise<{ showUrl: string; expiresAt: string }> {
  if (!isWeblimsConfigured()) throw new WeblimsNotConfiguredError();

  const requisition = await prisma.labRequisition.findUnique({
    where: { id },
    select: {
      id: true,
      patientProfileId: true,
      status: true,
      collectionDate: true,
      priority: true,
    },
  });
  if (!requisition) throw new LabRequisitionNotFoundError();
  if (requisition.status === "CANCELLED") {
    throw new LabRequisitionStateError("This requisition has been cancelled");
  }

  if (!(await hasThirdPartyLabConsent(requisition.patientProfileId))) {
    throw new LabConsentMissingError();
  }

  const source = await loadPatientSource(requisition.patientProfileId);
  const patient = buildWeblimsPatientParams(source);
  const request = buildWeblimsRequestParams({
    collectionDate: requisition.collectionDate,
    priority: requisition.priority,
  });

  const token = await createNewRequestToken({ patient, request });

  await prisma.labRequisition.update({
    where: { id },
    data: {
      formToken: token.token,
      formTokenExpiresAt: token.expiresAt,
      formOpenedAt: new Date(),
      status: "SENT_TO_LAB",
      // Lets an inbound result be matched to this requisition without ever
      // storing the identifier itself.
      patientIdBlindIndex: computeBlindIndex(patient.patientId),
    },
  });

  await recordCriticalAudit({
    actorUserId: actor.userId ?? null,
    actorRole: "ADMIN",
    action: "LAB_REQUISITION_HANDED_OFF",
    entityType: "LabRequisition",
    entityId: id,
    // Deliberately no token and no patient identifier.
    metadata: { provider: "SYNLAB_WEBLIMS", isTravelIdentifier: patient.isTravel === true },
  });

  return { showUrl: weblimsShowUrl(token.token), expiresAt: token.expiresAt.toISOString() };
}

/**
 * Read back the plain-text list of methods the operator actually ordered.
 *
 * There is no callback when they save the form, so this is a manual "did it
 * land?" check. A null answer is normal and not an error: it means the form was
 * opened but nothing saved yet, or the token has since expired (their docs are
 * contradictory about how long this stays callable — question D4).
 */
export async function fetchMethods(
  id: string,
  actor: { userId?: string | null } = {},
): Promise<{ methodsText: string | null }> {
  if (!isWeblimsConfigured()) throw new WeblimsNotConfiguredError();

  const requisition = await prisma.labRequisition.findUnique({
    where: { id },
    select: { formToken: true },
  });
  if (!requisition) throw new LabRequisitionNotFoundError();
  if (!requisition.formToken) {
    throw new LabRequisitionStateError(
      "No WebLIMS form has been opened for this requisition yet",
    );
  }

  const methodsText = await getMethods(requisition.formToken);
  if (!methodsText) return { methodsText: null };

  await prisma.labRequisition.update({
    where: { id },
    data: {
      methodsText,
      methodsFetchedAt: new Date(),
      // The requisition exists in their LIS now, so the token has served its
      // purpose. Drop the capability rather than leaving it at rest.
      formToken: null,
      formTokenExpiresAt: null,
    },
  });

  await recordAudit({
    actorUserId: actor.userId ?? null,
    actorRole: "ADMIN",
    action: "LAB_REQUISITION_METHODS_FETCHED",
    entityType: "LabRequisition",
    entityId: id,
  }).catch(() => {});

  return { methodsText };
}

/**
 * Open WebLIMS' own result list for this patient.
 *
 * Interim measure: until the SFTP channel is agreed and built, this is the only
 * way our staff can see a result at all. It is a read-only view in their app —
 * nothing is imported into the patient's file by this call.
 */
export async function mintResultListUrl(
  id: string,
): Promise<{ showUrl: string; expiresAt: string }> {
  if (!isWeblimsConfigured()) throw new WeblimsNotConfiguredError();

  const requisition = await prisma.labRequisition.findUnique({
    where: { id },
    select: { patientProfileId: true },
  });
  if (!requisition) throw new LabRequisitionNotFoundError();

  const source = await loadPatientSource(requisition.patientProfileId);
  const patient = buildWeblimsPatientParams(source);
  const token = await createResultListToken(patient.patientId);

  return { showUrl: weblimsShowUrl(token.token), expiresAt: token.expiresAt.toISOString() };
}

// ─── Admin: manual status control ────────────────────────────────────────────

export async function setRequisitionStatus(
  id: string,
  status: LabRequisitionStatus,
  actor: { userId?: string | null } = {},
) {
  const existing = await prisma.labRequisition.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new LabRequisitionNotFoundError();

  await prisma.labRequisition.update({ where: { id }, data: { status } });

  await recordAudit({
    actorUserId: actor.userId ?? null,
    actorRole: "ADMIN",
    action: "LAB_REQUISITION_STATUS_CHANGED",
    entityType: "LabRequisition",
    entityId: id,
    metadata: { status },
  }).catch(() => {});

  return getLabRequisition(id);
}
