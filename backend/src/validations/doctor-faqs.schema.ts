import { z } from "zod";
import { localeCodeSchema } from "./admin-countries.schema.js";

const nullableTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => {
      if (v === undefined) return null;
      return v === "" || v === null ? null : v;
    });

export const doctorFaqIdParamsSchema = z.object({
  doctorId: z.string().trim().min(1).max(64),
});

export const doctorFaqEntrySchema = z
  .object({
    locale: localeCodeSchema,
    question: z.string().trim().min(1).max(500),
    answer: z.string().trim().min(1).max(4000),
    category: nullableTrimmed(120),
    sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();

export const doctorFaqsReplaceBodySchema = z
  .object({
    faqs: z.array(doctorFaqEntrySchema).max(100),
  })
  .strict();

export type DoctorFaqsReplaceBody = z.infer<typeof doctorFaqsReplaceBodySchema>;
