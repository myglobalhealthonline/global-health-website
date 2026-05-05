import { randomUUID } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import type { BookingInput } from "../../validations/booking.schema.js";
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
