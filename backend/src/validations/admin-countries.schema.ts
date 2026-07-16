import { LocaleCode, LegalDocumentType } from "@prisma/client";
import { z } from "zod";

const localeValues = Object.values(LocaleCode) as [LocaleCode, ...LocaleCode[]];

export const localeCodeSchema = z.enum(localeValues);

/** True when the Node runtime recognizes the IANA zone. Rejects typos that
 *  the admin timezone dropdown can't produce but a hand-crafted API call
 *  could. Dependency-free + self-updating as the tz database evolves. */
function isValidIanaTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const countryIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Country id is required"),
});

const routePathSchema = z
  .string()
  .trim()
  .min(1, "Path is required")
  .refine((value) => value.startsWith("/"), {
    message: "Paths must start with /",
  })
  .refine((value) => !value.includes(" "), {
    message: "Paths cannot contain spaces",
  });

const domainEntrySchema = z.object({
  domain: z.string().trim().min(1).max(253),
  isPrimary: z.boolean().optional(),
});

function refineLocalesDefault(data: { defaultLocale: LocaleCode; supportedLocales: LocaleCode[] }, ctx: z.RefinementCtx) {
  if (!data.supportedLocales.includes(data.defaultLocale)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "defaultLocale must be included in supportedLocales",
      path: ["defaultLocale"],
    });
  }
}

function refineUniqueLocales(locales: LocaleCode[], ctx: z.RefinementCtx, pathPrefix: string) {
  if (new Set(locales).size !== locales.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "supportedLocales must not contain duplicates",
      path: [pathPrefix],
    });
  }
}

function refineDomains(domains: z.infer<typeof domainEntrySchema>[] | undefined, ctx: z.RefinementCtx) {
  if (!domains?.length) return;
  const primary = domains.filter((d) => d.isPrimary === true);
  if (primary.length > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At most one domain may be marked primary",
      path: ["domains"],
    });
  }
}

export const adminCountryCreateBodySchema = z
  .object({
    code: z.string().trim().min(1).max(32),
    name: z.string().trim().min(1).max(200),
    slug: z.string().trim().min(1).max(120),
    legacyHomePath: routePathSchema,
    teamPath: routePathSchema,
    generalConsultationPath: routePathSchema,
    specialistConsultationPath: routePathSchema,
    defaultLocale: localeCodeSchema,
    supportedLocales: z.array(localeCodeSchema).min(1, "At least one supported locale is required"),
    currencyId: z.string().trim().min(1, "currencyId is required"),
    isActive: z.boolean().optional(),
    domains: z.array(domainEntrySchema).optional(),
  })
  .superRefine((data, ctx) => {
    refineLocalesDefault(data, ctx);
    refineUniqueLocales(data.supportedLocales, ctx, "supportedLocales");
    refineDomains(data.domains, ctx);
  });

export type AdminCountryCreateBody = z.infer<typeof adminCountryCreateBodySchema>;

/** Per-country BookingSetting fields. All optional + partial — admin
 *  can flip just one toggle without sending the full object. */
const bookingSettingPartialSchema = z
  .object({
    bookingEnabled: z.boolean().optional(),
    requirePhone: z.boolean().optional(),
    requireDateOfBirth: z.boolean().optional(),
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .refine(isValidIanaTimeZone, { message: "Unknown IANA timezone" })
      .optional(),
  })
  .strict();

/** Country-scoped sidebar feature keys. Each one corresponds to a
 *  `/admin/<key>` route — see admin-shell COUNTRY_HREFS. The "Pages"
 *  (country-features) controller is intentionally NOT in this list,
 *  because the visibility toggle for *other* features must itself be
 *  always reachable. */
export const COUNTRY_FEATURE_KEYS = [
  "country-home",
  "country-content",
  "pages",
  "footer",
  "services",
  "general-consultations",
  "specialist-consultations",
  "online-prescriptions",
  "health-tests",
  "appointments",
  // Monthly subscription plans (Wave 0). Strict opt-in — a country only
  // offers subscriptions when this key is explicitly added (§36.15).
  "subscriptions",
] as const;

const countryFeatureKeySchema = z.enum(COUNTRY_FEATURE_KEYS);

export const adminCountryUpdateBodySchema = z
  .object({
    code: z.string().trim().min(1).max(32).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    slug: z.string().trim().min(1).max(120).optional(),
    legacyHomePath: routePathSchema.optional(),
    teamPath: routePathSchema.optional(),
    generalConsultationPath: routePathSchema.optional(),
    specialistConsultationPath: routePathSchema.optional(),
    defaultLocale: localeCodeSchema.optional(),
    supportedLocales: z.array(localeCodeSchema).min(1).optional(),
    currencyId: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
    domains: z.array(domainEntrySchema).optional(),
    bookingSetting: bookingSettingPartialSchema.optional(),
    enabledFeatures: z.array(countryFeatureKeySchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.supportedLocales !== undefined) {
      refineUniqueLocales(data.supportedLocales, ctx, "supportedLocales");
    }
    refineDomains(data.domains, ctx);
    if (data.defaultLocale !== undefined && data.supportedLocales !== undefined) {
      refineLocalesDefault(
        { defaultLocale: data.defaultLocale, supportedLocales: data.supportedLocales },
        ctx,
      );
    }
  });

export type AdminCountryUpdateBody = z.infer<typeof adminCountryUpdateBodySchema>;

const urlOrEmpty = z.string().trim().max(2048).url().or(z.literal("")).optional().nullable();
const emailOrEmpty = z.string().trim().max(320).email().or(z.literal("")).optional().nullable();
const textField = z.string().trim().max(2000).optional().nullable();

/** One per-locale override of the disclaimers. Both fields nullable — a row may
 *  fill just one (the other falls back to the default-locale base column). */
const disclaimerTranslationEntrySchema = z.object({
  locale: localeCodeSchema,
  shortDisclaimer: z.string().trim().max(5000).optional().nullable(),
  fullDisclaimer: z.string().trim().max(20000).optional().nullable(),
});

export type DisclaimerTranslationInput = z.infer<typeof disclaimerTranslationEntrySchema>;

export const countryLegalProfileBodySchema = z.object({
  legalCompanyName: textField,
  legalAddress: textField,
  publicPhones: z.array(z.string().trim().max(50)).max(10).optional(),
  publicEmails: z.array(z.string().trim().email().max(320)).max(10).optional(),
  supportEmail: emailOrEmpty,
  billingEmail: emailOrEmpty,
  companyRegistrationNumber: textField,
  taxVatNumber: textField,
  medicalRegistrationNumber: textField,
  healthcareLicenseDetails: textField,
  regulatorName: textField,
  regulatorWebsite: urlOrEmpty,
  providerRegistrationLabel: textField,
  providerRegistrationNumber: textField,
  providerRegistrationUrl: urlOrEmpty,
  emergencyNumber: textField,
  emergencyNotice: z.string().trim().max(1000).optional().nullable(),
  nonEmergencyHealthLine: textField,
  companyRegistryUrl: urlOrEmpty,
  medicalRegulatorUrl: urlOrEmpty,
  healthcareAuthorityUrl: urlOrEmpty,
  dataProtectionAuthorityUrl: urlOrEmpty,
  disputeResolutionUrl: urlOrEmpty,
  consumerProtectionUrl: urlOrEmpty,
  dataProtectionLawName: textField,
  dataProtectionPolicyTitle: textField,
  dpoName: textField,
  dpoEmail: emailOrEmpty,
  disputeBodyName: textField,
  disputeEmail: emailOrEmpty,
  disputePhone: textField,
  disputeProcessText: z.string().trim().max(5000).optional().nullable(),
  legalJurisdictionText: z.string().trim().max(5000).optional().nullable(),
  consumerRightsText: z.string().trim().max(5000).optional().nullable(),
  // Default-locale copy + fallback for the two disclaimers.
  shortDisclaimer: z.string().trim().max(5000).optional().nullable(),
  fullDisclaimer: z.string().trim().max(20000).optional().nullable(),
  // Per-locale overrides. One entry per non-default locale; each field falls
  // back to the base column above when null.
  disclaimerTranslations: z
    .array(disclaimerTranslationEntrySchema)
    .max(6)
    .optional()
    .superRefine((translations, ctx) => {
      if (!translations) return;
      const seen = new Set<LocaleCode>();
      translations.forEach((t, i) => {
        if (seen.has(t.locale)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "disclaimerTranslations must not contain duplicate locales",
            path: [i, "locale"],
          });
        }
        seen.add(t.locale);
      });
    }),
});

export type CountryLegalProfileBody = z.infer<typeof countryLegalProfileBodySchema>;

/**
 * Admin write payload for one non-default-locale override of the legal
 * profile's translatable trust-bar text. Mirrors
 * countryFooterTranslationUpsertSchema in country-footer.schema.ts. URLs,
 * numbers and IDs (regulatorWebsite, providerRegistrationNumber/Url,
 * emergencyNumber, …) are NOT translatable and stay on the base row only.
 */
export const countryLegalProfileTrustTranslationUpsertSchema = z.object({
  locale: localeCodeSchema,
  regulatorName: textField,
  providerRegistrationLabel: textField,
  emergencyNotice: z.string().trim().max(1000).optional().nullable(),
  dataProtectionLawName: textField,
});

export type CountryLegalProfileTrustTranslationUpsertInput = z.infer<
  typeof countryLegalProfileTrustTranslationUpsertSchema
>;

const legalDocumentTypeValues = Object.values(LegalDocumentType) as [LegalDocumentType, ...LegalDocumentType[]];

export const countryLegalDocumentBodySchema = z
  .object({
    type: z.enum(legalDocumentTypeValues),
    title: z.string().trim().min(1).max(300),
    content: z.string().trim().max(500000).optional().nullable(),
    pdfPath: z.string().trim().max(1000).optional().nullable(),
    isPublished: z.boolean().optional().default(false),
    locale: z.string().trim().min(2).max(10).optional().default("en"),
  })
  .superRefine((data, ctx) => {
    // A PUBLISHED legal document with neither rich-text content nor a PDF
    // would render as an empty public page — require a body to publish.
    // Drafts may be created with just a title and filled in later.
    if (!data.isPublished) return;
    const hasContent = Boolean(data.content && data.content.length > 0);
    const hasPdf = Boolean(data.pdfPath && data.pdfPath.length > 0);
    if (!hasContent && !hasPdf) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add rich-text content or a PDF attachment before publishing",
        path: ["content"],
      });
    }
  });

export type CountryLegalDocumentBody = z.infer<typeof countryLegalDocumentBodySchema>;

export const legalDocumentIdParamsSchema = z.object({
  id: z.string().trim().min(1),
  docId: z.string().trim().min(1),
});
