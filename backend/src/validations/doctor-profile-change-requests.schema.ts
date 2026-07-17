import { z } from "zod";
import { localeCodeSchema } from "./admin-countries.schema.js";

/**
 * Body for `POST /api/doctor/profile/change-requests` — a doctor proposing an
 * edit to one admin-locked field.
 *
 * `photo` is deliberately absent: a photo proposal needs the uploaded bytes, so
 * it is raised by the dedicated photo routes rather than accepted as JSON here.
 */

const nullableString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v === "" ? null : v));

const doctorNoteSchema = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .optional()
  .transform((v) => (v === "" ? null : v));

const countryIdSchema = z.string().trim().min(1).max(64);

export const doctorProfileChangeRequestBodySchema = z.discriminatedUnion("field", [
  z
    .object({
      field: z.literal("fullName"),
      value: z.string().trim().min(1).max(200),
      doctorNote: doctorNoteSchema,
    })
    .strict(),
  z
    .object({
      field: z.literal("qualifications"),
      value: z.array(z.string().trim().min(1).max(200)).max(20),
      doctorNote: doctorNoteSchema,
    })
    .strict(),
  z
    .object({
      field: z.literal("bio"),
      countryId: countryIdSchema,
      translations: z
        .array(
          z
            .object({
              locale: localeCodeSchema,
              bio: nullableString(12000),
            })
            .strict(),
        )
        .min(1)
        .max(6)
        .superRefine((entries, ctx) => {
          const seen = new Set<string>();
          entries.forEach((entry, index) => {
            if (seen.has(entry.locale)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Duplicate translation locale",
                path: [index, "locale"],
              });
            }
            seen.add(entry.locale);
          });
        }),
      doctorNote: doctorNoteSchema,
    })
    .strict(),
  z
    .object({
      field: z.literal("registration"),
      countryId: countryIdSchema,
      chamberEntity: nullableString(64),
      registrationNumber: nullableString(64),
      division: nullableString(120),
      doctorNote: doctorNoteSchema,
    })
    .strict(),
]);

export type DoctorProfileChangeRequestBody = z.infer<
  typeof doctorProfileChangeRequestBodySchema
>;

export const doctorProfileChangeRequestParamsSchema = z.object({
  requestId: z.string().trim().min(1).max(64),
});

/** Admin approve/reject. `markVerified` only applies to a `registration` change. */
export const adminDoctorProfileChangeReviewBodySchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
    reviewNote: z.string().trim().max(1000).nullable().optional(),
    markVerified: z.boolean().optional(),
  })
  .strict();

export type AdminDoctorProfileChangeReviewBody = z.infer<
  typeof adminDoctorProfileChangeReviewBodySchema
>;

export const adminDoctorProfileChangeParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
  requestId: z.string().trim().min(1).max(64),
});

export const pendingProfileChangeRequestsQuerySchema = z.object({
  countryCode: z.string().trim().min(1).max(8).optional(),
});
