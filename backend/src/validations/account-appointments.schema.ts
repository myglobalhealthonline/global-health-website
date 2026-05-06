import { z } from "zod";

export const accountAppointmentIdParamSchema = z.object({
  id: z.string().trim().min(1, "Appointment id is required"),
});

export const accountAppointmentsQuerySchema = z.object({
  userId: z.string().trim().min(1).optional(),
});

export type AccountAppointmentIdParam = z.infer<typeof accountAppointmentIdParamSchema>;
export type AccountAppointmentsQuery = z.infer<typeof accountAppointmentsQuerySchema>;

