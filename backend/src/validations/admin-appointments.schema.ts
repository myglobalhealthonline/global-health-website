import { z } from "zod";
import { consultationTypeSchema, countryCodeSchema } from "./shared.schema.js";

export const appointmentStatusValues = [
  "REQUEST_RECEIVED",
  "UNDER_REVIEW",
  "CONTACTED",
  "CANCELLED",
  "COMPLETED",
] as const;

export const appointmentIdParamsSchema = z.object({
  id: z.string().uuid("Invalid appointment id"),
});

export const appointmentStatusSchema = z.enum(appointmentStatusValues);

export const updateAppointmentStatusBodySchema = z.object({
  status: appointmentStatusSchema,
});

/** Query string for GET /api/admin/appointments (pagination + filters). */
export const adminAppointmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    appointmentStatusSchema.optional(),
  ),
  countryCode: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    countryCodeSchema.optional(),
  ),
  consultationType: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    consultationTypeSchema.optional(),
  ),
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value === undefined || value === "" ? undefined : value)),
});

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type AdminAppointmentsQuery = z.infer<typeof adminAppointmentsQuerySchema>;
