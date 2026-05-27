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
  /**
   * GDPR consent — two independent boolean acks. Both are required by
   * the new cart-first flow (validated at the route layer below so we
   * can return a country-aware error message). Kept optional at the
   * schema layer so the legacy `BookingFormTemplate` direct-submit
   * surface keeps working until that template is retired.
   * - clinic: share with treating clinic/doctor for this consultation
   * - platform: platform processing for service improvement + comms
   */
  gdprConsentClinic: z.boolean().optional(),
  gdprConsentPlatform: z.boolean().optional(),
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
  /**
   * Country-specific national ID (NIF / PPS / CPF / CNP / DNI / Rodné číslo).
   * Optional at schema layer; route handler enforces per-country via
   * `BookingSetting.requireNationalId`. Country-specific format validation
   * (e.g. CNP regex for RO) also happens in the route handler so we can
   * surface a country-aware error message.
   */
  nationalIdNumber: z.string().trim().min(3).max(50).optional().or(z.literal("")),
  /**
   * IANA timezone string captured from the patient's browser at booking
   * time via `Intl.DateTimeFormat().resolvedOptions().timeZone`. Stored
   * on Appointment.patientTimezone for downstream rendering. Optional —
   * if absent we fall back to the booking country's default timezone.
   */
  patientTimezone: z.string().trim().min(1).max(64).optional(),
  /**
   * Structured address fields — required when `BookingSetting.requireAddress`
   * is on (defaults true for RX-eligible markets). Validated at schema
   * layer only for max length; route handler enforces presence.
   */
  addressLine1: z.string().trim().max(120).optional().or(z.literal("")),
  addressLine2: z.string().trim().max(120).optional().or(z.literal("")),
  addressCity: z.string().trim().max(80).optional().or(z.literal("")),
  addressPostalCode: z.string().trim().max(20).optional().or(z.literal("")),
  addressCountryCode: z
    .string()
    .trim()
    .length(2)
    .toLowerCase()
    .optional()
    .or(z.literal("")),
});

export type BookingInput = z.infer<typeof bookingSchema>;

/**
 * Country-specific national-ID validators. Keyed by lowercase country
 * code matching `Country.code`. Each entry returns true if the supplied
 * value matches the country's expected ID format. Used by the route
 * handler when `BookingSetting.requireNationalId` is true and an ID
 * value was submitted.
 */
export const NATIONAL_ID_VALIDATORS: Record<
  string,
  { label: string; valid: (raw: string) => boolean }
> = {
  // Romania — CNP: 13 digits, first digit encodes sex/century (1–9).
  rm: {
    label: "CNP",
    valid: (raw) => /^[1-9]\d{12}$/.test(raw.replace(/\s+/g, "")),
  },
  // Ireland — PPS number: 7 digits + 1–2 letters (last is checksum).
  ie: {
    label: "PPS number",
    valid: (raw) => /^\d{7}[A-Za-z]{1,2}$/.test(raw.replace(/\s+/g, "")),
  },
  // Portugal — NIF: 9 digits.
  pt: {
    label: "NIF",
    valid: (raw) => /^\d{9}$/.test(raw.replace(/\s+/g, "")),
  },
  // Spain — DNI (8 digits + letter) or NIE (X/Y/Z + 7 digits + letter).
  sp: {
    label: "DNI / NIE",
    valid: (raw) => {
      const s = raw.replace(/\s+/g, "").toUpperCase();
      return /^\d{8}[A-Z]$/.test(s) || /^[XYZ]\d{7}[A-Z]$/.test(s);
    },
  },
  // Czechia — Rodné číslo: 9 or 10 digits, optionally split by `/`.
  cz: {
    label: "Rodné číslo",
    valid: (raw) => /^\d{6}\/?\d{3,4}$/.test(raw.replace(/\s+/g, "")),
  },
};
