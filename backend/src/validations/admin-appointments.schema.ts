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

/**
 * Schedule the call. Each field is independently optional so the admin can
 * set just the slot, just the URL, or both. Sending `null` clears the
 * value; omitting it leaves the existing value alone. The URL is
 * white-listed to common video-meeting hosts so a typo can't land an
 * arbitrary link in a patient email.
 */
const meetingUrlSchema = z
  .string()
  .trim()
  .url("Meeting URL must be a full https:// link")
  .max(500)
  .refine(
    (value) => {
      try {
        const host = new URL(value).hostname.toLowerCase();
        return (
          host === "meet.google.com" ||
          host.endsWith(".meet.google.com") ||
          host === "zoom.us" ||
          host.endsWith(".zoom.us") ||
          host === "teams.microsoft.com" ||
          host.endsWith(".teams.microsoft.com") ||
          host === "whereby.com" ||
          host.endsWith(".whereby.com") ||
          host === "daily.co" ||
          host.endsWith(".daily.co")
        );
      } catch {
        return false;
      }
    },
    { message: "Meeting URL must point to Google Meet, Zoom, Teams, Whereby, or Daily" },
  );

export const scheduleAppointmentBodySchema = z
  .object({
    scheduledAt: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .optional(),
    meetingUrl: z.union([meetingUrlSchema, z.literal(""), z.null()]).optional(),
  })
  .refine(
    (data) => data.scheduledAt !== undefined || data.meetingUrl !== undefined,
    { message: "Provide at least scheduledAt or meetingUrl" },
  );

export type ScheduleAppointmentBody = z.infer<typeof scheduleAppointmentBodySchema>;

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
