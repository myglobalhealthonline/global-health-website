/**
 * Preview or apply the reviewed Ireland doctor-profile and specialist-page
 * SEO metadata batch.
 *
 *   node --env-file=.env --import tsx scripts/patch-ireland-profile-specialist-keywords.ts
 *   node --env-file=.env --import tsx scripts/patch-ireland-profile-specialist-keywords.ts \
 *     --apply --confirm=IE-PROFILES-SPECIALISTS-2026-08-26
 *
 * Only SEO fields are written. Doctor titles/bios/FAQs and service prices,
 * durations, assignments, summaries, bodies, FAQs and publication state are
 * deliberately outside this script.
 */
import { LocaleCode, Prisma, ServiceKind, ServiceVisibility } from "@prisma/client";

import {
  irelandDoctorProfileKeywordMap,
  irelandDoctorProfileSeoUpdates,
} from "../src/content/ireland-doctor-profile-keywords.js";
import {
  assertIrelandDoctorMarketWritable,
  assertIrelandProfileSpecialistKeywordApplyAuthorized,
  buildIrelandProfileSpecialistKeywordTransactionOptions,
  buildOptimisticDoctorMarketTranslationWhere,
  buildOptimisticDoctorWhere,
  buildOptimisticSpecialistServiceTranslationWhere,
  buildOptimisticSpecialistServiceWhere,
  IRELAND_PROFILE_SPECIALIST_KEYWORD_VERSION,
} from "../src/content/ireland-profile-specialist-keyword-patch.js";
import {
  irelandSpecialistServiceLocalizedSeoUpdates,
  irelandSpecialistServiceSeoUpdates,
} from "../src/content/ireland-specialist-service-keywords.js";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const CONFIRMATION = process.argv
  .find((argument) => argument.startsWith("--confirm="))
  ?.slice("--confirm=".length);
const COUNTRY_CODE = "ie";
const LOCALES = [
  LocaleCode.EN,
  LocaleCode.PT,
  LocaleCode.ES,
  LocaleCode.CS,
  LocaleCode.RO,
  LocaleCode.DE,
] as const;

type DoctorPrepared = Readonly<{
  doctor: Readonly<{ id: string; slug: string; active: boolean; updatedAt: Date }>;
  market: Readonly<{ id: string; active: boolean }>;
  translations: readonly Readonly<{
    row: Readonly<{
      id: string;
      locale: LocaleCode;
      updatedAt: Date;
      seoTitle: string | null;
      seoDescription: string | null;
      seoKeywords: string[];
    }>;
    desired: Readonly<{ seoTitle: string; seoDescription: string; seoKeywords: string[] }>;
    changed: boolean;
  }>[];
}>;

type ServicePrepared = Readonly<{
  service: Readonly<{
    id: string;
    slug: string;
    updatedAt: Date;
    seoTitle: string | null;
    seoDescription: string | null;
    heroTitle: string | null;
    seoKeywords: string[];
  }>;
  desiredBase: Readonly<{
    seoTitle: string;
    seoDescription: string;
    heroTitle: string;
    seoKeywords: string[];
  }>;
  baseChanged: boolean;
  translations: readonly Readonly<{
    row: Readonly<{
      id: string;
      locale: LocaleCode;
      updatedAt: Date;
      seoTitle: string | null;
      seoDescription: string | null;
      heroTitle: string | null;
    }>;
    desired: Readonly<{ seoTitle: string; seoDescription: string; heroTitle: string }>;
    changed: boolean;
  }>[];
}>;

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function prepareDoctors(countryId: string): Promise<DoctorPrepared[]> {
  const slugs = irelandDoctorProfileKeywordMap.map(({ slug }) => slug);
  const markets = await prisma.doctorCountry.findMany({
    where: { countryId, doctor: { slug: { in: slugs } } },
    select: {
      id: true,
      active: true,
      country: { select: { code: true } },
      doctor: { select: { id: true, slug: true, active: true, updatedAt: true } },
      translations: {
        where: { locale: { in: [...LOCALES] } },
        select: {
          id: true,
          locale: true,
          updatedAt: true,
          seoTitle: true,
          seoDescription: true,
          seoKeywords: true,
        },
      },
    },
  });
  const missing = slugs.filter(
    (slug) => !markets.some(({ doctor }) => doctor.slug === slug),
  );
  if (missing.length > 0) throw new Error(`Missing Ireland doctor markets: ${missing.join(", ")}`);

  const prepared: DoctorPrepared[] = [];
  for (const market of markets) {
    const { doctor } = market;
    assertIrelandDoctorMarketWritable({
      doctorSlug: doctor.slug,
      doctorActive: doctor.active,
      countryCode: market.country.code,
      marketActive: market.active,
    });

    const desiredRows = irelandDoctorProfileSeoUpdates.filter(({ slug }) => slug === doctor.slug);
    const translations = desiredRows.map((desired) => {
      const locale = LocaleCode[desired.locale];
      const row = market.translations.find((translation) => translation.locale === locale);
      if (!row) throw new Error(`${doctor.slug} is missing DoctorMarketTranslation ${locale}.`);
      const desiredData = {
        seoTitle: desired.seoTitle,
        seoDescription: desired.seoDescription,
        seoKeywords: [...desired.seoKeywords],
      };
      return {
        row,
        desired: desiredData,
        changed:
          row.seoTitle !== desiredData.seoTitle ||
          row.seoDescription !== desiredData.seoDescription ||
          !equal(row.seoKeywords, desiredData.seoKeywords),
      };
    });
    prepared.push({ doctor, market, translations });
  }
  return prepared.sort((left, right) => left.doctor.slug.localeCompare(right.doctor.slug));
}

async function prepareServices(countryId: string): Promise<ServicePrepared[]> {
  const slugs = irelandSpecialistServiceSeoUpdates.map(({ slug }) => slug);
  const services = await prisma.service.findMany({
    where: { countryId, slug: { in: slugs } },
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
  });
  const missing = slugs.filter((slug) => !services.some((service) => service.slug === slug));
  if (missing.length > 0) throw new Error(`Missing specialist services: ${missing.join(", ")}`);

  return irelandSpecialistServiceSeoUpdates.map((english) => {
    const service = services.find((candidate) => candidate.slug === english.slug);
    if (!service) throw new Error(`Missing specialist service ${english.slug}.`);
    if (
      !service.isActive ||
      service.kind !== ServiceKind.SPECIALIST ||
      service.visibility !== ServiceVisibility.PUBLIC
    ) {
      throw new Error(`${service.slug} is not an active public SPECIALIST service.`);
    }
    const desiredBase = {
      seoTitle: english.seoTitle,
      seoDescription: english.seoDescription,
      heroTitle: english.heroTitle,
      seoKeywords: [...english.seoKeywords],
    };
    const localized = [
      { locale: LocaleCode.EN, desired: { seoTitle: english.seoTitle, seoDescription: english.seoDescription, heroTitle: english.heroTitle } },
      ...irelandSpecialistServiceLocalizedSeoUpdates
        .filter(({ slug }) => slug === english.slug)
        .map((update) => ({
          locale: LocaleCode[update.locale],
          desired: { seoTitle: update.seoTitle, seoDescription: update.seoDescription, heroTitle: update.heroTitle },
        })),
    ];
    const translations = localized.map(({ locale, desired }) => {
      const row = service.translations.find((translation) => translation.locale === locale);
      if (!row) throw new Error(`${service.slug} is missing ServiceTranslation ${locale}.`);
      return {
        row,
        desired,
        changed:
          row.seoTitle !== desired.seoTitle ||
          row.seoDescription !== desired.seoDescription ||
          row.heroTitle !== desired.heroTitle,
      };
    });
    return {
      service,
      desiredBase,
      baseChanged:
        service.seoTitle !== desiredBase.seoTitle ||
        service.seoDescription !== desiredBase.seoDescription ||
        service.heroTitle !== desiredBase.heroTitle ||
        !equal(service.seoKeywords, desiredBase.seoKeywords),
      translations,
    };
  });
}

async function main(): Promise<void> {
  assertIrelandProfileSpecialistKeywordApplyAuthorized({
    apply: APPLY,
    confirmation: CONFIRMATION,
  });

  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} was not found.`);

  const [doctors, services] = await Promise.all([
    prepareDoctors(country.id),
    prepareServices(country.id),
  ]);

  for (const item of doctors) {
    const locales = item.translations.filter(({ changed }) => changed).map(({ row }) => row.locale);
    writeLine(`${item.doctor.slug}: ${locales.length > 0 ? `doctor SEO ${locales.join(",")}` : "no changes"}`);
  }
  for (const item of services) {
    const locales = item.translations.filter(({ changed }) => changed).map(({ row }) => row.locale);
    writeLine(`${item.service.slug}: ${item.baseChanged ? "base SEO; " : ""}${locales.length > 0 ? `translations ${locales.join(",")}` : item.baseChanged ? "" : "no changes"}`);
  }

  if (!APPLY) {
    writeLine(
      `DRY-RUN ONLY. Review, then use --apply --confirm=${IRELAND_PROFILE_SPECIALIST_KEYWORD_VERSION}.`,
    );
    return;
  }

  for (const item of doctors) {
    await prisma.$transaction(
      async (transaction) => {
        const currentDoctor = await transaction.doctor.findFirst({
          where: buildOptimisticDoctorWhere(item.doctor),
          select: { id: true },
        });
        if (!currentDoctor) throw new Error(`${item.doctor.slug} changed after preview.`);
        const currentMarket = await transaction.doctorCountry.findFirst({
          where: { id: item.market.id, countryId: country.id, active: true },
          select: { id: true },
        });
        if (!currentMarket) throw new Error(`${item.doctor.slug} Ireland market changed after preview.`);
        for (const translation of item.translations) {
          if (!translation.changed) continue;
          const result = await transaction.doctorMarketTranslation.updateMany({
            where: buildOptimisticDoctorMarketTranslationWhere(translation.row),
            data: translation.desired,
          });
          if (result.count !== 1) {
            throw new Error(`${item.doctor.slug} ${translation.row.locale} changed after preview.`);
          }
        }
      },
      buildIrelandProfileSpecialistKeywordTransactionOptions(
        Prisma.TransactionIsolationLevel.Serializable,
      ),
    );
  }

  for (const item of services) {
    await prisma.$transaction(
      async (transaction) => {
        if (item.baseChanged) {
          const result = await transaction.service.updateMany({
            where: buildOptimisticSpecialistServiceWhere(item.service),
            data: item.desiredBase,
          });
          if (result.count !== 1) throw new Error(`${item.service.slug} changed after preview.`);
        } else {
          const current = await transaction.service.findFirst({
            where: buildOptimisticSpecialistServiceWhere(item.service),
            select: { id: true },
          });
          if (!current) throw new Error(`${item.service.slug} changed after preview.`);
        }
        for (const translation of item.translations) {
          if (!translation.changed) continue;
          const result = await transaction.serviceTranslation.updateMany({
            where: buildOptimisticSpecialistServiceTranslationWhere(translation.row),
            data: translation.desired,
          });
          if (result.count !== 1) {
            throw new Error(`${item.service.slug} ${translation.row.locale} changed after preview.`);
          }
        }
      },
      buildIrelandProfileSpecialistKeywordTransactionOptions(
        Prisma.TransactionIsolationLevel.Serializable,
      ),
    );
  }

  writeLine(
    `APPLIED ${IRELAND_PROFILE_SPECIALIST_KEYWORD_VERSION}. Operational and clinical fields were unchanged.`,
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
