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
    /** Overrides the service default. Consumes consecutive base slots. */
    durationMinutes: z.number().int().min(5).max(240).optional(),
    consultationMode: z.enum(["ONLINE", "IN_PERSON"]).default("ONLINE"),
    clinicId: z.string().trim().min(1).max(60).optional().nullable(),
    locationAddress: z.string().trim().max(500).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
    insuranceCompanyId: z.string().trim().min(1).max(64).optional().nullable(),
    insurancePolicyNumber: z.string().trim().max(120).optional().nullable(),
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
      message: "In-person appointments need a clinic or a location address.",
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

export const createPartnerApiClientBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    /** Empty/omitted = the key may operate in every active country. */
    allowedCountryCodes: z.array(countryCodeSchema).max(50).optional().default([]),
  })
  .strict();

export type PartnerCreateBookingBody = z.infer<typeof partnerCreateBookingBodySchema>;
export type PartnerAvailabilityQuery = z.infer<typeof partnerAvailabilityQuerySchema>;
