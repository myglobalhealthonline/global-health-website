/**
 * Preview or apply the evidence-backed Ireland GENERAL service SEO updates.
 *
 *   node --import tsx scripts/patch-ireland-general-service-keywords.ts
 *   node --import tsx scripts/patch-ireland-general-service-keywords.ts \
 *     --apply --confirm=IE-GENERAL-SERVICE-KEYWORDS-2026-08-25
 *
 * Dry-run is the default. Apply requires the exact content-version token,
 * preserves operational/catalogue fields, and uses optimistic updatedAt
 * guards in one Serializable transaction.
 */
import { LocaleCode, Prisma, ServiceKind, ServiceVisibility } from "@prisma/client";

import {
  IRELAND_GENERAL_SERVICE_KEYWORD_VERSION,
  irelandGeneralServiceLocalizedSeoUpdates,
  irelandGeneralServiceSeoUpdates,
  type IrelandGeneralServiceLocalizedSeoUpdate,
  type IrelandGeneralServiceSeoUpdate,
} from "../src/content/ireland-general-service-keywords.js";
import {
  assertIrelandGeneralServiceKeywordApplyAuthorized,
  buildIrelandGeneralServiceKeywordTransactionOptions,
  buildOptimisticServiceTranslationWhere,
  buildOptimisticServiceWhere,
} from "../src/content/ireland-general-service-keyword-patch.js";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ie";
const LOCALES = [
  LocaleCode.EN,
  LocaleCode.PT,
  LocaleCode.ES,
  LocaleCode.CS,
  LocaleCode.RO,
  LocaleCode.DE,
] as const;
const APPLY = process.argv.includes("--apply");
const CONFIRMATION = process.argv
  .find((argument) => argument.startsWith("--confirm="))
  ?.slice("--confirm=".length);

type ServiceSnapshot = Readonly<{
  id: string;
  slug: string;
  updatedAt: Date;
  isActive: boolean;
  kind: ServiceKind;
  visibility: ServiceVisibility;
  seoTitle: string | null;
  seoDescription: string | null;
  heroTitle: string | null;
  seoKeywords: string[];
  translations: readonly Readonly<{
    id: string;
    locale: LocaleCode;
    updatedAt: Date;
    seoTitle: string | null;
    seoDescription: string | null;
    heroTitle: string | null;
  }>[];
}>;

type DesiredBase = Readonly<{
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  seoKeywords: string[];
}>;

type DesiredTranslation = Readonly<{
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
}>;

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function desiredBase(update: IrelandGeneralServiceSeoUpdate): DesiredBase {
  return {
    seoTitle: update.seoTitle,
    seoDescription: update.seoDescription,
    heroTitle: update.heroTitle,
    seoKeywords: [...update.seoKeywords],
  };
}

function desiredTranslation(
  update: IrelandGeneralServiceSeoUpdate | IrelandGeneralServiceLocalizedSeoUpdate,
): DesiredTranslation {
  return {
    seoTitle: update.seoTitle,
    seoDescription: update.seoDescription,
    heroTitle: update.heroTitle,
  };
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function changedFields(
  current: Record<string, unknown>,
  desired: Record<string, unknown>,
): string[] {
  return Object.entries(desired)
    .filter(([field, value]) => !valuesEqual(current[field], value))
    .map(([field]) => field);
}

async function main(): Promise<void> {
  assertIrelandGeneralServiceKeywordApplyAuthorized({
    apply: APPLY,
    confirmation: CONFIRMATION,
  });

  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} was not found.`);

  const slugs = irelandGeneralServiceSeoUpdates.map(({ slug }) => slug);
  const rows = (await prisma.service.findMany({
    where: { countryId: country.id, slug: { in: slugs } },
    select: {
      id: true,
      slug: true,
      updatedAt: true,
      isActive: true,
      kind: true,
      visibility: true,
      seoTitle: true,
      seoDescription: true,
      heroTitle: true,
      seoKeywords: true,
      translations: {
        where: { locale: { in: [...LOCALES] } },
        select: {
          id: true,
          locale: true,
          updatedAt: true,
          seoTitle: true,
          seoDescription: true,
          heroTitle: true,
        },
      },
    },
  })) as ServiceSnapshot[];

  const missing = slugs.filter((slug) => !rows.some((row) => row.slug === slug));
  if (missing.length > 0) {
    throw new Error(`Missing Ireland services: ${missing.join(", ")}`);
  }

  const prepared = irelandGeneralServiceSeoUpdates.map((update) => {
    const service = rows.find((row) => row.slug === update.slug);
    if (!service) throw new Error(`Missing service ${update.slug}.`);
    if (
      !service.isActive ||
      service.kind !== ServiceKind.GENERAL ||
      service.visibility !== ServiceVisibility.PUBLIC
    ) {
      throw new Error(`${update.slug} is not an active public GENERAL service.`);
    }

    const base = desiredBase(update);
    const desiredTranslations = [
      { locale: LocaleCode.EN, desired: desiredTranslation(update) },
      ...irelandGeneralServiceLocalizedSeoUpdates
        .filter(({ slug }) => slug === update.slug)
        .map((localized) => ({
          locale: LocaleCode[localized.locale],
          desired: desiredTranslation(localized),
        })),
    ];
    const translations = desiredTranslations.map(({ locale, desired }) => {
      const translation = service.translations.find((candidate) => candidate.locale === locale);
      if (!translation) throw new Error(`${update.slug} is missing the ${locale} translation.`);
      return {
        locale,
        translation,
        desired,
        fields: changedFields(translation as unknown as Record<string, unknown>, desired),
      };
    });
    return {
      update,
      service,
      translations,
      base,
      baseFields: changedFields(service as unknown as Record<string, unknown>, base),
    };
  });

  for (const item of prepared) {
    const fields = [
      ...item.baseFields.map((field) => `base.${field}`),
      ...item.translations.flatMap(({ locale, fields }) =>
        fields.map((field) => `${locale}.${field}`),
      ),
    ];
    writeLine(`${item.update.slug}: ${fields.length > 0 ? fields.join(", ") : "no changes"}`);
    const english = item.translations.find(({ locale }) => locale === LocaleCode.EN);
    writeLine(`  current title=${JSON.stringify(english?.translation.seoTitle ?? item.service.seoTitle)}`);
    writeLine(`  desired title=${JSON.stringify(item.update.seoTitle)}`);
  }

  if (!APPLY) {
    writeLine(
      `DRY-RUN ONLY. Review, then use --apply --confirm=${IRELAND_GENERAL_SERVICE_KEYWORD_VERSION}.`,
    );
    return;
  }

  await prisma.$transaction(
    async (transaction) => {
      for (const item of prepared) {
        if (item.baseFields.length === 0 && item.translations.every(({ fields }) => fields.length === 0)) {
          continue;
        }

        const serviceResult = await transaction.service.updateMany({
          where: buildOptimisticServiceWhere(item.service),
          data: item.base,
        });
        if (serviceResult.count !== 1) {
          throw new Error(`${item.update.slug} changed after preview; transaction rolled back.`);
        }

        for (const localized of item.translations) {
          if (localized.fields.length === 0) continue;
          const translationResult = await transaction.serviceTranslation.updateMany({
            where: buildOptimisticServiceTranslationWhere(localized.translation),
            data: localized.desired,
          });
          if (translationResult.count !== 1) {
            throw new Error(
              `${item.update.slug} ${localized.locale} translation changed after preview; transaction rolled back.`,
            );
          }
        }
      }
    },
    buildIrelandGeneralServiceKeywordTransactionOptions(
      Prisma.TransactionIsolationLevel.Serializable,
    ),
  );

  writeLine(
    `APPLIED ${IRELAND_GENERAL_SERVICE_KEYWORD_VERSION}. Prices, duration, doctors, booking, slugs and publication state were unchanged.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
