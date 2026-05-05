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
});

export type BookingInput = z.infer<typeof bookingSchema>;
