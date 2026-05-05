import { z } from "zod";

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

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
