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

export { InvalidAppointmentStatusTransitionError, UnrecognizedAppointmentStatusError };

export async function createAppointmentRequest(input: BookingInput) {
  return createAppointmentWithOptionalOwner(input);
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

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "Appointment"
          ("id", "userId", "countryCode", "consultationType", "fullName", "email", "phone", "notes", "consentAccepted", "status", "createdAt", "updatedAt")
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      `,
      id,
      options.userId ?? null,
      input.country,
      input.consultationType,
      input.fullName,
      input.email,
      input.phone || null,
      input.notes || null,
      input.consentAccepted,
      "REQUEST_RECEIVED",
    );

    return { id, status: "REQUEST_RECEIVED" };
  } catch (error) {
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
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: string;
  updatedAt: string;
};

export type AccountAppointmentListItem = {
  id: string;
  countryCode: string;
  consultationType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  fullName: string;
  email: string;
  phone: string | null;
  notesPreview: string | null;
};

export type AccountAppointmentDetail = {
  id: string;
  countryCode: string;
  consultationType: string;
  status: string;
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
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function buildAppointmentWhereClause(options: ListAppointmentsOptions): Prisma.Sql {
  const parts: Prisma.Sql[] = [];

  if (options.status) {
    parts.push(Prisma.sql`"status" = ${options.status}`);
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

    const rows = await prisma.$queryRawUnsafe<AppointmentRecord[]>(
      `
        UPDATE "Appointment"
        SET "status" = $2, "updatedAt" = NOW()
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
          "id",
          "countryCode",
          "consultationType",
          "fullName",
          "email",
          "phone",
          "notes",
          "status",
          "createdAt",
          "updatedAt"
        FROM "Appointment"
        WHERE "userId" = $1
        ORDER BY "createdAt" DESC
      `,
      userId,
    );

    return rows.map((row) => ({
      id: row.id,
      countryCode: row.countryCode,
      consultationType: row.consultationType,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      notesPreview: row.notes ? row.notes.slice(0, 140) : null,
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
