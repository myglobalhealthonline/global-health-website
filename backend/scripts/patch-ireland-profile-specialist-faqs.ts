/**
 * Preview or apply reviewed Ireland doctor-profile and specialist-service FAQs.
 *
 *   node --env-file=.env --import tsx scripts/patch-ireland-profile-specialist-faqs.ts
 *   node --env-file=.env --import tsx scripts/patch-ireland-profile-specialist-faqs.ts \
 *     --apply --confirm=IE-PROFILE-SPECIALIST-FAQ-2026-08-26
 *
 * This script only creates the authored FAQ rows in the two content manifests.
 * It does not change profiles, services, clinicians, prices or booking rules.
 */
import { Prisma } from "@prisma/client";

import { irelandDoctorProfileFaqAdditions } from "../src/content/ireland-doctor-profile-faqs.js";
import {
  IRELAND_PROFILE_SPECIALIST_FAQ_PATCH_VERSION,
  assertIrelandDoctorFaqTargetWritable,
  assertIrelandProfileSpecialistFaqApplyAuthorized,
  assertIrelandSpecialistFaqTargetWritable,
  buildIrelandProfileSpecialistFaqTransactionOptions,
  hasIrelandFaqQuestionOverlap,
} from "../src/content/ireland-profile-specialist-faq-patch.js";
import { irelandSpecialistServiceFaqAdditions } from "../src/content/ireland-specialist-service-faqs.js";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const CONFIRMATION = process.argv
  .find((argument) => argument.startsWith("--confirm="))
  ?.slice("--confirm=".length);
const COUNTRY_CODE = "ie";
const EXPECTED_VISIBLE_SERVICE_FAQ_COUNT = 8;

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

async function loadCountryId(client: DatabaseClient): Promise<string> {
  const country = await client.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} was not found.`);
  return country.id;
}

async function assertDoctorTarget(
  client: DatabaseClient,
  countryId: string,
  slug: string,
  expectedActiveFaqCount: number,
  targetQuestions: readonly string[],
) {
  const market = await client.doctorCountry.findFirst({
    where: { countryId, doctor: { slug } },
    select: {
      active: true,
      country: { select: { code: true } },
      doctor: {
        select: {
          id: true,
          active: true,
          faqs: { select: { question: true, isActive: true } },
        },
      },
    },
  });
  if (!market) throw new Error(`${slug} does not have an Ireland market.`);

  assertIrelandDoctorFaqTargetWritable({
    slug,
    countryCode: market.country.code,
    doctorActive: market.doctor.active,
    marketActive: market.active,
    activeFaqCount: market.doctor.faqs.filter(({ isActive }) => isActive).length,
    expectedActiveFaqCount,
    totalFaqCount: market.doctor.faqs.length,
    expectedTotalFaqCount: expectedActiveFaqCount,
    targetQuestionExists: hasIrelandFaqQuestionOverlap(
      market.doctor.faqs.map(({ question }) => question),
      targetQuestions,
    ),
  });
  return market.doctor;
}

async function assertServiceTarget(
  client: DatabaseClient,
  countryId: string,
  slug: string,
  targetQuestions: readonly string[],
) {
  const service = await client.service.findFirst({
    where: { countryId, slug },
    select: {
      id: true,
      isActive: true,
      visibility: true,
      kind: true,
      country: { select: { code: true } },
      faqs: {
        select: {
          question: true,
          isVisible: true,
          sortOrder: true,
          translations: { select: { question: true } },
        },
      },
    },
  });
  if (!service) throw new Error(`Ireland specialist service ${slug} was not found.`);

  assertIrelandSpecialistFaqTargetWritable({
    slug,
    countryCode: service.country.code,
    isActive: service.isActive,
    visibility: service.visibility,
    kind: service.kind,
    visibleFaqCount: service.faqs.filter(({ isVisible }) => isVisible).length,
    expectedVisibleFaqCount: EXPECTED_VISIBLE_SERVICE_FAQ_COUNT,
    targetQuestionExists: hasIrelandFaqQuestionOverlap(
      service.faqs.flatMap((faq) => [
        faq.question,
        ...faq.translations.map(({ question }) => question),
      ]),
      targetQuestions,
    ),
  });
  return service;
}

async function preview(): Promise<void> {
  const countryId = await loadCountryId(prisma);
  for (const entry of irelandDoctorProfileFaqAdditions) {
    await assertDoctorTarget(
      prisma,
      countryId,
      entry.slug,
      entry.expectedActiveFaqCount,
      entry.faqs.map(({ question }) => question),
    );
    writeLine(`${entry.slug}: add ${entry.faqs.length} localized doctor FAQ rows`);
  }
  for (const entry of irelandSpecialistServiceFaqAdditions) {
    await assertServiceTarget(
      prisma,
      countryId,
      entry.slug,
      [entry.question, ...entry.translations.map(({ question }) => question)],
    );
    writeLine(`${entry.slug}: add one FAQ with ${entry.translations.length} translations`);
  }
}

async function applyFaqs(): Promise<void> {
  await prisma.$transaction(
    async (transaction) => {
      const countryId = await loadCountryId(transaction);
      for (const entry of irelandDoctorProfileFaqAdditions) {
        const doctor = await assertDoctorTarget(
          transaction,
          countryId,
          entry.slug,
          entry.expectedActiveFaqCount,
          entry.faqs.map(({ question }) => question),
        );
        const localeSortOrders = new Map<string, number>();
        await transaction.doctorFaq.createMany({
          data: entry.faqs.map((faq) => {
            const sortOrder = localeSortOrders.get(faq.locale) ?? 0;
            localeSortOrders.set(faq.locale, sortOrder + 1);
            return {
              doctorId: doctor.id,
              locale: faq.locale,
              question: faq.question,
              answer: faq.answer,
              sortOrder,
              isActive: true,
            };
          }),
        });
      }
      for (const entry of irelandSpecialistServiceFaqAdditions) {
        const service = await assertServiceTarget(
          transaction,
          countryId,
          entry.slug,
          [entry.question, ...entry.translations.map(({ question }) => question)],
        );
        const highestSortOrder = service.faqs.reduce(
          (highest, faq) => Math.max(highest, faq.sortOrder),
          -1,
        );
        await transaction.serviceFaq.create({
          data: {
            serviceId: service.id,
            question: entry.question,
            answer: entry.answer,
            sortOrder: highestSortOrder + 1,
            isVisible: true,
            translations: {
              create: entry.translations.map((translation) => ({
                locale: translation.locale,
                question: translation.question,
                answer: translation.answer,
              })),
            },
          },
        });
      }
    },
    buildIrelandProfileSpecialistFaqTransactionOptions(
      Prisma.TransactionIsolationLevel.Serializable,
    ),
  );
}

async function main(): Promise<void> {
  assertIrelandProfileSpecialistFaqApplyAuthorized({
    apply: APPLY,
    confirmation: CONFIRMATION,
  });
  await preview();

  if (!APPLY) {
    writeLine(
      `DRY-RUN ONLY. Review, then use --apply --confirm=${IRELAND_PROFILE_SPECIALIST_FAQ_PATCH_VERSION}.`,
    );
    return;
  }

  await applyFaqs();
  writeLine(
    `APPLIED ${IRELAND_PROFILE_SPECIALIST_FAQ_PATCH_VERSION}. Only authored FAQ rows were created.`,
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
