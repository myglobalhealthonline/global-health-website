import { z } from "zod";
import {
  consultationTypeSchema,
  countryCodeSchema,
  emailSchema,
  fullNameSchema,
  optionalNotesSchema,
  optionalPhoneSchema,
} from "./shared.schema.js";

export const bookingSchema = z.object({
  country: countryCodeSchema,
  consultationType: consultationTypeSchema,
  fullName: fullNameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  notes: optionalNotesSchema,
  consentAccepted: z.literal(true, {
    errorMap: () => ({
      message: "Consent is required before submitting a booking request",
    }),
  }),
  // Optional Service catalogue link. When set we resolve the slug to the
  // service row and copy its price/currency onto the appointment so the
  // Stripe Checkout session has everything it needs without a second look-up.
  serviceSlug: z.string().trim().max(120).optional(),
  /**
   * Optional concrete DoctorTimeSlot.id the patient picked at booking.
   * Set when the booking form arrives from a doctor profile + the user
   * clicked a calendar slot. The backend atomically claims the slot
   * (`UPDATE … WHERE status='OPEN'`) inside the same transaction as the
   * Appointment insert; conflict = 409 with `slot_taken`.
   */
  timeSlotId: z.string().trim().min(8).max(40).optional(),
  /**
   * Patient date of birth as `YYYY-MM-DD`. Optional at the schema layer
   * because not every country requires it; `BookingSetting.requireDateOfBirth`
   * is enforced in the route handler so the error message can mention
   * the specific country's rule.
   */
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format")
    .optional()
    .or(z.literal("")),
});

export type BookingInput = z.infer<typeof bookingSchema>;
