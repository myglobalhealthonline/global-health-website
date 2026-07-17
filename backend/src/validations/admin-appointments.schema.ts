import { z } from "zod";
import { consultationTypeSchema, countryCodeSchema } from "./shared.schema.js";

export const appointmentStatusValues = [
  "REQUEST_RECEIVED",
  "UNDER_REVIEW",
  "CONTACTED",
  "CANCELLED",
  "COMPLETED",
] as const;

const appointmentIdSchema = z
  .string()
  .trim()
  .min(8, "Invalid appointment id")
  .max(40, "Invalid appointment id")
  .regex(
    /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|c[a-z0-9]{20,30})$/i,
    "Invalid appointment id",
  );

export const appointmentIdParamsSchema = z.object({
  id: appointmentIdSchema,
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
    /**
     * Optional Doctor.id to assign / reassign / clear. Once set, the
     * doctor portal at /doctor scopes queries by `doctorId = self`.
     */
    doctorId: z.union([z.string().trim().min(8).max(40), z.null()]).optional(),
    /**
     * Delivery mode. Cart-flow + manual creation default the row to
     * ONLINE; this lets admin flip the row to IN_PERSON (which unlocks
     * the clinic picker + the "Where" block on the patient view + the
     * in-person reminder cron) and back.
     */
    consultationMode: z.enum(["ONLINE", "IN_PERSON"]).optional(),
    /**
     * In-person consults: soft FK to a known Clinic row, OR free-text
     * `locationAddress` for off-grid venues. Route handler enforces
     * "exactly one" when consultationMode = IN_PERSON.
     */
    clinicId: z.union([z.string().trim().min(8).max(40), z.null()]).optional(),
    locationAddress: z
      .union([z.string().trim().min(1).max(500), z.literal(""), z.null()])
      .optional(),
  })
  .refine(
    (data) =>
      data.scheduledAt !== undefined ||
      data.meetingUrl !== undefined ||
      data.doctorId !== undefined ||
      data.consultationMode !== undefined ||
      data.clinicId !== undefined ||
      data.locationAddress !== undefined,
    {
      message:
        "Provide at least scheduledAt, meetingUrl, doctorId, consultationMode, clinicId, or locationAddress",
    },
  )
  .refine(
    (data) =>
      !(
        data.clinicId !== undefined &&
        data.clinicId !== null &&
        data.locationAddress !== undefined &&
        data.locationAddress !== null &&
        data.locationAddress !== ""
      ),
    {
      message: "Provide a clinic OR a location address, not both.",
      path: ["locationAddress"],
    },
  );

export type ScheduleAppointmentBody = z.infer<typeof scheduleAppointmentBodySchema>;

/**
 * Admin order-page appointment update (doctor + time only). Requires a
 * reason shown in patient/doctor notifications. At least one of
 * `scheduledAt` or `doctorId` must be sent; the route/service rejects
 * no-op saves where neither value differs from the current row.
 */
export const updateAppointmentBodySchema = z
  .object({
    scheduledAt: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .optional(),
    doctorId: z.union([z.string().trim().min(8).max(40), z.null()]).optional(),
    changeReason: z.string().trim().min(10, "Reason must be at least 10 characters").max(500),
  })
  .refine(
    (data) => data.scheduledAt !== undefined || data.doctorId !== undefined,
    {
      message: "Provide at least scheduledAt or doctorId",
    },
  );

export type UpdateAppointmentBody = z.infer<typeof updateAppointmentBodySchema>;

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
  /**
   * Free-text doctor filter. Matched (case-insensitive substring) against
   * the assigned doctor's full name and — when linked — the doctor's login
   * email. Composes with every other filter via AND. Appointments with no
   * assigned doctor are excluded when this is set.
   */
  doctorName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value === undefined || value === "" ? undefined : value)),
  /**
   * Date/time range on the appointment's scheduled slot (falls back to
   * createdAt when the row is still unscheduled). Accepts a plain date
   * (`YYYY-MM-DD`) or an `<input type="datetime-local">` value
   * (`YYYY-MM-DDTHH:mm`). Interpreted as UTC to match stored instants.
   */
  dateFrom: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/, "dateFrom must be YYYY-MM-DD or YYYY-MM-DDTHH:mm")
      .optional(),
  ),
  dateTo: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/, "dateTo must be YYYY-MM-DD or YYYY-MM-DDTHH:mm")
      .optional(),
  ),
});

/**
 * Body for admin-initiated manual appointment creation. The admin is
 * filling in the booking form on behalf of a walk-in / phone-in
 * patient, so we collect the patient identity + the appointment slot
 * + the consultation mode in one shot. The route layer then upserts
 * a patient User account, generates a unique temp password, fires a
 * payment link via Stripe, and emails the patient with both CTAs.
 */
export const createManualAppointmentBodySchema = z
  .object({
    patient: z
      .object({
        email: z.string().trim().toLowerCase().email("Invalid patient email").max(254),
        fullName: z.string().trim().min(2).max(120),
        // Required + international format. The admin form builds this from a
        // dial-code dropdown + national number, so it always arrives as
        // "+<code> <number>" (e.g. "+353 871234567"). Spaces are tolerated;
        // WhatsApp/SMS normalization strips them downstream.
        phone: z
          .string()
          .trim()
          .regex(
            /^\+[1-9]\d{0,3}[\s-]?\d{6,14}$/,
            "Phone must include a country code, e.g. +353 871234567",
          ),
        dateOfBirth: z.string().trim().max(40).optional().nullable(),
        nationalIdNumber: z.string().trim().max(64).optional().nullable(),
        taxIdNumber: z.string().trim().max(64).optional().nullable(),
        passportNumber: z.string().trim().max(64).optional().nullable(),
        // PT-only Número de Utente — optional even in Portugal.
        utenteNumber: z.string().trim().max(64).optional().nullable(),
        addressLine1: z.string().trim().max(200).optional().nullable(),
        addressCity: z.string().trim().max(100).optional().nullable(),
        addressCountryCode: z.string().trim().max(8).optional().nullable(),
      })
      .strict(),
    serviceId: z.string().trim().min(1).max(60),
    // Doctor is now required: a manual booking always claims one of the
    // doctor's real open slots, so there is always an assigned doctor.
    doctorId: z.string().trim().min(1).max(60),
    // Id of the doctor's OPEN DoctorTimeSlot the admin picked. The service
    // claims it (OPEN → HELD) and derives scheduledAt from the slot — the
    // admin no longer types a free-text time.
    timeSlotId: z.string().trim().min(1).max(120),
    // Consultation length in minutes. Defaults to the service's duration
    // when omitted; the booking dialog can override it. Consumes consecutive
    // base slots covering this span.
    durationMinutes: z.number().int().min(5).max(240).optional(),
    consultationMode: z.enum(["ONLINE", "IN_PERSON"]).default("ONLINE"),
    clinicId: z.string().trim().min(1).max(60).optional().nullable(),
    locationAddress: z.string().trim().max(500).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
    countryCode: countryCodeSchema,
    /** Booking under an insurer — the server re-derives the insurance price and
     *  requires the doctor to be in that insurer's network for the service. */
    insuranceCompanyId: z.string().trim().min(1).max(64).optional().nullable(),
    insurancePolicyNumber: z.string().trim().max(120).optional().nullable(),
    returnTo: z
      .string()
      .trim()
      .max(200)
      .regex(/^\/[a-z0-9/-]*$/i, "returnTo must start with /")
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.consultationMode !== "IN_PERSON") return true;
      return Boolean(
        (data.clinicId && data.clinicId.length > 0) ||
          (data.locationAddress && data.locationAddress.length > 0),
      );
    },
    {
      message:
        "In-person appointments need a clinic or a location address.",
      path: ["clinicId"],
    },
  )
  .refine(
    (data) =>
      !(
        data.clinicId &&
        data.clinicId.length > 0 &&
        data.locationAddress &&
        data.locationAddress.length > 0
      ),
    {
      message: "Provide a clinic OR a location address, not both.",
      path: ["locationAddress"],
    },
  );

export type CreateManualAppointmentBody = z.infer<typeof createManualAppointmentBodySchema>;

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type AdminAppointmentsQuery = z.infer<typeof adminAppointmentsQuerySchema>;
