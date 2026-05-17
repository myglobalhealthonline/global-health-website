import { LocaleCode } from "@prisma/client";
import { z } from "zod";

const localeValues = Object.values(LocaleCode) as [LocaleCode, ...LocaleCode[]];

export const localeCodeSchema = z.enum(localeValues);

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
    timezone: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

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
