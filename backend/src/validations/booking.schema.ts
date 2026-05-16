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
});

export type BookingInput = z.infer<typeof bookingSchema>;
