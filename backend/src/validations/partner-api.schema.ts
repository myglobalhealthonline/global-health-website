import { z } from "zod";
import { countryCodeSchema } from "./shared.schema.js";

/**
 * Request schemas for the partner booking API (`/api/partner/v1/*`).
 *
 * Kept separate from `admin-appointments.schema.ts` on purpose. That schema
 * describes a form an admin fills in; this one describes a contract an
 * external system codes against. They happen to overlap today, but they are
 * free to diverge — tightening a field for the admin UI must not silently
 * break every integrator, and vice versa.
 *
 * All bodies are `.strict()`: an unknown key is a 400 rather than a silent
 * no-op, so a partner typo'ing `doctor_id` finds out immediately instead of
 * wondering why their doctor selection is ignored.
 */

export const partnerCatalogParamsSchema = z.object({
  countryCode: countryCodeSchema,
});

export const partnerAvailabilityQuerySchema = z
  .object({
    countryCode: countryCodeSchema,
    /** `Service.id` from the catalogue call. */
    serviceId: z.string().trim().min(1).max(60),
    /** `Doctor.id` from the catalogue call. */
    doctorId: z.string().trim().min(1).max(60),
    // Matches the public availability feed's window. 30 days is enough for
    // any real booking horizon and bounds the slot materialisation cost.
    days: z.coerce.number().int().min(1).max(30).default(14),
  })
  .strict();

export const partnerCreateBookingBodySchema = z
  .object({
    countryCode: countryCodeSchema,
    serviceId: z.string().trim().min(1).max(60),
    doctorId: z.string().trim().min(1).max(60),
    /** `slots[].id` from the availability call. Claimed atomically — a
     *  replayed request gets 409, not a duplicate booking. */
    timeSlotId: z.string().trim().min(1).max(120),
    patient: z
      .object({
        email: z.string().trim().toLowerCase().email("Invalid patient email").max(254),
        fullName: z.string().trim().min(2).max(120),
        // Required and international. Downstream automation sends the
        // reservation + payment messages over WhatsApp/SMS, which cannot
        // work from a bare national number.
        phone: z
          .string()
          .trim()
          .regex(
            /^\+[1-9]\d{0,3}[\s-]?\d{6,14}$/,
            "Phone must include a country code, e.g. +353 871234567",
          ),
        dateOfBirth: z.string().trim().max(40).optional().nullable(),
        /**
         * Fiscal / taxpayer number, whatever the market calls it — NIF in
         * Portugal and Spain, CPF in Brazil, PPS in Ireland, CNP in Romania,
         * DIČ in Czechia. Deliberately ONE field rather than six
         * country-specific ones: the value is stored as supplied and read
         * back only for invoicing, so per-country columns would add
         * validation surface without changing behaviour.
         */
        taxIdNumber: z.string().trim().max(64).optional().nullable(),
        nationalIdNumber: z.string().trim().max(64).optional().nullable(),
        passportNumber: z.string().trim().max(64).optional().nullable(),
        /** Portugal only (Número de Utente). Optional even there. */
        utenteNumber: z.string().trim().max(64).optional().nullable(),
        /** Whole address as a single line — street, city and postcode. */
        address: z.string().trim().max(300).optional().nullable(),
      })
      .strict(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

export const createPartnerApiClientBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    /** Empty/omitted = the key may operate in every active country. */
    allowedCountryCodes: z.array(countryCodeSchema).max(50).optional().default([]),
  })
  .strict();

export type PartnerCreateBookingBody = z.infer<typeof partnerCreateBookingBodySchema>;
export type PartnerAvailabilityQuery = z.infer<typeof partnerAvailabilityQuerySchema>;
