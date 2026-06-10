import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type { BookingInput } from "../../validations/booking.schema.js";
import type { AppointmentStatus } from "../../validations/admin-appointments.schema.js";
import {
  assertValidStatusTransition,
  InvalidAppointmentStatusTransitionError,
  UnrecognizedAppointmentStatusError,
} from "./appointment-status-transitions.js";
import { normalizeDbError } from "../shared/db-errors.js";
import {
  claimDoctorSlot,
  SlotAlreadyTakenError,
} from "../doctor-availability/doctor-availability.service.js";

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
    patientTimezone: nullify(input.patientTimezone),
    addressLine1: nullify(input.addressLine1),
    addressLine2: nullify(input.addressLine2),
    addressCity: nullify(input.addressCity),
    addressPostalCode: nullify(input.addressPostalCode),
    addressCountryCode: nullify(input.addressCountryCode),
    gdprConsentClinic: input.gdprConsentClinic === true,
    gdprConsentPlatform: input.gdprConsentPlatform === true,
    gdprConsentedAt: bothConsents ? new Date() : null,
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
    let serviceForBooking: { id: string } | null = null;
    if (input.serviceSlug) {
      serviceForBooking = await prisma.service.findFirst({
        where: {
          slug: input.serviceSlug,
          isActive: true,
          country: { code: input.country, isActive: true },
        },
        select: { id: true },
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
        const claimed = await claimDoctorSlot(tx, input.timeSlotId as string);
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
};

export type ListAppointmentsResult = {
  items: AdminAppointmentListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

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
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function buildAppointmentWhereClause(options: ListAppointmentsOptions): Prisma.Sql {
  const parts: Prisma.Sql[] = [];

  if (options.status) {
    // Compare as text so this is valid whether "status" is the enum
    // ("AppointmentStatus") or still text during the conversion boot.
    parts.push(Prisma.sql`"status"::text = ${options.status}`);
  }
  if (options.countryCode) {
    parts.push(Prisma.sql`"countryCode" = ${options.countryCode}`);
  }
  if (options.consultationType) {
    parts.push(Prisma.sql`"consultationType" = ${options.consultationType}`);
  }

  const q = options.search?.trim();
  if (q && q.length > 0) {
    const term = q.slice(0, 120);
    parts.push(Prisma.sql`(
      strpos(lower("fullName"), lower(${term})) > 0
      OR strpos(lower("email"), lower(${term})) > 0
      OR strpos(lower(coalesce("phone", '')), lower(${term})) > 0
    )`);
  }

  if (parts.length === 0) {
    return Prisma.sql``;
  }

  return Prisma.sql`WHERE ${Prisma.join(parts, " AND ")}`;
}

export async function listAppointments(options: ListAppointmentsOptions): Promise<ListAppointmentsResult> {
  const page = Math.max(1, options.page);
  const pageSize = Math.min(100, Math.max(1, options.pageSize));
  const where = buildAppointmentWhereClause(options);

  try {
    const countRows = await prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "Appointment"
      ${where}
    `);
    const total = Number(countRows[0]?.count ?? 0n);
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
    const offset = (effectivePage - 1) * pageSize;

    const rows = await prisma.$queryRaw<AppointmentRecord[]>(Prisma.sql`
      SELECT
        "id",
        "countryCode",
        "consultationType",
        "fullName",
        "email",
        "phone",
        "notes",
        "status",
        "scheduledAt",
        "meetingUrl",
        "paymentStatus",
        "amountCents",
        "currencyCode",
        "createdAt",
        "updatedAt"
      FROM "Appointment"
      ${where}
      ORDER BY "createdAt" DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    const items = rows.map((row) => ({
      id: row.id,
      country: row.countryCode,
      consultationType: row.consultationType,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      notesPreview: row.notes ? row.notes.slice(0, 140) : null,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
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
    const rows = await prisma.$queryRawUnsafe<AppointmentRecord[]>(
      `
        SELECT
          "id",
          "countryCode",
          "consultationType",
          "fullName",
          "email",
          "phone",
          "notes",
          "status",
          "scheduledAt",
          "meetingUrl",
          "paymentStatus",
          "amountCents",
          "currencyCode",
          "consultationMode",
          "clinicId",
          "locationAddress",
          "createdAt",
          "updatedAt"
        FROM "Appointment"
        WHERE "id" = $1
        LIMIT 1
      `,
      id,
    );

    if (rows.length === 0) return null;
    return toAdminAppointment(rows[0]);
  } catch (error) {
    throw normalizeDbError(error, "Appointments are temporarily unavailable");
  }
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<AdminAppointmentDetail | null> {
  try {
    const currentRows = await prisma.$queryRawUnsafe<AppointmentRecord[]>(
      `
        SELECT
          "id",
          "countryCode",
          "consultationType",
          "fullName",
          "email",
          "phone",
          "notes",
          "status",
          "scheduledAt",
          "meetingUrl",
          "paymentStatus",
          "amountCents",
          "currencyCode",
          "consultationMode",
          "clinicId",
          "locationAddress",
          "createdAt",
          "updatedAt"
        FROM "Appointment"
        WHERE "id" = $1
        LIMIT 1
      `,
      id,
    );

    if (currentRows.length === 0) return null;

    const current = currentRows[0];
    if (current.status === status) {
      return toAdminAppointment(current);
    }

    assertValidStatusTransition(current.status, status);

    const completedAtClause =
      status === "COMPLETED" ? ', "consultationCompletedAt" = NOW()' : "";

    const rows = await prisma.$queryRawUnsafe<AppointmentRecord[]>(
      `
        UPDATE "Appointment"
        -- status is a Postgres enum ("AppointmentStatus"); cast the text
        -- bind param explicitly so this works whether the column is still
        -- text (pre-conversion boot) or already the enum.
        SET "status" = $2::"AppointmentStatus", "updatedAt" = NOW()${completedAtClause}
        WHERE "id" = $1
        RETURNING
          "id",
          "countryCode",
          "consultationType",
          "fullName",
          "email",
          "phone",
          "notes",
          "status",
          "scheduledAt",
          "meetingUrl",
          "paymentStatus",
          "amountCents",
          "currencyCode",
          "consultationMode",
          "clinicId",
          "locationAddress",
          "createdAt",
          "updatedAt"
      `,
      id,
      status,
    );

    if (rows.length === 0) return null;
    return toAdminAppointment(rows[0]);
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
    const rows = await prisma.$queryRawUnsafe<AppointmentRecord[]>(
      `
        SELECT
          a."id",
          a."countryCode",
          a."consultationType",
          a."fullName",
          a."email",
          a."phone",
          a."notes",
          a."status",
          a."scheduledAt",
          a."meetingUrl",
          a."paymentStatus",
          a."amountCents",
          a."currencyCode",
          a."consultationMode",
          a."clinicId",
          a."locationAddress",
          a."patientTimezone",
          a."createdAt",
          a."updatedAt",
          c."name" AS "clinicName",
          c."city" AS "clinicCity"
        FROM "Appointment" a
        LEFT JOIN "Clinic" c ON c."id" = a."clinicId"
        WHERE a."userId" = $1
        ORDER BY a."createdAt" DESC
        LIMIT 200
      `,
      userId,
    );

    return rows.map((row) => ({
      id: row.id,
      countryCode: row.countryCode,
      consultationType: row.consultationType,
      status: row.status,
      scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
      meetingUrl: row.meetingUrl,
      paymentStatus: row.paymentStatus,
      amountCents: row.amountCents,
      currencyCode: row.currencyCode,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      notesPreview: row.notes ? row.notes.slice(0, 140) : null,
      consultationMode: row.consultationMode,
      clinicName: row.clinicName ?? null,
      clinicCity: row.clinicCity ?? null,
      locationAddress: row.locationAddress,
      patientTimezone: row.patientTimezone ?? null,
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
    const rows = await prisma.$queryRawUnsafe<AppointmentRecord[]>(
      `
        SELECT
          "id",
          "countryCode",
          "consultationType",
          "fullName",
          "email",
          "phone",
          "notes",
          "status",
          "scheduledAt",
          "meetingUrl",
          "paymentStatus",
          "amountCents",
          "currencyCode",
          "consultationMode",
          "clinicId",
          "locationAddress",
          "createdAt",
          "updatedAt"
        FROM "Appointment"
        WHERE "id" = $1 AND "userId" = $2
        LIMIT 1
      `,
      id,
      userId,
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      countryCode: row.countryCode,
      consultationType: row.consultationType,
      status: row.status,
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
    await prisma.appointment.update({ where: { id }, data });
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
