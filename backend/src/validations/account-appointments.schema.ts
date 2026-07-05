import { z } from "zod";

export const accountAppointmentIdParamSchema = z.object({
  id: z.string().trim().min(1, "Appointment id is required"),
});

export const accountAppointmentsQuerySchema = z.object({
  userId: z.string().trim().min(1).optional(),
});

// Body is empty today (reason is optional, for future use) — kept as its own
// schema so the cancel route follows the house Zod-validate-every-body rule
// even though there's nothing to validate yet.
export const accountAppointmentCancelBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const accountAppointmentRescheduleBodySchema = z.object({
  newTimeSlotId: z.string().trim().min(1, "New time slot is required"),
});

export type AccountAppointmentIdParam = z.infer<typeof accountAppointmentIdParamSchema>;
export type AccountAppointmentsQuery = z.infer<typeof accountAppointmentsQuerySchema>;
export type AccountAppointmentCancelBody = z.infer<typeof accountAppointmentCancelBodySchema>;
export type AccountAppointmentRescheduleBody = z.infer<typeof accountAppointmentRescheduleBodySchema>;

