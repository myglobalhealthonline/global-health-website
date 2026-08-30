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
  /**
   * GDPR: patient must confirm they understand that, if they travel /
   * receive care in another country, their medical file may be accessed
   * by that country's clinical team. Required true on every booking —
   * mirrors `consentAccepted` above.
   */
  crossBorderConsentAccepted: z.literal(true, {
    errorMap: () => ({
      message: "Cross-border medical file access consent is required before submitting a booking request",
    }),
  }),
  /** Who may access the patient's medical file. Defaults to the narrowest
   *  scope (treating doctor only) when not supplied by the form. */
  medicalAccessConsentScope: z
    .enum(["DIRECT", "COUNTRY_CLINIC", "GLOBAL_NETWORK"])
    .optional()
    .default("DIRECT"),
  /**
   * Optional opt-in to appointment updates + reminders via WhatsApp.
   * Never required — patient WhatsApp sends are skipped when false/absent.
   */
  whatsappConsent: z.boolean().optional(),
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
   * Alternative to `nationalIdNumber` — Brazil requires ONE of CPF/passport
   * (enforced in the route handler, same as `requireNationalId`).
   */
  passportNumber: z.string().trim().min(3).max(60).optional().or(z.literal("")),
  /**
   * Número de Utente — Portuguese SNS healthcare number. Shown only where
   * `BookingSetting.collectUtenteNumber` is on (PT). Never required: many
   * patients treated in Portugal have no utente number.
   */
  utenteNumber: z.string().trim().min(3).max(50).optional().or(z.literal("")),
  /**
   * IANA timezone string captured from the patient's browser at booking
   * time via `Intl.DateTimeFormat().resolvedOptions().timeZone`. Stored
   * on Appointment.patientTimezone for downstream rendering. Optional —
   * if absent we fall back to the booking country's default timezone.
   */
  patientTimezone: z.string().trim().min(1).max(64).optional(),
  /**
   * BCP-47 language code the patient selected in the booking flow (e.g. "en", "pt", "fr").
   * Stored on the appointment so doctor + admin know which language to use.
   */
  consultationLanguageCode: z.string().trim().min(2).max(10).optional(),
  /**
   * Structured address fields — required when `BookingSetting.requireAddress`
   * is on (defaults true for RX-eligible markets). Validated at schema
   * layer only for max length; route handler enforces presence.
   */
  addressLine1: z.string().trim().max(120).optional().or(z.literal("")),
  addressLine2: z.string().trim().max(120).optional().or(z.literal("")),
  addressCity: z.string().trim().max(80).optional().or(z.literal("")),
  /** State / province / federative unit. Only Brazil's form collects it
   *  (the two-letter UF); never required, so other markets are unchanged. */
  addressState: z.string().trim().max(80).optional().or(z.literal("")),
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

const isSpanishNationalId = (raw: string): boolean => {
  const s = raw.replace(/\s+/g, "").toUpperCase();
  return /^\d{8}[A-Z]$/.test(s) || /^[XYZ]\d{7}[A-Z]$/.test(s);
};

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
  es: {
    label: "DNI / NIE",
    valid: isSpanishNationalId,
  },
  sp: {
    label: "DNI / NIE",
    valid: isSpanishNationalId,
  },
  // Czechia — Rodné číslo: 9 or 10 digits, optionally split by `/`.
  cz: {
    label: "Rodné číslo",
    valid: (raw) => /^\d{6}\/?\d{3,4}$/.test(raw.replace(/\s+/g, "")),
  },
};

/**
 * Countries that require an identity document number at booking time, on top
 * of (and independent of) `BookingSetting.requireNationalId`.
 *
 *   br — the prescription needs ONE identifier to print, so CPF
 *        (`nationalIdNumber`) OR a passport number satisfies it.
 *   cz — Czech clinical records must carry a passport or ID-card number.
 *        The rodné číslo stays optional (many expats have none), so it does
 *        NOT satisfy this rule; only `passportNumber` does. That field is
 *        labelled "passport / ID card number" on the Czech booking form.
 *
 * Keyed by lowercase `Country.code`. Enforced OUTSIDE the `if (settings)`
 * block in both booking routes, so a country missing its BookingSetting row
 * can never silently skip it.
 */
const IDENTITY_DOCUMENT_RULES: Record<
  string,
  {
    accepts: Array<"nationalIdNumber" | "passportNumber">;
    message: string;
  }
> = {
  br: {
    accepts: ["nationalIdNumber", "passportNumber"],
    message: "Enter your CPF or your passport number to continue.",
  },
  cz: {
    accepts: ["passportNumber"],
    message: "Enter your passport or ID card number to continue.",
  },
};

/**
 * Returns the error message when the booking country demands an identity
 * document and none of the accepted fields carries one; null when satisfied
 * or when the country has no such rule.
 */
export function identityDocumentError(
  countryCode: string | null | undefined,
  patient: {
    nationalIdNumber?: string | null;
    passportNumber?: string | null;
  } | null | undefined,
): string | null {
  const rule = IDENTITY_DOCUMENT_RULES[(countryCode ?? "").trim().toLowerCase()];
  if (!rule) return null;
  const satisfied = rule.accepts.some((field) => patient?.[field]?.trim());
  return satisfied ? null : rule.message;
}
