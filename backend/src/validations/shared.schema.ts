import { z } from "zod";

/**
 * Country code accepted by public endpoints. Earlier this was a hardcoded
 * enum of the five seeded countries — admins could create new Country
 * rows but bookings + filters for those new codes would 400 here. We now
 * accept any 2–8 char lowercase identifier and let downstream code
 * (`getPublicCountryByCode`, the country-scoped routes) do the actual
 * existence check against the DB — that returns 404 for unknown codes
 * with a clearer message.
 *
 * Length cap is loose enough for any real ISO 3166-1 alpha-2 or alpha-3
 * code plus internal-only short codes; the regex stops obviously bogus
 * inputs from reaching SQL.
 */
export const countryCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Country code must be at least 2 characters")
  .max(8, "Country code is too long")
  .regex(/^[a-z][a-z0-9-]*$/, "Country code must be lowercase letters/digits/hyphens, starting with a letter");

// Consultation intent on the booking form. Must stay in sync with the
// dropdown options in `frontend/lib/content/booking-page-data.ts` and
// the `?type=` URL params emitted by site CTAs (GP consultation,
// specialist, prescription review, health test, follow-up).
export const consultationTypeSchema = z.enum([
  "general",
  "specialist",
  "prescription",
  "health-test",
  "follow-up",
]);

export const optionalPhoneSchema = z
  .string()
  .trim()
  .min(6, "Phone must be at least 6 characters")
  .max(32, "Phone is too long")
  .optional()
  .or(z.literal(""));

export const optionalNotesSchema = z
  .string()
  .trim()
  .max(2000, "Notes are too long")
  .optional()
  .or(z.literal(""));

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address");

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Full name must be at least 2 characters")
  .max(120, "Full name is too long");
