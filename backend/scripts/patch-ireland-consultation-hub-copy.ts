/**
 * Preview or apply the complete, OpenSEO-informed English copy for Ireland's
 * canonical GP and specialist consultation hubs.
 *
 *   node --import tsx scripts/patch-ireland-consultation-hub-copy.ts
 *   node --import tsx scripts/patch-ireland-consultation-hub-copy.ts \
 *     --apply --confirm=IE-CONSULTATION-HUBS-2026-08-25
 *
 * Dry-run is the default. Applying requires the exact content-version token,
 * updates neither publish state nor visibility toggles, and uses updatedAt as
 * an optimistic concurrency guard so a concurrent CMS edit cannot be lost.
 */
import { LocaleCode, Prisma } from "@prisma/client";

import {
  irelandGpHubContent,
  irelandSpecialistHubContent,
  type IrelandConsultationHubContent,
} from "../src/content/ireland-consultation-hubs.js";
import {
  IRELAND_HUB_CONTENT_VERSION,
  assertIrelandHubApplyAuthorized,
  assertIrelandHubPageWritable,
  buildOptimisticPageWhere,
  buildOptimisticTranslationWhere,
  jsonValuesEqual,
} from "../src/content/ireland-consultation-hub-patch.js";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ie";
const LOCALE: LocaleCode = "EN";
const APPLY = process.argv.includes("--apply");
const CONFIRMATION = process.argv
  .find((argument) => argument.startsWith("--confirm="))
  ?.slice("--confirm=".length);

const contentByPage = [
  irelandGpHubContent,
  irelandSpecialistHubContent,
] as const;

type TranslationSnapshot = {
  id: string;
  updatedAt: Date;
  seoTitle: string | null;
  seoDescription: string | null;
  heroTitle: string | null;
  heroTitleLead: string | null;
  heroTitleAccent: string | null;
  heroSubtitle: string | null;
  ctaLabel: string | null;
  intro: string | null;
  whoForTitle: string | null;
  whoForIntro: string | null;
  whoForItems: Prisma.JsonValue;
  whyChooseTitle: string | null;
  whyChooseItems: Prisma.JsonValue;
  faq: Prisma.JsonValue;
  disclaimerParagraphs: Prisma.JsonValue;
};

function jsonCopy<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function desiredTranslation(
  content: IrelandConsultationHubContent,
): Prisma.PageContentTranslationUpdateInput {
  return {
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
    heroTitle: content.heroTitle,
    heroTitleLead: content.heroTitleLead,
    heroTitleAccent: content.heroTitleAccent,
    heroSubtitle: content.heroSubtitle,
    ctaLabel: content.ctaLabel,
    intro: content.intro,
    whoForTitle: content.whoForTitle,
    whoForIntro: content.whoForIntro,
    whoForItems: jsonCopy(content.whoForItems),
    whyChooseTitle: content.whyChooseTitle,
    whyChooseItems: jsonCopy(content.whyChooseItems),
    faq: jsonCopy(content.faq),
    disclaimerParagraphs: jsonCopy(content.disclaimerParagraphs),
  };
}

function changedFields(
  current: TranslationSnapshot,
  desired: Prisma.PageContentTranslationUpdateInput,
): string[] {
  return Object.entries(desired)
    .filter(([field, value]) => {
      const currentValue = current[field as keyof TranslationSnapshot];
      return !jsonValuesEqual(currentValue, value);
    })
    .map(([field]) => field);
}

async function main(): Promise<void> {
  assertIrelandHubApplyAuthorized({ apply: APPLY, confirmation: CONFIRMATION });

  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} was not found.`);

  const rows = await prisma.pageContent.findMany({
    where: {
      countryId: country.id,
      pageKey: { in: contentByPage.map(({ pageKey }) => pageKey) },
    },
    select: {
      id: true,
      updatedAt: true,
      pageKey: true,
      status: true,
      isActive: true,
      translations: {
        where: { locale: LOCALE },
        select: {
          id: true,
          updatedAt: true,
          seoTitle: true,
          seoDescription: true,
          heroTitle: true,
          heroTitleLead: true,
          heroTitleAccent: true,
          heroSubtitle: true,
          ctaLabel: true,
          intro: true,
          whoForTitle: true,
          whoForIntro: true,
          whoForItems: true,
          whyChooseTitle: true,
          whyChooseItems: true,
          faq: true,
          disclaimerParagraphs: true,
        },
      },
    },
  });

  const prepared = contentByPage.map((content) => {
    const page = rows.find((candidate) => candidate.pageKey === content.pageKey);
    if (!page) throw new Error(`Missing PageContent row for ${content.pageKey}.`);
    assertIrelandHubPageWritable(page);
    const translation = page.translations[0];
    if (!translation) throw new Error(`Missing EN translation for ${content.pageKey}.`);
    const data = desiredTranslation(content);
    return {
      content,
      page,
      translation,
      data,
      fields: changedFields(translation, data),
    };
  });

  for (const item of prepared) {
    const summary = item.fields.length > 0 ? item.fields.join(", ") : "no changes";
    writeLine(`${item.content.pageKey}: ${summary}`);
    if (!APPLY) {
      writeLine(
        `  current title=${JSON.stringify(item.translation.seoTitle)} h1=${JSON.stringify(item.translation.heroTitle)}`,
      );
    }
  }

  if (!APPLY) {
    writeLine(
      `DRY-RUN ONLY. Review, then use --apply --confirm=${IRELAND_HUB_CONTENT_VERSION}.`,
    );
    return;
  }

  await prisma.$transaction(async (transaction) => {
    for (const item of prepared) {
      if (item.fields.length === 0) continue;
      const writablePageCount = await transaction.pageContent.count({
        where: buildOptimisticPageWhere(item.page),
      });
      if (writablePageCount !== 1) {
        throw new Error(
          `${item.content.pageKey} changed publication state after the preview read; transaction rolled back.`,
        );
      }
      const result = await transaction.pageContentTranslation.updateMany({
        where: buildOptimisticTranslationWhere(item.translation),
        data: item.data,
      });
      if (result.count !== 1) {
        throw new Error(
          `${item.content.pageKey} changed after the preview read; transaction rolled back.`,
        );
      }
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  writeLine(
    `APPLIED ${IRELAND_HUB_CONTENT_VERSION}. Publish state and visibility toggles were unchanged.`,
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
