import { z } from "zod";
import { localeCodeSchema } from "./admin-countries.schema.js";
import { isValidBic, isValidIban } from "../utils/iban.js";

const nullableTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v === "" ? null : v));

const doctorProfileTranslationSchema = z.object({
  locale: localeCodeSchema,
  bio: nullableTrimmed(12000),
});

/**
 * Identity fields a doctor may no longer write directly — they are what a
 * patient uses to judge who is treating them, so a change goes through
 * DoctorProfileChangeRequest and an admin approves it.
 *
 * These keys stay declared on the schema below rather than being dropped, so a
 * request carrying one fails with an explanation instead of `.strict()`'s bare
 * "unrecognized key".
 */
const APPROVAL_GATED_PROFILE_FIELDS: Record<string, string> = {
  fullName: "Full name",
  bio: "Bio",
  translations: "Bio",
  qualifications: "Qualifications",
};

export const profilePatchBodySchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    bio: nullableTrimmed(12000).optional(),
    qualifications: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
    languages: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
    whatsappNumber: z.string().trim().max(32).nullable().optional(),
    translations: z.array(doctorProfileTranslationSchema).max(6).optional(),
    // Payout bank details (doctor-managed). bankIban is only sent when the
    // doctor types a new one; blank/omitted means "keep current".
    bankAccountHolder: z.string().trim().max(160).nullable().optional(),
    bankBic: z
      .string()
      .trim()
      .max(16)
      .nullable()
      .optional()
      .refine((v) => v == null || v === "" || isValidBic(v), {
        message: "Invalid BIC/SWIFT",
      }),
    bankIban: z
      .string()
      .trim()
      .max(42)
      .optional()
      .refine((v) => v == null || v === "" || isValidIban(v), {
        message: "Invalid IBAN",
      }),
  })
  .strict()
  .superRefine((value, ctx) => {
    const record = value as Record<string, unknown>;
    for (const [key, label] of Object.entries(APPROVAL_GATED_PROFILE_FIELDS)) {
      if (record[key] === undefined) continue;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${label} needs admin approval — submit a change request instead of editing it here`,
      });
    }

    const hasWritableField = Object.entries(value).some(([key, entry]) => {
      if (key in APPROVAL_GATED_PROFILE_FIELDS) return false;
      return entry !== undefined;
    });
    if (!hasWritableField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one field to update",
      });
    }
  });

export type DoctorProfilePatchBody = z.infer<typeof profilePatchBodySchema>;

/**
 * What actually survives validation. The gated identity fields are rejected
 * above, so the route only ever sees the freely-editable contact + payout set.
 */
export type DoctorProfileSelfPatchBody = Pick<
  DoctorProfilePatchBody,
  "languages" | "whatsappNumber" | "bankAccountHolder" | "bankBic" | "bankIban"
>;
