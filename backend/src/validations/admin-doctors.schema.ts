import { ServiceKind } from "@prisma/client";
import { z } from "zod";
import { serviceSlugSchema, validateUniqueLocales } from "./admin-services.schema.js";
import { localeCodeSchema } from "./admin-countries.schema.js";

/** Same URL-safe rules as services (lowercase a-z, 0-9, hyphens). */
export const doctorSlugSchema = serviceSlugSchema;

// socialUrlSchema moved to shared.schema.ts — both Doctor + CountryFooter
// social URLs use the same https:// + max-length + null-on-empty shape.
import { socialUrlSchema } from "./shared.schema.js";
export { socialUrlSchema };

/** HTTPS URLs or site-relative paths starting with `/`. */
export const profileImageRefSchema = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? null : val),
  z
    .union([z.null(), z.string().trim().min(1).max(2000)])
    .refine(
      (v) =>
        v === null ||
        /^https:\/\//i.test(v) ||
        (v.startsWith("/") && !/[\s<>"]/.test(v)),
      {
        message:
          "Profile image must be an https:// URL or a path starting with / (no spaces or unsafe characters)",
      },
    ),
);

/** Percent-based crop focal point (0-100) + zoom (1-3x) for doctor photos. */
export const focalPointSchema = z.coerce.number().int().min(0).max(100);
export const zoomSchema = z.coerce.number().min(1).max(3);

export const adminDoctorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Admin duplicate-check UIs fetch up to 250 rows in one country.
  pageSize: z.coerce.number().int().min(1).max(250).default(20),
  countryId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).optional(),
  ),
  countryCode: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).max(8).optional(),
  ),
  serviceKind: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.nativeEnum(ServiceKind).optional(),
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

export type AdminDoctorsQuery = z.infer<typeof adminDoctorsQuerySchema>;

export const doctorIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
});

const nullableTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v));

/** Per-locale CMS content for a doctor (professional title + bio + SEO).
 *  fullName + qualifications are NOT translated. */
const doctorTranslationEntrySchema = z.object({
  locale: localeCodeSchema,
  title: z.string().trim().min(1).max(200),
  bio: nullableTrimmed(12000),
  seoTitle: nullableTrimmed(160),
  seoDescription: nullableTrimmed(320),
});

export type DoctorTranslationInput = z.infer<typeof doctorTranslationEntrySchema>;

const adminDoctorBaseObject = z.object({
  countryId: z.string().trim().min(1),
  slug: doctorSlugSchema,
  fullName: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  bio: z
    .string()
    .trim()
    .max(12000)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  imcRegistration: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  whatsappNumber: z
    .string()
    .trim()
    .max(32)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  // Optional social profile URLs. Validated as URLs AND restricted to
  // https:// (no javascript:, data:, or http:) so the value can be
  // safely rendered as <a href={...}> without sanitisation. Empty
  // string clears the link.
  instagramUrl: socialUrlSchema,
  facebookUrl: socialUrlSchema,
  linkedinUrl: socialUrlSchema,
  medicalRegistrationUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  qualifications: z
    .array(z.string().trim().min(1).max(200))
    .max(20)
    .default([]),
  languages: z
    .array(z.string().trim().min(1).max(64))
    .max(20)
    .default([]),
  specialtyIds: z.array(z.string().trim().min(1)).default([]),
  /**
   * Additional country listings. The PRIMARY country lives on `countryId`
   * above; these are extra countries the same doctor profile should appear
   * in. Empty array clears all extras. `undefined` leaves them untouched.
   */
  additionalCountryIds: z.array(z.string().trim().min(1)).optional(),
  profileImagePath: profileImageRefSchema.optional(),
  profileImageAltText: nullableTrimmed(500),
  profileImageTitle: nullableTrimmed(500),
  profileImageCaption: nullableTrimmed(1000),
  profileImageDescription: nullableTrimmed(2000),
  profileImageFocalX: focalPointSchema.optional(),
  profileImageFocalY: focalPointSchema.optional(),
  profileImageZoom: zoomSchema.optional(),
  active: z.boolean().optional(),
  /**
   * Per-doctor RBAC flag for the manual-entry CTA in their portal.
   * Default false on the schema — admin grants per doctor. ADMIN role
   * always bypasses this gate downstream.
   */
  canCreateManualAppointments: z.boolean().optional(),
  /**
   * SEO metadata for the public doctor profile page. Kept admin-managed
   * (not on the doctor's self-edit form) so changes can't break canonical
   * URL signals after the doctor has signed up.
   */
  seoTitle: z
    .string()
    .trim()
    .max(160)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  seoDescription: z
    .string()
    .trim()
    .max(320)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  /** Per-locale CMS content (title, bio, SEO). The default-locale entry
   *  mirrors the base fields above; backend upserts one DoctorTranslation
   *  row per entry. */
  translations: z.array(doctorTranslationEntrySchema).max(6).optional(),
});

export const adminDoctorCreateBodySchema = adminDoctorBaseObject.superRefine(
  (value, ctx) => validateUniqueLocales(value.translations, ctx),
);

export type AdminDoctorCreateBody = z.infer<typeof adminDoctorCreateBodySchema>;

export const adminDoctorUpdateBodySchema = adminDoctorBaseObject
  .partial()
  .superRefine((value, ctx) => validateUniqueLocales(value.translations, ctx));

export type AdminDoctorUpdateBody = z.infer<typeof adminDoctorUpdateBodySchema>;

/**
 * Body for `POST /api/admin/doctors/:id/invite`. Admin enters the
 * doctor's email; `fullName` is optional because the Doctor profile
 * already has one — supplied here just lets the admin override the
 * greeting in the invite email.
 */
export const doctorInviteBodySchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(200),
  fullName: z.string().trim().min(1).max(200).optional(),
});

export type DoctorInviteBody = z.infer<typeof doctorInviteBodySchema>;
