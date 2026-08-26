/**
 * Preview or apply the Ireland public-copy punctuation cleanup.
 *
 *   node --env-file=.env --import tsx scripts/humanize-ireland-public-copy.ts
 *   node --env-file=.env --import tsx scripts/humanize-ireland-public-copy.ts \
 *     --apply --confirm=IE-HUMAN-COPY-2026-08-26
 *
 * The script only rewrites text that contains an em dash. It never changes
 * prices, duration, assignments, booking, visibility or publication state.
 */
import { Prisma } from "@prisma/client";

import {
  hasIrelandHumanizationArtifact,
  humanizeIrelandHtml,
  humanizeIrelandJson,
  humanizeIrelandLabel,
  humanizeIrelandProse,
  humanizeIrelandTitle,
} from "../src/content/ireland-public-copy-humanizer.js";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const CONFIRMATION = process.argv
  .find((argument) => argument.startsWith("--confirm="))
  ?.slice("--confirm=".length);
const SAMPLE_LIMIT = Number(
  process.argv
    .find((argument) => argument.startsWith("--samples="))
    ?.slice("--samples=".length) ?? "0",
);
const VERSION = "IE-HUMAN-COPY-2026-08-26";
type PatchKind =
  | "doctor"
  | "doctorTranslation"
  | "doctorFaq"
  | "service"
  | "serviceTranslation"
  | "serviceFaq"
  | "serviceFaqTranslation"
  | "pageContentTranslation"
  | "doctorMarketTranslation";

type PreparedPatch = Readonly<{
  kind: PatchKind;
  id: string;
  updatedAt: Date;
  label: string;
  before: Readonly<Record<string, unknown>>;
  data: Readonly<Record<string, unknown>>;
}>;

function hasEmDash(value: unknown): boolean {
  return typeof value === "string"
    ? value.includes("—") || value.includes("&mdash;") || hasIrelandHumanizationArtifact(value)
    : JSON.stringify(value)?.includes("—") === true ||
        JSON.stringify(value)?.includes("&mdash;") === true;
}

function changedData(data: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => hasEmDash(value)));
}

function asJson(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null) return Prisma.JsonNull;
  return humanizeIrelandJson(value) as Prisma.InputJsonValue;
}

function humanizeBio(value: string | null): string | null {
  return value?.includes("<") ? humanizeIrelandHtml(value) : humanizeIrelandProse(value);
}

async function prepare(): Promise<PreparedPatch[]> {
  const country = await prisma.country.findUnique({
    where: { code: "ie" },
    select: { id: true, isActive: true },
  });
  if (!country?.isActive) throw new Error("Active Ireland country not found.");

  const [services, pages, doctors] = await Promise.all([
    prisma.service.findMany({
      where: {
        countryId: country.id,
        isActive: true,
        visibility: "PUBLIC",
      },
      select: {
        id: true,
        slug: true,
        updatedAt: true,
        name: true,
        summary: true,
        seoTitle: true,
        seoDescription: true,
        heroTitle: true,
        heroDescription: true,
        detailBody: true,
        ctaLabel: true,
        translations: {
          select: {
            id: true,
            locale: true,
            updatedAt: true,
            name: true,
            summary: true,
            seoTitle: true,
            seoDescription: true,
            heroTitle: true,
            heroDescription: true,
            detailBody: true,
            ctaLabel: true,
          },
        },
        faqs: {
          where: { isVisible: true },
          select: {
            id: true,
            updatedAt: true,
            question: true,
            answer: true,
            translations: {
              select: {
                id: true,
                locale: true,
                updatedAt: true,
                question: true,
                answer: true,
              },
            },
          },
        },
      },
    }),
    prisma.pageContent.findMany({
      where: {
        countryId: country.id,
        isActive: true,
        status: "PUBLISHED",
      },
      select: {
        pageKey: true,
        translations: {
          select: {
            id: true,
            locale: true,
            updatedAt: true,
            heroTitle: true,
            heroSubtitle: true,
            heroTitleLead: true,
            heroTitleAccent: true,
            ctaLabel: true,
            intro: true,
            whoForTitle: true,
            whoForIntro: true,
            whoForItems: true,
            whyChooseTitle: true,
            whyChooseItems: true,
            faq: true,
            disclaimerParagraphs: true,
            disclaimerShort: true,
            body: true,
            seoTitle: true,
            seoDescription: true,
          },
        },
      },
    }),
    prisma.doctor.findMany({
      where: {
        active: true,
        OR: [
          { countryId: country.id },
          { additionalCountries: { some: { countryId: country.id, active: true } } },
        ],
      },
      select: {
        id: true,
        slug: true,
        countryId: true,
        updatedAt: true,
        title: true,
        bio: true,
        seoTitle: true,
        seoDescription: true,
        translations: {
          select: {
            id: true,
            locale: true,
            updatedAt: true,
            title: true,
            bio: true,
            seoTitle: true,
            seoDescription: true,
          },
        },
        faqs: {
          where: { isActive: true },
          select: {
            id: true,
            locale: true,
            updatedAt: true,
            question: true,
            answer: true,
          },
        },
        additionalCountries: {
          where: { countryId: country.id, active: true },
          select: {
            id: true,
            translations: {
              select: {
                id: true,
                locale: true,
                updatedAt: true,
                title: true,
                bio: true,
                seoTitle: true,
                seoDescription: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const patches: PreparedPatch[] = [];
  for (const service of services) {
    const baseSource = {
      name: service.name,
      summary: service.summary,
      seoTitle: service.seoTitle,
      seoDescription: service.seoDescription,
      heroTitle: service.heroTitle,
      heroDescription: service.heroDescription,
      detailBody: service.detailBody,
      ctaLabel: service.ctaLabel,
    };
    const baseChanged = changedData(baseSource);
    if (Object.keys(baseChanged).length > 0) {
      patches.push({
        kind: "service",
        id: service.id,
        updatedAt: service.updatedAt,
        label: `service:${service.slug}`,
        before: baseChanged,
        data: {
          ...(hasEmDash(baseSource.name) && { name: humanizeIrelandLabel(baseSource.name) }),
          ...(hasEmDash(baseSource.summary) && { summary: humanizeIrelandProse(baseSource.summary) }),
          ...(hasEmDash(baseSource.seoTitle) && { seoTitle: humanizeIrelandTitle(baseSource.seoTitle) }),
          ...(hasEmDash(baseSource.seoDescription) && { seoDescription: humanizeIrelandProse(baseSource.seoDescription) }),
          ...(hasEmDash(baseSource.heroTitle) && { heroTitle: humanizeIrelandLabel(baseSource.heroTitle) }),
          ...(hasEmDash(baseSource.heroDescription) && { heroDescription: humanizeIrelandProse(baseSource.heroDescription) }),
          ...(hasEmDash(baseSource.detailBody) && { detailBody: humanizeIrelandHtml(baseSource.detailBody) }),
          ...(hasEmDash(baseSource.ctaLabel) && { ctaLabel: humanizeIrelandLabel(baseSource.ctaLabel) }),
        },
      });
    }

    for (const row of service.translations) {
      const source = {
        name: row.name,
        summary: row.summary,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        heroTitle: row.heroTitle,
        heroDescription: row.heroDescription,
        detailBody: row.detailBody,
        ctaLabel: row.ctaLabel,
      };
      if (Object.keys(changedData(source)).length === 0) continue;
      const before = changedData(source);
      patches.push({
        kind: "serviceTranslation",
        id: row.id,
        updatedAt: row.updatedAt,
        label: `service:${service.slug}:${row.locale}`,
        before,
        data: {
          ...(hasEmDash(source.name) && { name: humanizeIrelandLabel(source.name) }),
          ...(hasEmDash(source.summary) && { summary: humanizeIrelandProse(source.summary) }),
          ...(hasEmDash(source.seoTitle) && { seoTitle: humanizeIrelandTitle(source.seoTitle) }),
          ...(hasEmDash(source.seoDescription) && { seoDescription: humanizeIrelandProse(source.seoDescription) }),
          ...(hasEmDash(source.heroTitle) && { heroTitle: humanizeIrelandLabel(source.heroTitle) }),
          ...(hasEmDash(source.heroDescription) && { heroDescription: humanizeIrelandProse(source.heroDescription) }),
          ...(hasEmDash(source.detailBody) && { detailBody: humanizeIrelandHtml(source.detailBody) }),
          ...(hasEmDash(source.ctaLabel) && { ctaLabel: humanizeIrelandLabel(source.ctaLabel) }),
        },
      });
    }

    for (const faq of service.faqs) {
      if (hasEmDash(faq.question) || hasEmDash(faq.answer)) {
        patches.push({
          kind: "serviceFaq",
          id: faq.id,
          updatedAt: faq.updatedAt,
          label: `service-faq:${service.slug}:${faq.id}`,
          before: changedData({ question: faq.question, answer: faq.answer }),
          data: {
            ...(hasEmDash(faq.question) && { question: humanizeIrelandLabel(faq.question) }),
            ...(hasEmDash(faq.answer) && { answer: humanizeIrelandProse(faq.answer) }),
          },
        });
      }
      for (const row of faq.translations) {
        if (!hasEmDash(row.question) && !hasEmDash(row.answer)) continue;
        patches.push({
          kind: "serviceFaqTranslation",
          id: row.id,
          updatedAt: row.updatedAt,
          label: `service-faq:${service.slug}:${row.locale}:${row.id}`,
          before: changedData({ question: row.question, answer: row.answer }),
          data: {
            ...(hasEmDash(row.question) && { question: humanizeIrelandLabel(row.question) }),
            ...(hasEmDash(row.answer) && { answer: humanizeIrelandProse(row.answer) }),
          },
        });
      }
    }
  }

  for (const page of pages) {
    for (const row of page.translations) {
      const source = {
        heroTitle: row.heroTitle,
        heroSubtitle: row.heroSubtitle,
        heroTitleLead: row.heroTitleLead,
        heroTitleAccent: row.heroTitleAccent,
        ctaLabel: row.ctaLabel,
        intro: row.intro,
        whoForTitle: row.whoForTitle,
        whoForIntro: row.whoForIntro,
        whoForItems: row.whoForItems,
        whyChooseTitle: row.whyChooseTitle,
        whyChooseItems: row.whyChooseItems,
        faq: row.faq,
        disclaimerParagraphs: row.disclaimerParagraphs,
        disclaimerShort: row.disclaimerShort,
        body: row.body,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
      };
      const before = changedData(source);
      if (Object.keys(before).length === 0) continue;
      patches.push({
        kind: "pageContentTranslation",
        id: row.id,
        updatedAt: row.updatedAt,
        label: `page:${page.pageKey}:${row.locale}`,
        before,
        data: {
          ...(hasEmDash(source.heroTitle) && { heroTitle: humanizeIrelandLabel(source.heroTitle) }),
          ...(hasEmDash(source.heroSubtitle) && { heroSubtitle: humanizeIrelandProse(source.heroSubtitle) }),
          ...(hasEmDash(source.heroTitleLead) && { heroTitleLead: humanizeIrelandLabel(source.heroTitleLead) }),
          ...(hasEmDash(source.heroTitleAccent) && { heroTitleAccent: humanizeIrelandLabel(source.heroTitleAccent) }),
          ...(hasEmDash(source.ctaLabel) && { ctaLabel: humanizeIrelandLabel(source.ctaLabel) }),
          ...(hasEmDash(source.intro) && { intro: humanizeIrelandProse(source.intro) }),
          ...(hasEmDash(source.whoForTitle) && { whoForTitle: humanizeIrelandLabel(source.whoForTitle) }),
          ...(hasEmDash(source.whoForIntro) && { whoForIntro: humanizeIrelandProse(source.whoForIntro) }),
          ...(hasEmDash(source.whoForItems) && { whoForItems: asJson(source.whoForItems) }),
          ...(hasEmDash(source.whyChooseTitle) && { whyChooseTitle: humanizeIrelandLabel(source.whyChooseTitle) }),
          ...(hasEmDash(source.whyChooseItems) && { whyChooseItems: asJson(source.whyChooseItems) }),
          ...(hasEmDash(source.faq) && { faq: asJson(source.faq) }),
          ...(hasEmDash(source.disclaimerParagraphs) && { disclaimerParagraphs: asJson(source.disclaimerParagraphs) }),
          ...(hasEmDash(source.disclaimerShort) && { disclaimerShort: humanizeIrelandProse(source.disclaimerShort) }),
          ...(hasEmDash(source.body) && { body: humanizeIrelandHtml(source.body) }),
          ...(hasEmDash(source.seoTitle) && { seoTitle: humanizeIrelandTitle(source.seoTitle) }),
          ...(hasEmDash(source.seoDescription) && { seoDescription: humanizeIrelandProse(source.seoDescription) }),
        },
      });
    }
  }

  for (const doctor of doctors) {
    const primaryIreland = doctor.countryId === country.id;

    if (primaryIreland) {
      const source = {
        title: doctor.title,
        bio: doctor.bio,
        seoTitle: doctor.seoTitle,
        seoDescription: doctor.seoDescription,
      };
      const before = changedData(source);
      if (Object.keys(before).length > 0) {
        patches.push({
          kind: "doctor",
          id: doctor.id,
          updatedAt: doctor.updatedAt,
          label: `doctor:${doctor.slug}:base`,
          before,
          data: {
            ...(hasEmDash(source.title) && { title: humanizeIrelandLabel(source.title) }),
            ...(hasEmDash(source.bio) && { bio: humanizeBio(source.bio) }),
            ...(hasEmDash(source.seoTitle) && { seoTitle: humanizeIrelandTitle(source.seoTitle) }),
            ...(hasEmDash(source.seoDescription) && {
              seoDescription: humanizeIrelandProse(source.seoDescription),
            }),
          },
        });
      }

      for (const row of doctor.translations) {
        const source = {
          title: row.title,
          bio: row.bio,
          seoTitle: row.seoTitle,
          seoDescription: row.seoDescription,
        };
        const before = changedData(source);
        if (Object.keys(before).length === 0) continue;
        patches.push({
          kind: "doctorTranslation",
          id: row.id,
          updatedAt: row.updatedAt,
          label: `doctor:${doctor.slug}:${row.locale}:translation`,
          before,
          data: {
            ...(hasEmDash(source.title) && { title: humanizeIrelandLabel(source.title) }),
            ...(hasEmDash(source.bio) && { bio: humanizeBio(source.bio) }),
            ...(hasEmDash(source.seoTitle) && { seoTitle: humanizeIrelandTitle(source.seoTitle) }),
            ...(hasEmDash(source.seoDescription) && {
              seoDescription: humanizeIrelandProse(source.seoDescription),
            }),
          },
        });
      }
    }

    for (const faq of doctor.faqs) {
      const before = changedData({ question: faq.question, answer: faq.answer });
      if (Object.keys(before).length === 0) continue;
      patches.push({
        kind: "doctorFaq",
        id: faq.id,
        updatedAt: faq.updatedAt,
        label: `doctor-faq:${doctor.slug}:${faq.locale}:${faq.id}`,
        before,
        data: {
          ...(hasEmDash(faq.question) && { question: humanizeIrelandLabel(faq.question) }),
          ...(hasEmDash(faq.answer) && { answer: humanizeIrelandProse(faq.answer) }),
        },
      });
    }

    for (const market of doctor.additionalCountries) {
      for (const row of market.translations) {
        const source = {
          title: row.title,
          bio: row.bio,
          seoTitle: row.seoTitle,
          seoDescription: row.seoDescription,
        };
        const before = changedData(source);
        if (Object.keys(before).length === 0) continue;
        patches.push({
          kind: "doctorMarketTranslation",
          id: row.id,
          updatedAt: row.updatedAt,
          label: `doctor:${doctor.slug}:${row.locale}:market`,
          before,
          data: {
            ...(hasEmDash(row.title) && { title: humanizeIrelandLabel(row.title) }),
            ...(hasEmDash(row.bio) && { bio: humanizeBio(row.bio) }),
            ...(hasEmDash(row.seoTitle) && { seoTitle: humanizeIrelandTitle(row.seoTitle) }),
            ...(hasEmDash(row.seoDescription) && {
              seoDescription: humanizeIrelandProse(row.seoDescription),
            }),
          },
        });
      }
    }
  }
  return patches;
}

async function applyPatch(patch: PreparedPatch): Promise<void> {
  const options = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20_000 } as const;
  await prisma.$transaction(async (tx) => {
    const where = { id: patch.id, updatedAt: patch.updatedAt };
    const result = patch.kind === "doctor"
      ? await tx.doctor.updateMany({ where, data: patch.data as Prisma.DoctorUpdateManyMutationInput })
      : patch.kind === "doctorTranslation"
        ? await tx.doctorTranslation.updateMany({ where, data: patch.data as Prisma.DoctorTranslationUpdateManyMutationInput })
        : patch.kind === "doctorFaq"
          ? await tx.doctorFaq.updateMany({ where, data: patch.data as Prisma.DoctorFaqUpdateManyMutationInput })
          : patch.kind === "service"
            ? await tx.service.updateMany({ where, data: patch.data as Prisma.ServiceUpdateManyMutationInput })
            : patch.kind === "serviceTranslation"
              ? await tx.serviceTranslation.updateMany({ where, data: patch.data as Prisma.ServiceTranslationUpdateManyMutationInput })
              : patch.kind === "serviceFaq"
                ? await tx.serviceFaq.updateMany({ where, data: patch.data as Prisma.ServiceFaqUpdateManyMutationInput })
                : patch.kind === "serviceFaqTranslation"
                  ? await tx.serviceFaqTranslation.updateMany({ where, data: patch.data as Prisma.ServiceFaqTranslationUpdateManyMutationInput })
                  : patch.kind === "pageContentTranslation"
                    ? await tx.pageContentTranslation.updateMany({ where, data: patch.data as Prisma.PageContentTranslationUpdateManyMutationInput })
                    : await tx.doctorMarketTranslation.updateMany({ where, data: patch.data as Prisma.DoctorMarketTranslationUpdateManyMutationInput });
    if (result.count !== 1) throw new Error(`Concurrent change detected for ${patch.label}.`);
  }, options);
}

async function main(): Promise<void> {
  if (APPLY && CONFIRMATION !== VERSION) {
    throw new Error(`Apply requires --confirm=${VERSION}`);
  }
  const patches = await prepare();
  const counts = patches.reduce<Record<string, number>>(
    (acc, patch) => ({ ...acc, [patch.kind]: (acc[patch.kind] ?? 0) + 1 }),
    {},
  );
  process.stdout.write(`${JSON.stringify({ mode: APPLY ? "apply" : "dry-run", total: patches.length, counts }, null, 2)}\n`);
  if (SAMPLE_LIMIT > 0) {
    for (const patch of patches.slice(0, SAMPLE_LIMIT)) {
      process.stdout.write(`SAMPLE ${patch.label}\n`);
      for (const [field, after] of Object.entries(patch.data)) {
        process.stdout.write(`  ${field}: ${JSON.stringify(patch.before[field])} -> ${JSON.stringify(after)}\n`);
      }
    }
  }
  for (const patch of patches) process.stdout.write(`${patch.label}: ${Object.keys(patch.data).join(", ")}\n`);
  if (!APPLY) {
    process.stdout.write(`DRY-RUN ONLY. Use --apply --confirm=${VERSION} after review.\n`);
    return;
  }
  for (const patch of patches) await applyPatch(patch);
  process.stdout.write(`Applied ${patches.length} Ireland public-copy patches.\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
