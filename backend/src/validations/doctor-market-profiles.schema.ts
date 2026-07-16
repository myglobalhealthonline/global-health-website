import { z } from "zod";
import { localeCodeSchema } from "./admin-countries.schema.js";
import { isValidBic, isValidIban } from "../utils/iban.js";

const nullableTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => {
      if (v === undefined) return undefined;
      return v === "" || v === null ? null : v;
    });

export const doctorMarketParamsSchema = z.object({
  doctorId: z.string().trim().min(1).max(64),
  countryId: z.string().trim().min(1).max(64),
});

export const adminDoctorMarketTranslationSchema = z
  .object({
    locale: localeCodeSchema,
    title: nullableTrimmed(160),
    bio: nullableTrimmed(12000),
    seoTitle: nullableTrimmed(160),
    seoDescription: nullableTrimmed(320),
    seoKeywords: z
      .array(z.string().trim().min(1).max(80))
      .max(20)
      .optional()
      .default([]),
  })
  .strict();

const bankInputSchema = z
  .object({
    accountHolder: nullableTrimmed(160),
    bic: z
      .string()
      .trim()
      .max(16)
      .optional()
      .nullable()
      .transform((v) => {
        if (v === undefined) return undefined;
        return v === "" || v === null ? null : v;
      })
      .refine((v) => v == null || isValidBic(v), { message: "Invalid BIC/SWIFT" }),
    iban: z
      .string()
      .trim()
      .max(42)
      .optional()
      .nullable()
      .transform((v) => {
        if (v === undefined) return undefined;
        return v === "" || v === null ? null : v;
      })
      .refine((v) => v == null || isValidIban(v), { message: "Invalid IBAN" }),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one bank field to update",
  });

export const adminDoctorMarketPatchBodySchema = z
  .object({
    active: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
    chamberEntity: nullableTrimmed(64),
    registrationNumber: nullableTrimmed(64),
    // https-only so the value can render as <a href> without sanitisation.
    registrationUrl: nullableTrimmed(500).refine(
      (v) => v == null || /^https:\/\//i.test(v),
      { message: "Registration URL must start with https://" },
    ),
    division: nullableTrimmed(120),
    isVerified: z.boolean().optional(),
    translations: z.array(adminDoctorMarketTranslationSchema).max(6).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

export type AdminDoctorMarketPatchBody = z.infer<typeof adminDoctorMarketPatchBodySchema>;

export const doctorMarketPatchBodySchema = z
  .object({
    chamberEntity: nullableTrimmed(64),
    registrationNumber: nullableTrimmed(64),
    division: nullableTrimmed(120),
    translations: z
      .array(
        z
          .object({
            locale: localeCodeSchema,
            bio: nullableTrimmed(12000),
          })
          .strict(),
      )
      .max(6)
      .optional(),
    bank: bankInputSchema.optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

export type DoctorMarketPatchBody = z.infer<typeof doctorMarketPatchBodySchema>;
