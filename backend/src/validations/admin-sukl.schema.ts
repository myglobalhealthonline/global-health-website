import { z } from "zod";

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
