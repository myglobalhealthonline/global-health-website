import { randomUUID } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import type { BookingInput } from "../../validations/booking.schema.js";
import type { AppointmentStatus } from "../../validations/admin-appointments.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";

export async function createAppointmentRequest(input: BookingInput) {
  try {
    const id = randomUUID();

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "Appointment"
          ("id", "countryCode", "consultationType", "fullName", "email", "phone", "notes", "consentAccepted", "status", "createdAt", "updatedAt")
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `,
      id,
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

export async function listAppointments(): Promise<AdminAppointmentListItem[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<AppointmentRecord[]>(`
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
      ORDER BY "createdAt" DESC
      LIMIT 200
    `);

    return rows.map((row) => ({
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
    throw normalizeDbError(error, "Appointments are temporarily unavailable");
  }
}
