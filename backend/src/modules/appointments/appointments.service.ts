import { randomUUID } from "node:crypto";
import { Prisma, AppointmentStatus as PrismaAppointmentStatus, CartItemKind } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

/** Order-line kinds that carry a doctor snapshot mirrored from the
 *  appointment. Kept in sync on every doctor change so post-payment
 *  reminders (which read `OrderItem.doctorId`) never target a stale
 *  clinician. */
const CONSULTATION_KINDS: CartItemKind[] = [
  CartItemKind.GENERAL_CONSULTATION,
  CartItemKind.SPECIALIST_CONSULTATION,
];
import type { BookingInput } from "../../validations/booking.schema.js";
import type { AppointmentStatus } from "../../validations/admin-appointments.schema.js";
import {
  assertValidStatusTransition,
  InvalidAppointmentStatusTransitionError,
  UnrecognizedAppointmentStatusError,
} from "./appointment-status-transitions.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { mapAppointmentOrderNumbers, mapAppointmentOrders } from "../orders/appointment-order-number.js";
import {
  claimConsecutiveSlots,
  releaseAppointmentSlot,
  ensureSlotsForRange,
  SlotAlreadyTakenError,
} from "../doctor-availability/doctor-availability.service.js";

/**
 * Thrown when a patient tries to reschedule onto a slot that belongs to a
 * different doctor than the one already assigned to the appointment.
 * Reschedule is "same doctor, new time" — swapping doctors goes through the
 * normal cancel-and-rebook flow so a new ServiceDoctor assignment check runs.
 */
export class RescheduleDoctorMismatchError extends Error {
  constructor() {
    super("The selected time belongs to a different clinician. Please pick a slot from your current doctor's availability.");
    this.name = "RescheduleDoctorMismatchError";
  }
}

/**
 * Thrown when a patient tries to reschedule an appointment whose scheduled
 * time has already passed. A consultation that has started (or is over) can
 * no longer be self-served onto a new slot — the patient books again or
 * contacts the clinic.
 */
export class AppointmentAlreadyStartedError extends Error {
  constructor() {
    super("This appointment's time has already passed and can no longer be rescheduled.");
    this.name = "AppointmentAlreadyStartedError";
  }
}

/**
 * Thrown when a patient tries to book a slot whose doctor isn't
 * assigned to the chosen service. Surfaced as `400 Bad Request` so the
 * frontend can hint at "this doctor no longer offers that service" and
 * refresh the picker — separate from `409` (slot race) so the UI can
 * tell them apart.
 */
export class DoctorNotAssignedToServiceError extends Error {
  constructor() {
    super("This doctor is no longer offering that service. Please pick a different doctor or service.");
    this.name = "DoctorNotAssignedToServiceError";
  }
}

export {
  InvalidAppointmentStatusTransitionError,
  UnrecognizedAppointmentStatusError,
  SlotAlreadyTakenError,
};

export async function createAppointmentRequest(input: BookingInput) {
  return createAppointmentWithOptionalOwner(input);
}

/**
 * Build the optional extras object written onto every new Appointment:
 * patient timezone, structured address snapshot, and dual GDPR consents.
 * Pulled into a single helper so both the timed-slot and untimed code
 * paths stay in sync as we extend the booking payload.
 *
 * Returns only the keys the caller supplied — falsy strings become null
 * so the DB stays clean. `gdprConsentedAt` is stamped only when both
 * consents are truthy, mirroring the schema's two-flag requirement.
 */
function buildBookingExtras(input: BookingInput) {
  const nullify = (s: string | undefined | null): string | null =>
    s && s.trim() !== "" ? s.trim() : null;
  const bothConsents =
    input.gdprConsentClinic === true && input.gdprConsentPlatform === true;
  return {
    consultationLanguageCode: nullify(input.consultationLanguageCode),
    patientTimezone: nullify(input.patientTimezone),
    addressLine1: nullify(input.addressLine1),
    addressLine2: nullify(input.addressLine2),
    addressCity: nullify(input.addressCity),
    addressPostalCode: nullify(input.addressPostalCode),
    addressCountryCode: nullify(input.addressCountryCode),
    gdprConsentClinic: input.gdprConsentClinic === true,
    gdprConsentPlatform: input.gdprConsentPlatform === true,
    gdprConsentedAt: bothConsents ? new Date() : null,
    // GDPR opt-IN: only an explicit true counts as consent (Art. 4(11) —
    // silence/absence is not consent).
    whatsappConsent: input.whatsappConsent === true,
  };
}

type CreateAppointmentOptions = {
  userId?: string | null;
};

export async function createAppointmentWithOptionalOwner(
  input: BookingInput,
  options: CreateAppointmentOptions = {},
) {
  try {
    const id = randomUUID();

    // dateOfBirth — `YYYY-MM-DD` string from the form. Coerce to a
    // proper Date (UTC midnight) so the DB column is a real date+time.
    // null when not supplied; the booking schema validates the format
    // before we ever land here.
    const dob =
      input.dateOfBirth && input.dateOfBirth !== ""
        ? new Date(`${input.dateOfBirth}T00:00:00.000Z`)
        : null;

    // Resolve the chosen service (if any) before opening the booking
    // transaction. We need its id to:
    //   - verify the slot's doctor is assigned to it (Phase 4 guard).
    //   - stamp Appointment.serviceId so the consultation flow can
    //     surface duration / price downstream.
    // Service is country-scoped, so the (slug, countryCode) tuple
    // resolves to one row.
    let serviceForBooking: { id: string; durationMinutes: number | null } | null =
      null;
    if (input.serviceSlug) {
      serviceForBooking = await prisma.service.findFirst({
        where: {
          slug: input.serviceSlug,
          isActive: true,
          country: { code: input.country, isActive: true },
        },
        select: { id: true, durationMinutes: true },
      });
    }

    // Slot booking path. If the patient picked a concrete slot, we wrap
    // the slot claim and the appointment INSERT in a single transaction
    // so a race-loser doesn't leave a half-formed appointment behind.
    //
    // `consultationMode` is explicit `'ONLINE'` (the default) because
    // raw SQL bypasses Prisma column defaults, and the column is
    // NON-NULL on the Postgres side — omitting it would error.
    if (input.timeSlotId) {
      await prisma.$transaction(async (tx) => {
        // Consume the base slots the consultation needs (service duration →
        // one true-length booked slot). Duration comes from the picked
        // service; without one, a single base slot is claimed.
        const claimed = await claimConsecutiveSlots(
          tx,
          input.timeSlotId as string,
          serviceForBooking?.durationMinutes ?? null,
        );
        // Assignment guard: if the patient supplied a service, verify
        // the slot's doctor is bookable for that service. Throw inside
        // the transaction so the slot claim rolls back to OPEN.
        if (serviceForBooking) {
          const assignment = await tx.serviceDoctor.findFirst({
            where: {
              serviceId: serviceForBooking.id,
              doctorId: claimed.doctorId,
              isActive: true,
            },
            select: { id: true },
          });
          if (!assignment) {
            throw new DoctorNotAssignedToServiceError();
          }
        }
        await tx.appointment.create({
          data: {
            id,
            userId: options.userId ?? null,
            countryCode: input.country,
            consultationType: input.consultationType,
            fullName: input.fullName,
            email: input.email,
            phone: input.phone || null,
            dateOfBirth: dob,
            notes: input.notes || null,
            consentAccepted: input.consentAccepted,
            crossBorderConsentAccepted: input.crossBorderConsentAccepted,
            medicalAccessConsentScope: input.medicalAccessConsentScope ?? "DIRECT",
            status: "REQUEST_RECEIVED",
            consultationMode: "ONLINE",
            doctorId: claimed.doctorId,
            timeSlotId: input.timeSlotId,
            scheduledAt: claimed.startAt,
            ...buildBookingExtras(input),
          },
        });
      });
      return { id, status: "REQUEST_RECEIVED" };
    }

    await prisma.appointment.create({
      data: {
        id,
        userId: options.userId ?? null,
        countryCode: input.country,
        consultationType: input.consultationType,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone || null,
        dateOfBirth: dob,
        notes: input.notes || null,
        consentAccepted: input.consentAccepted,
        crossBorderConsentAccepted: input.crossBorderConsentAccepted,
        medicalAccessConsentScope: input.medicalAccessConsentScope ?? "DIRECT",
        status: "REQUEST_RECEIVED",
        consultationMode: "ONLINE",
        ...buildBookingExtras(input),
      },
    });

    return { id, status: "REQUEST_RECEIVED" };
  } catch (error) {
    if (error instanceof SlotAlreadyTakenError) {
      throw error;
    }
    throw normalizeDbError(error, "Appointments are temporarily unavailable");
  }
}

type AppointmentRecord = {
  id: string;
  countryCode: string;
  consultationType: string;
  fullName: string;
  email: string;
  phone: string | null;
  notes: string | null;
  status: string;
  scheduledAt: Date | null;
  meetingUrl: string | null;
  paymentStatus: string;
  amountCents: number | null;
  currencyCode: string | null;
  consultationMode: string | null;
  clinicId: string | null;
  locationAddress: string | null;
  doctorId?: string | null;
  /** IANA tz captured at booking time. Surfaced on the patient + doctor
   *  views so scheduledAt renders in the patient's local time. */
  patientTimezone?: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Populated only by the patient-facing list/detail queries that
   *  LEFT JOIN Clinic. Other readers leave it undefined. */
  clinicName?: string | null;
  clinicCity?: string | null;
};

export type AdminAppointmentListItem = {
  id: string;
  country: string;
  consultationType: string;
  fullName: string;
  email: string;
  phone: string | null;
  notesPreview: string | null;
  status: string;
  createdAt: string;
  /** Surfaced so the appointment queue can compute the "live" (in
   *  progress) state without a second round-trip — see AppointmentCard. */
  scheduledAt: string | null;
  doctorId: string | null;
  doctorName: string | null;
};

export type AdminAppointmentDetail = {
  id: string;
  country: string;
  consultationType: string;
  fullName: string;
  email: string;
  phone: string | null;
  notes: string | null;
  status: string;
  scheduledAt: string | null;
  meetingUrl: string | null;
  paymentStatus: string;
  amountCents: number | null;
  currencyCode: string | null;
  consultationMode: string | null;
  clinicId: string | null;
  locationAddress: string | null;
  doctorId: string | null;
  /** IANA tz captured at booking time. Lets the admin reschedule UI show
   *  which zone the slot was originally booked in. Null on legacy rows. */
  patientTimezone: string | null;
  /** Linked order for the clickable order reference on the admin detail
   *  page. `orderId` targets /admin/orders/[id]; `orderNumber` (ORD-000001)
   *  is the label. Both null when the appointment has no linked order. */
  orderId: string | null;
  orderNumber: string | null;
  /** Booked product/service name snapshot from the order line (e.g.
   *  "IE - General Consultation"). Null when there's no linked order item;
   *  the client then falls back to a label mapped from consultationType. */
  serviceName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountAppointmentListItem = {
  id: string;
  countryCode: string;
  consultationType: string;
  status: string;
  scheduledAt: string | null;
  meetingUrl: string | null;
  paymentStatus: string;
  amountCents: number | null;
  currencyCode: string | null;
  createdAt: string;
  updatedAt: string;
  fullName: string;
  email: string;
  phone: string | null;
  notesPreview: string | null;
  /** Patient-facing location data for IN_PERSON appointments. Either a
   *  resolved Clinic (name + city) or a free-text `locationAddress`. */
  consultationMode: string | null;
  clinicName: string | null;
  clinicCity: string | null;
  locationAddress: string | null;
  /** IANA tz captured at booking time. Used by the patient portal to
   *  render scheduledAt in the patient's own zone. */
  patientTimezone: string | null;
  /** Assigned doctor's full name (null when no doctor is assigned yet).
   *  Surfaced so the patient calendar can show who they're meeting. */
  doctorName: string | null;
  /** Human-facing order reference (e.g. ORD-000001), null when the
   *  appointment isn't linked to an order. Shown alongside the patient
   *  name in the Messages inbox. */
  orderNumber: string | null;
};

export type AccountAppointmentDetail = {
  id: string;
  countryCode: string;
  consultationType: string;
  status: string;
  scheduledAt: string | null;
  meetingUrl: string | null;
  createdAt: string;
  updatedAt: string;
  fullName: string;
  email: string;
  phone: string | null;
  notes: string | null;
};

export type ListAppointmentsOptions = {
  page: number;
  pageSize: number;
  status?: AppointmentStatus;
  countryCode?: string;
  consultationType?: string;
  search?: string;
  /** Case-insensitive substring on the assigned doctor's full name (and
   *  linked login email). Excludes appointments with no doctor. */
  doctorName?: string;
  /** Inclusive lower/upper bound on the appointment's scheduled slot
   *  (falls back to createdAt when unscheduled). Accepts `YYYY-MM-DD` or
   *  `YYYY-MM-DDTHH:mm`; interpreted as UTC. */
  dateFrom?: string;
  dateTo?: string;
};

/** Turn a `YYYY-MM-DD` / `YYYY-MM-DDTHH:mm` filter value into a UTC Date.
 *  Bare dates snap to the start of day; the `end` flag snaps a bare date
 *  to the last millisecond so `dateTo` is inclusive of the whole day. */
function parseRangeBound(value: string | undefined, end: boolean): Date | undefined {
  if (!value) return undefined;
  const iso = value.includes("T")
    ? `${value}:00.000Z`
    : `${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export type ListAppointmentsResult = {
  items: AdminAppointmentListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

// Shared column select reused by all admin-facing single-row and list queries.
// Keeping it in one place ensures every code path reads the same fields and
// avoids the repetition that made $queryRawUnsafe necessary before.
const ADMIN_APPT_SELECT = {
  id: true,
  countryCode: true,
  consultationType: true,
  fullName: true,
  email: true,
  phone: true,
  notes: true,
  status: true,
  scheduledAt: true,
  meetingUrl: true,
  paymentStatus: true,
  amountCents: true,
  currencyCode: true,
  consultationMode: true,
  clinicId: true,
  locationAddress: true,
  doctorId: true,
  patientTimezone: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toAdminAppointment(record: AppointmentRecord): AdminAppointmentDetail {
  return {
    id: record.id,
    country: record.countryCode,
    consultationType: record.consultationType,
    fullName: record.fullName,
    email: record.email,
    phone: record.phone,
    notes: record.notes,
    status: record.status,
    scheduledAt: record.scheduledAt ? record.scheduledAt.toISOString() : null,
    meetingUrl: record.meetingUrl,
    paymentStatus: record.paymentStatus,
    amountCents: record.amountCents,
    currencyCode: record.currencyCode,
    consultationMode: record.consultationMode,
    clinicId: record.clinicId,
    locationAddress: record.locationAddress,
    doctorId: record.doctorId ?? null,
    patientTimezone: record.patientTimezone ?? null,
    // Order-link + service-name fields are populated only by the detail
    // path (getAppointmentById), which knows the linked order. Default to
    // null here so every other caller of the mapper stays type-safe.
    orderId: null,
    orderNumber: null,
    serviceName: null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function buildAppointmentWhereClause(options: ListAppointmentsOptions): Prisma.AppointmentWhereInput {
  const where: Prisma.AppointmentWhereInput = {};

  if (options.status) {
    where.status = options.status as PrismaAppointmentStatus;
  }
  if (options.countryCode) {
    where.countryCode = options.countryCode;
  }
  if (options.consultationType) {
    where.consultationType = options.consultationType;
  }

  const q = options.search?.trim();
  if (q && q.length > 0) {
    const term = q.slice(0, 120);
    where.OR = [
      { fullName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
    ];
  }

  // Doctor-name filter. Relation filter on `doctor` (not a raw subquery) —
  // a null doctorId never matches a relation filter, so undoctored
  // appointments drop out exactly like the old `IN (...)` did.
  const dn = options.doctorName?.trim();
  if (dn && dn.length > 0) {
    const term = dn.slice(0, 120);
    where.doctor = {
      OR: [
        { fullName: { contains: term, mode: "insensitive" } },
        { loginUser: { email: { contains: term, mode: "insensitive" } } },
      ],
    };
  }

  // Date/time range. Match on the scheduled slot, or on createdAt when the
  // row is still unscheduled — mirrors the doctor queue so a brand-new
  // booking without a slot still falls inside its booking day.
  const dateFrom = parseRangeBound(options.dateFrom, false);
  const dateTo = parseRangeBound(options.dateTo, true);
  if (dateFrom || dateTo) {
    const scheduledRange: Prisma.DateTimeFilter = {};
    if (dateFrom) scheduledRange.gte = dateFrom;
    if (dateTo) scheduledRange.lte = dateTo;
    const createdRange: Prisma.DateTimeFilter = {};
    if (dateFrom) createdRange.gte = dateFrom;
    if (dateTo) createdRange.lte = dateTo;

    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { scheduledAt: { not: null, ...scheduledRange } },
          { scheduledAt: null, createdAt: createdRange },
        ],
      },
    ];
  }

  return where;
}

export async function listAppointments(options: ListAppointmentsOptions): Promise<ListAppointmentsResult> {
  const page = Math.max(1, options.page);
  const pageSize = Math.min(100, Math.max(1, options.pageSize));
  const where = buildAppointmentWhereClause(options);

  try {
    const total = await prisma.appointment.count({ where });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
    const offset = (effectivePage - 1) * pageSize;

    const rows = await prisma.appointment.findMany({
      where,
      select: {
        id: true,
        countryCode: true,
        consultationType: true,
        fullName: true,
        email: true,
        phone: true,
        notes: true,
        status: true,
        scheduledAt: true,
        meetingUrl: true,
        paymentStatus: true,
        amountCents: true,
        currencyCode: true,
        createdAt: true,
        updatedAt: true,
        doctorId: true,
        doctor: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: offset,
    });

    const items = rows.map((row) => ({
      id: row.id,
      country: row.countryCode,
      consultationType: row.consultationType,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      notesPreview: row.notes ? row.notes.slice(0, 140) : null,
      status: row.status as string,
      createdAt: row.createdAt.toISOString(),
      scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
      doctorId: row.doctorId,
      doctorName: row.doctor?.fullName ?? null,
    }));

    return {
      items,
      pagination: {
        page: effectivePage,
        pageSize,
        total,
        totalPages,
      },
    };
  } catch (error) {
    throw normalizeDbError(error, "Appointments are temporarily unavailable");
  }
}

export async function getAppointmentById(id: string): Promise<AdminAppointmentDetail | null> {
  try {
    const row = await prisma.appointment.findUnique({
      where: { id },
      // Live catalogue service name as a fallback for the booked-line
      // snapshot below (appointments booked without an order line).
      select: { ...ADMIN_APPT_SELECT, service: { select: { name: true } } },
    });
    if (!row) return null;

    // Resolve the linked order (for the deep-link) and the booked service
    // name (the immutable OrderItem snapshot the patient actually paid for).
    // Both best-effort — a legacy/manual appointment may have neither.
    const [orders, bookedLine] = await Promise.all([
      mapAppointmentOrders([id]),
      prisma.orderItem.findFirst({
        where: { appointmentId: id, kind: { in: CONSULTATION_KINDS } },
        select: { name: true },
      }),
    ]);
    const order = orders.get(id) ?? null;

    const { service, ...appointmentFields } = row;
    return {
      ...toAdminAppointment(appointmentFields as AppointmentRecord),
      orderId: order?.orderId ?? null,
      orderNumber: order?.orderNumber ?? null,
      serviceName: bookedLine?.name ?? service?.name ?? null,
    };
  } catch (error) {
    throw normalizeDbError(error, "Appointments are temporarily unavailable");
  }
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<AdminAppointmentDetail | null> {
  try {
    const current = await prisma.appointment.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!current) return null;
    if ((current.status as string) === status) {
      return getAppointmentById(id);
    }
    assertValidStatusTransition(current.status as AppointmentStatus, status);
    await prisma.appointment.update({
      where: { id },
      data: {
        status: status as PrismaAppointmentStatus,
        updatedAt: new Date(),
        ...(status === "COMPLETED" ? { consultationCompletedAt: new Date() } : {}),
      },
    });
    // Corporate lifecycle hook: COMPLETED pre-assessment activates the
    // employee (+ benefit card); COMPLETED/CANCELLED request appointments
    // update the CorporateServiceRequest. Fire-and-forget — corporate
    // bookkeeping must never fail the status change itself. Dynamic import
    // avoids a module cycle (corporate-status → emails → … → appointments).
    void import("../corporate/corporate-status.service.js")
      .then((m) => m.onCorporateAppointmentStatusChanged(id, status))
      .catch(() => {});
    return getAppointmentById(id);
  } catch (error) {
    if (
      error instanceof InvalidAppointmentStatusTransitionError ||
      error instanceof UnrecognizedAppointmentStatusError
    ) {
      throw error;
    }
    throw normalizeDbError(error, "Appointments are temporarily unavailable");
  }
}

export async function listAppointmentsForUser(userId: string): Promise<AccountAppointmentListItem[]> {
  try {
    const rows = await prisma.appointment.findMany({
      where: { userId },
      select: {
        ...ADMIN_APPT_SELECT,
        patientTimezone: true,
        clinic: { select: { name: true, city: true } },
        doctor: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const orderNumbers = await mapAppointmentOrderNumbers(rows.map((r) => r.id));

    return rows.map((row) => ({
      id: row.id,
      countryCode: row.countryCode,
      consultationType: row.consultationType,
      status: row.status as string,
      scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
      meetingUrl: row.meetingUrl,
      paymentStatus: row.paymentStatus as string,
      amountCents: row.amountCents,
      currencyCode: row.currencyCode,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      notesPreview: row.notes ? row.notes.slice(0, 140) : null,
      consultationMode: row.consultationMode,
      clinicName: row.clinic?.name ?? null,
      clinicCity: row.clinic?.city ?? null,
      locationAddress: row.locationAddress,
      patientTimezone: row.patientTimezone ?? null,
      doctorName: row.doctor?.fullName ?? null,
      orderNumber: orderNumbers.get(row.id) ?? null,
    }));
  } catch (error) {
    throw normalizeDbError(error, "Appointments are temporarily unavailable");
  }
}

export async function getAppointmentForUser(
  id: string,
  userId: string,
): Promise<AccountAppointmentDetail | null> {
  try {
    const row = await prisma.appointment.findFirst({
      where: { id, userId },
      select: {
        id: true,
        countryCode: true,
        consultationType: true,
        fullName: true,
        email: true,
        phone: true,
        notes: true,
        status: true,
        scheduledAt: true,
        meetingUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      countryCode: row.countryCode,
      consultationType: row.consultationType,
      status: row.status as string,
      scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
      meetingUrl: row.meetingUrl,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      notes: row.notes,
    };
  } catch (error) {
    throw normalizeDbError(error, "Appointments are temporarily unavailable");
  }
}

export class AppointmentNotOwnedError extends Error {
  constructor() {
    super("Appointment not found");
    this.name = "AppointmentNotOwnedError";
  }
}

/**
 * Patient self-service cancel. Reuses the same validated status transition
 * (`updateAppointmentStatus` → `assertValidStatusTransition`) and slot-release
 * pattern already used by the doctor-side cancel/reschedule path
 * (`doctor-actions.route.ts`) — no new cancellation logic, just a
 * patient-owned entry point into it.
 */
export async function cancelAppointmentForPatient(
  id: string,
  userId: string,
): Promise<AccountAppointmentDetail | null> {
  const owned = await prisma.appointment.findFirst({
    where: { id, userId },
    select: { id: true, timeSlotId: true, status: true },
  });
  if (!owned) throw new AppointmentNotOwnedError();

  if (owned.status === "CANCELLED") {
    return getAppointmentForUser(id, userId);
  }

  assertValidStatusTransition(owned.status as AppointmentStatus, "CANCELLED");

  if (owned.timeSlotId) {
    await releaseAppointmentSlot(id).catch(() => undefined);
  }

  await updateAppointmentStatus(id, "CANCELLED");
  return getAppointmentForUser(id, userId);
}

/**
 * Cancel every consultation appointment attached to an order (used when the
 * order is CANCELLED or REFUNDED). For each non-terminal appointment: release
 * its slot back to the base grid, then flip status → CANCELLED. Idempotent and
 * best-effort — a single appointment failing never blocks the others. Cancelled
 * appointments drop off the admin + doctor calendars (both exclude CANCELLED).
 */
export async function cancelOrderAppointments(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      appointmentIds: true,
      orderAppointments: { select: { appointmentId: true } },
      items: { select: { appointmentId: true } },
    },
  });
  if (!order) return;

  const ids = new Set<string>();
  for (const id of order.appointmentIds) if (id) ids.add(id);
  for (const oa of order.orderAppointments) if (oa.appointmentId) ids.add(oa.appointmentId);
  for (const it of order.items) if (it.appointmentId) ids.add(it.appointmentId);

  for (const id of ids) {
    try {
      const appt = await prisma.appointment.findUnique({
        where: { id },
        select: { status: true, timeSlotId: true },
      });
      if (!appt) continue;
      if (appt.status === "CANCELLED" || appt.status === "COMPLETED") continue;
      if (appt.timeSlotId) {
        await releaseAppointmentSlot(id).catch(() => undefined);
      }
      await updateAppointmentStatus(id, "CANCELLED");
    } catch {
      // best-effort per appointment
    }
  }
}

/**
 * Minimal detail needed to drive the reschedule picker: which doctor is
 * assigned (so the frontend fetches that doctor's availability) and the
 * currently-held slot (so the picker can show "your current time").
 */
export async function getAppointmentForReschedule(
  id: string,
  userId: string,
): Promise<{
  id: string;
  status: string;
  doctorId: string | null;
  doctorSlug: string | null;
  countryCode: string;
  timeSlotId: string | null;
  scheduledAt: string | null;
} | null> {
  const row = await prisma.appointment.findFirst({
    where: { id, userId },
    select: {
      id: true,
      status: true,
      doctorId: true,
      countryCode: true,
      timeSlotId: true,
      scheduledAt: true,
      doctor: { select: { slug: true } },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    status: row.status as string,
    doctorId: row.doctorId,
    doctorSlug: row.doctor?.slug ?? null,
    countryCode: row.countryCode,
    timeSlotId: row.timeSlotId,
    scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
  };
}

/**
 * Patient self-service reschedule: swap the appointment onto a new OPEN
 * slot belonging to the SAME doctor. Same status gate as cancel (only a
 * request that hasn't reached a terminal state can move), plus the slot
 * must not already be past its transition rules — but reschedule itself
 * isn't a status change, so `assertValidStatusTransition` isn't invoked;
 * we reuse `CANCELLED` as the reference transition purely to check the
 * current status is still "live" (mirrors the cancel guard).
 *
 * Atomic: claim the new slot (OPEN -> BOOKED), release the old slot
 * (BOOKED -> OPEN), and repoint the Appointment's timeSlotId/scheduledAt,
 * all inside one `$transaction` so a race-loser can't leave the patient
 * holding zero slots.
 */
export async function rescheduleAppointmentForPatient(
  id: string,
  userId: string,
  newTimeSlotId: string,
): Promise<AccountAppointmentDetail | null> {
  const owned = await prisma.appointment.findFirst({
    where: { id, userId },
    select: { id: true, timeSlotId: true, status: true, doctorId: true, scheduledAt: true },
  });
  if (!owned) throw new AppointmentNotOwnedError();

  // Same "still live" gate as cancel: only a non-terminal status can be
  // rescheduled. Terminal statuses (CANCELLED/COMPLETED) have no outgoing
  // transitions at all, so probing against CANCELLED is a reliable stand-in
  // for "is this appointment still active" without inventing a second matrix.
  assertValidStatusTransition(owned.status as AppointmentStatus, "CANCELLED");

  // The held time must still be in the future. An unscheduled request
  // (scheduledAt === null) has nothing to be late for, so it stays open.
  if (owned.scheduledAt && owned.scheduledAt.getTime() <= Date.now()) {
    throw new AppointmentAlreadyStartedError();
  }

  if (owned.timeSlotId === newTimeSlotId) {
    // No-op reschedule onto the same slot — return current state as-is.
    return getAppointmentForUser(id, userId);
  }

  // Preserve the consultation's length across the move: read the old booked
  // slot's span so the new claim consumes the same number of minutes, and so
  // we can re-materialise base slots over the freed span afterwards.
  const oldSlot = owned.timeSlotId
    ? await prisma.doctorTimeSlot.findUnique({
        where: { id: owned.timeSlotId },
        select: { startAt: true, endAt: true },
      })
    : null;
  const preserveMinutes = oldSlot
    ? Math.round((oldSlot.endAt.getTime() - oldSlot.startAt.getTime()) / 60_000)
    : null;

  await prisma.$transaction(async (tx) => {
    const claimed = await claimConsecutiveSlots(tx, newTimeSlotId, preserveMinutes);
    if (owned.doctorId && claimed.doctorId !== owned.doctorId) {
      throw new RescheduleDoctorMismatchError();
    }
    await tx.appointment.update({
      where: { id },
      data: {
        timeSlotId: newTimeSlotId,
        scheduledAt: claimed.startAt,
        doctorId: claimed.doctorId,
      },
    });
    // Old slot is now detached — delete the collapsed row; base slots are
    // re-materialised over its span below (outside the txn).
    if (owned.timeSlotId) {
      await tx.doctorTimeSlot.deleteMany({ where: { id: owned.timeSlotId } });
    }
  });

  if (oldSlot && owned.doctorId) {
    await ensureSlotsForRange(owned.doctorId, oldSlot.startAt, oldSlot.endAt);
  }

  return getAppointmentForUser(id, userId);
}

/**
 * Admin-only: schedule (or reschedule) the call. `scheduledAt` can be a
 * Date (set the slot), `null` (clear it), or `undefined` (leave alone).
 * Same semantics for `meetingUrl`. Returns the updated row, or `null` if
 * the appointment doesn't exist.
 *
 * Side-effects: the caller is expected to fire the schedule-confirmation
 * email after a successful update.
 */
export async function scheduleAppointment(
  id: string,
  input: {
    scheduledAt?: Date | null;
    meetingUrl?: string | null;
    doctorId?: string | null;
    consultationMode?: "ONLINE" | "IN_PERSON";
    clinicId?: string | null;
    locationAddress?: string | null;
  },
): Promise<AdminAppointmentDetail | null> {
  // Build the update payload from only the provided fields. Unchecked input
  // lets us set the scalar relation FKs (doctorId, clinicId) directly. Using
  // the typed ORM update removes the hand-built SQL SET clause entirely so a
  // future field addition can never become a string-interpolation injection
  // sink.
  const data: Prisma.AppointmentUncheckedUpdateInput = {};
  if (input.scheduledAt !== undefined) data.scheduledAt = input.scheduledAt;
  if (input.meetingUrl !== undefined) data.meetingUrl = input.meetingUrl;
  if (input.doctorId !== undefined) data.doctorId = input.doctorId;
  if (input.consultationMode !== undefined) data.consultationMode = input.consultationMode;
  if (input.clinicId !== undefined) data.clinicId = input.clinicId;
  if (input.locationAddress !== undefined) {
    // Normalise empty string to null so DB columns stay consistent
    // ("no override" should be NULL, not "").
    data.locationAddress = input.locationAddress === "" ? null : input.locationAddress;
  }
  if (Object.keys(data).length === 0) {
    return getAppointmentById(id);
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({ where: { id }, data });
      // Mirror the doctor onto the consultation order line(s) so the
      // post-payment reminder cron — which resolves its recipient from
      // `OrderItem.doctorId` — follows every reassignment instead of
      // messaging the originally-booked doctor.
      if (input.doctorId !== undefined) {
        await tx.orderItem.updateMany({
          where: { appointmentId: id, kind: { in: CONSULTATION_KINDS } },
          data: { doctorId: input.doctorId },
        });
      }
    });
    return getAppointmentById(id);
  } catch (error) {
    // P2025 = record to update not found — preserve the previous
    // null-on-missing contract instead of surfacing a 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw normalizeDbError(error, "Appointments are temporarily unavailable");
  }
}
