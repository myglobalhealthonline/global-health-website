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
    doctorId: z.string().trim().max(120).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();
