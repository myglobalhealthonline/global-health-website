import { z } from "zod";

/** Lowercase URL segment style: letters, numbers, hyphens (no leading/trailing hyphen). */
export const serviceSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase URL-safe (a-z, 0-9, hyphens)",
  });

const legacyPathFieldSchema = z.preprocess(
  (val) => (val === "" || val === undefined ? null : val),
  z.union([z.null(), z.string().trim().max(500)]),
).refine((v) => v === null || (typeof v === "string" && v.startsWith("/")), {
  message: "legacyPath must start with / when provided",
});

const positiveIntOrNull = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : val),
  z.coerce.number().int().positive().optional(),
);

const nonNegativeIntOrNull = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : val),
  z.coerce.number().int().min(0).optional(),
);

export const adminServicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  countryId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).optional(),
  ),
  countryCode: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).max(8).optional(),
  ),
  specialtyId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).optional(),
  ),
  isActive: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (v === "true" || v === true) return true;
    if (v === "false" || v === false) return false;
    return undefined;
  }, z.boolean().optional()),
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : v)),
});

export type AdminServicesQuery = z.infer<typeof adminServicesQuerySchema>;

export const serviceIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const adminSpecialtiesQuerySchema = z.object({
  countryId: z.string().trim().min(1, "countryId is required"),
});

export const adminServiceCreateBodySchema = z.object({
  countryId: z.string().trim().min(1),
  slug: serviceSlugSchema,
  name: z.string().trim().min(1).max(200),
  summary: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  legacyPath: legacyPathFieldSchema.optional(),
  specialtyId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.string().trim().min(1).nullable(),
  ),
  durationMinutes: positiveIntOrNull,
  basePriceCents: nonNegativeIntOrNull,
  currencyCode: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.string().trim().max(8).nullable(),
  ),
  isActive: z.boolean().optional(),
});

export type AdminServiceCreateBody = z.infer<typeof adminServiceCreateBodySchema>;

export const adminServiceUpdateBodySchema = adminServiceCreateBodySchema.partial();

export type AdminServiceUpdateBody = z.infer<typeof adminServiceUpdateBodySchema>;
