/**
 * One-off, idempotent backfill: seed a default-locale translation row for
 * every Service / Specialty / HealthTest by copying its current base
 * display columns. Run once after applying the add_translation_tables
 * migration:
 *
 *   npx tsx scripts/backfill-translations.ts
 *
 * Idempotent: uses createMany({ skipDuplicates: true }) keyed on the
 * (<parentId>, locale) unique constraint, so re-running never clobbers an
 * existing (possibly admin-edited) translation. Reads always fall back to
 * the base columns, so a partial run degrades gracefully.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

async function backfillServices(): Promise<void> {
  const services = await prisma.service.findMany({
    select: {
      id: true,
      name: true,
      summary: true,
      seoTitle: true,
      seoDescription: true,
      heroTitle: true,
      heroDescription: true,
      detailBody: true,
      ctaLabel: true,
      country: { select: { defaultLocale: true } },
    },
  });

  const data = services.map((s) => ({
    serviceId: s.id,
    locale: s.country.defaultLocale,
    name: s.name,
    summary: s.summary,
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    heroTitle: s.heroTitle,
    heroDescription: s.heroDescription,
    detailBody: s.detailBody,
    ctaLabel: s.ctaLabel,
  }));

  const result =
    data.length > 0
      ? await prisma.serviceTranslation.createMany({ data, skipDuplicates: true })
      : { count: 0 };
  console.log(
    `ServiceTranslation: ${result.count} created, ${data.length - result.count} already existed (of ${data.length} services)`,
  );
}

async function backfillSpecialties(): Promise<void> {
  const specialties = await prisma.specialty.findMany({
    select: {
      id: true,
      name: true,
      cardSummary: true,
      country: { select: { defaultLocale: true } },
    },
  });

  const data = specialties.map((s) => ({
    specialtyId: s.id,
    locale: s.country.defaultLocale,
    name: s.name,
    cardSummary: s.cardSummary,
  }));

  const result =
    data.length > 0
      ? await prisma.specialtyTranslation.createMany({ data, skipDuplicates: true })
      : { count: 0 };
  console.log(
    `SpecialtyTranslation: ${result.count} created, ${data.length - result.count} already existed (of ${data.length} specialties)`,
  );
}

async function backfillHealthTests(): Promise<void> {
  const tests = await prisma.healthTest.findMany({
    select: {
      id: true,
      title: true,
      shortDescription: true,
      sampleType: true,
      resultsTimeline: true,
      heroButtonLabel: true,
      detailIntro: true,
      seoTitle: true,
      seoDescription: true,
      country: { select: { defaultLocale: true } },
    },
  });

  const data = tests.map((t) => ({
    healthTestId: t.id,
    locale: t.country.defaultLocale,
    title: t.title,
    shortDescription: t.shortDescription,
    sampleType: t.sampleType,
    resultsTimeline: t.resultsTimeline,
    heroButtonLabel: t.heroButtonLabel,
    detailIntro: t.detailIntro,
    seoTitle: t.seoTitle,
    seoDescription: t.seoDescription,
  }));

  const result =
    data.length > 0
      ? await prisma.healthTestTranslation.createMany({ data, skipDuplicates: true })
      : { count: 0 };
  console.log(
    `HealthTestTranslation: ${result.count} created, ${data.length - result.count} already existed (of ${data.length} health tests)`,
  );
}

async function backfillDoctors(): Promise<void> {
  const doctors = await prisma.doctor.findMany({
    select: {
      id: true,
      title: true,
      bio: true,
      seoTitle: true,
      seoDescription: true,
      country: { select: { defaultLocale: true } },
    },
  });

  const data = doctors.map((d) => ({
    doctorId: d.id,
    locale: d.country.defaultLocale,
    title: d.title,
    bio: d.bio,
    seoTitle: d.seoTitle,
    seoDescription: d.seoDescription,
  }));

  const result =
    data.length > 0
      ? await prisma.doctorTranslation.createMany({ data, skipDuplicates: true })
      : { count: 0 };
  console.log(
    `DoctorTranslation: ${result.count} created, ${data.length - result.count} already existed (of ${data.length} doctors)`,
  );
}

async function main(): Promise<void> {
  console.log("Backfilling default-locale translations…");
  await backfillServices();
  await backfillSpecialties();
  await backfillHealthTests();
  await backfillDoctors();
  console.log("Backfill complete.");
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
