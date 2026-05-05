import { z } from "zod";

export const assetKindSchema = z.enum(["IMAGE", "ICON", "LOGO", "BADGE", "SOCIAL"]);

export type AdminAssetKind = z.infer<typeof assetKindSchema>;

export const KINDS_REQUIRING_ALT: AdminAssetKind[] = ["IMAGE", "ICON", "LOGO", "BADGE"];

/** https URLs or absolute site paths; rejects javascript:, data:, http:, and unsafe relative paths. */
export const assetPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine((v) => !/^javascript:/i.test(v) && !/^data:/i.test(v), {
    message: "Path uses a forbidden URL scheme",
  })
  .refine((v) => !/^http:\/\//i.test(v), {
    message: "Only https:// or absolute paths starting with / are allowed",
  })
  .refine(
    (v) =>
      /^https:\/\//i.test(v) ||
      (v.startsWith("/") && !/[\s<>"]/.test(v)),
    {
      message: "Path must be an https:// URL or an absolute path starting with /",
    },
  );

export const adminAssetsQuerySchema = z.object({
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
  kind: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    assetKindSchema.optional(),
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

export type AdminAssetsQuery = z.infer<typeof adminAssetsQuerySchema>;

export const assetIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const adminAssetFieldsSchema = z.object({
  countryId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.string().trim().min(1).nullable(),
  ),
  doctorId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.string().trim().min(1).nullable(),
  ),
  kind: assetKindSchema,
  key: z.string().trim().min(1).max(200),
  path: assetPathSchema,
  altText: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  usageNote: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  isActive: z.boolean().optional(),
});

export const adminAssetCreateBodySchema = adminAssetFieldsSchema.superRefine((data, ctx) => {
  if (KINDS_REQUIRING_ALT.includes(data.kind)) {
    const a = data.altText;
    if (a === null || a === undefined || String(a).trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "altText is required for this asset kind",
        path: ["altText"],
      });
    }
  }
});

export type AdminAssetCreateBody = z.infer<typeof adminAssetCreateBodySchema>;

export const adminAssetUpdateBodySchema = adminAssetFieldsSchema.partial();

export type AdminAssetUpdateBody = z.infer<typeof adminAssetUpdateBodySchema>;
