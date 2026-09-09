import { z } from "zod";

import { SUKL_SERVICES } from "../lib/sukl/config.js";

/**
 * Request schemas for the admin SÚKL console (`routes/admin-sukl.route.ts`).
 *
 * `suklProfessionalIdentifier` is validated only for shape and length. SÚKL has
 * not told us whether it is an IČP, a KRZP code or their own value, so a
 * narrower regex would reject legitimate input — see the open questions in
 * docs/sukl/SCOPE_CONFIRMATION.md. The character class is still restrictive
 * enough to keep the value out of trouble downstream.
 */

export const suklDoctorParamsSchema = z.object({
  doctorUserId: z.string().trim().min(1).max(120),
});

/**
 * WSDL retrieval. `path` is a PATH on the already-configured service host —
 * never a full URL, so this endpoint cannot be turned into a general-purpose
 * fetcher that reaches arbitrary hosts using our client certificate. It must
 * start with "/" and may not contain a scheme or authority.
 */
/** Shared path rule: a PATH on the already-configured service host, never a
 *  URL. This matters because these endpoints fetch using the facility's client
 *  certificate, so the parameter is the one place someone could try to aim that
 *  credential at another host. */
const suklPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .startsWith("/", "path must start with /")
  .refine((v) => !v.includes("//") && !/^\/\//.test(v), "path may not contain an authority")
  .refine((v) => !/[a-z][a-z0-9+.-]*:/i.test(v), "path may not contain a scheme");

/** AppPing. Defaults to the host root, where SÚKL's proxy serves the service —
 *  deliberately a DIFFERENT default from the WSDL reader's `/?wsdl`, since
 *  pinging the WSDL URL would be a category error. */
export const suklPingQuerySchema = z.object({
  service: z.enum(SUKL_SERVICES),
  path: suklPathSchema.optional().default("/"),
});

export const suklWsdlQuerySchema = z.object({
  service: z.enum(SUKL_SERVICES),
  path: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .startsWith("/", "path must start with /")
    .refine((v) => !v.includes("//") && !/^\/\//.test(v), "path may not contain an authority")
    .refine((v) => !/[a-z][a-z0-9+.-]*:/i.test(v), "path may not contain a scheme")
    .optional()
    // Default suits the WSDL reader; the ping route passes its own default.
    .default("/?wsdl"),
});

export const suklDoctorIdentityBodySchema = z
  .object({
    suklProfessionalIdentifier: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9._/-]+$/, "Only letters, digits and . _ / - are allowed"),
    suklUsernameOrReference: z.string().trim().max(120).nullable().optional(),
    specialityCode: z.string().trim().max(32).nullable().optional(),
    // Required by SÚKL on every prescription — see PRESCRIPTION_PAYLOAD.md.
    // Optional here so a mapping can be created before they are known, but the
    // prescription service refuses by name until they are set.
    phone: z.string().trim().max(20).nullable().optional(),
    icp: z
      .string()
      .trim()
      .regex(/^\d{8}$/, "IČP is 8 digits")
      .nullable()
      .optional(),
    pzs: z
      .string()
      .trim()
      .regex(/^\d{11}$/, "PZS is 11 digits")
      .nullable()
      .optional(),
    doctorId: z.string().trim().max(120).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

/**
 * Issuing a test prescription from the admin console.
 *
 * Deliberately strict about the things SÚKL constrain, so a bad value fails
 * here rather than becoming a rejected — and therefore ambiguous — create.
 */
export const suklIssuePrescriptionSchema = z.object({
  service: z.enum(SUKL_SERVICES).optional(),
  doctorUserId: z.string().trim().min(1),
  appointmentId: z.string().trim().min(1).optional(),
  patientUserId: z.string().trim().min(1).optional(),
  patient: z.object({
    surname: z.string().trim().min(1).max(100).optional(),
    givenNames: z.string().trim().min(1).max(100).optional(),
    dateOfBirth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    insuranceNumber: z.string().trim().regex(/^\d{9,10}$/).optional(),
    insurerCode: z.string().trim().regex(/^\d{3}$/).optional(),
    phone: z.string().trim().max(20).optional(),
    email: z.string().trim().email().max(256).optional(),
    // Required by SÚKL whenever the patient cannot be found in the population
    // register — see C018. City and postcode are the mandatory pair.
    address: z
      .object({
        street: z.string().trim().max(48).optional(),
        houseNumber: z.string().trim().max(5).optional(),
        orientationNumber: z.string().trim().max(4).optional(),
        city: z.string().trim().min(1).max(48),
        cityPart: z.string().trim().max(48).optional(),
        district: z.string().trim().max(32).optional(),
        postcode: z.string().trim().length(5),
      })
      .optional(),
  }),
  items: z
    .array(
      z.object({
        quantity: z.coerce.number().int().min(1).max(999),
        instructions: z.string().trim().min(1).max(80),
        reimbursement: z.enum(["PACIENT", "UHR1", "UHR2", "UHR3"]),
        medicineName: z.string().trim().min(1).max(146),
        medicineCode: z.string().trim().regex(/^\d{7}$/).optional(),
        atcCode: z.string().trim().max(7).optional(),
        form: z.string().trim().max(27).optional(),
        strength: z.string().trim().max(24).optional(),
        diagnosis: z.string().trim().max(5).optional(),
        doNotSubstitute: z.boolean().optional(),
        doseExceeded: z.boolean().optional(),
        // ID_LP_Zdroj — generated when absent.
        sourceItemId: z.string().trim().regex(/^\d{14}$/).optional(),
        unregistered: z.boolean().optional(),
      }),
    )
    .min(1),
  issuedOn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  validUntil: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().trim().max(1000).optional(),
  urgent: z.boolean().optional(),
});

export const suklCancelPrescriptionSchema = z.object({
  prescriptionId: z.string().trim().min(1),
  // SÚKL require a reason; an empty one is a rejected cancellation.
  reason: z.string().trim().min(1).max(1000),
  service: z.enum(SUKL_SERVICES).optional(),
});
