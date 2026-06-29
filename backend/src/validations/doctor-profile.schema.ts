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
    const hasWritableField = Object.entries(value).some(([key, entry]) => {
      if (key === "translations") {
        return Array.isArray(entry) && entry.length > 0;
      }
      return entry !== undefined;
    });
    if (!hasWritableField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one field to update",
      });
    }

    if (value.translations) {
      const seen = new Set<string>();
      value.translations.forEach((entry, index) => {
        if (seen.has(entry.locale)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate translation locale",
            path: ["translations", index, "locale"],
          });
        }
        seen.add(entry.locale);
      });
    }
  });

export type DoctorProfilePatchBody = z.infer<typeof profilePatchBodySchema>;
