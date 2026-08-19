/**
 * APPLIED 2026-08-19 — 7 rows updated. Re-running is a no-op.
 *
 * Roney Carli — per-locale SEO title/description, following the bio expansion
 * in patch-roney-carli-profile.ts.
 *
 * Two problems with the stored values, now that his profile is indexable:
 *   1. They still name the old role ("Manual Therapist" / "Terapeuta Manual"),
 *      so the SERP title contradicted the H1 and the bio.
 *   2. Every locale claimed "Book an online video consultation" — he has no
 *      assigned bookable services and his work is hands-on, so that was a
 *      false claim on a page about a real practitioner.
 *
 * The replacements name the role and what he does, and make no booking-channel
 * claim at all.
 *
 *   node --env-file=.env --import tsx scripts/applied/patch-roney-carli-seo.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/applied/patch-roney-carli-seo.ts --apply   # write
 *
 * SAFE BY DESIGN: one doctor, one market, two fields per locale. A locale is
 * skipped when its stored seoTitle no longer contains the old role string, so a
 * later hand-edit is never clobbered and re-running is a no-op.
 */
import { LocaleCode } from "@prisma/client";
import { prisma } from "../../src/db/prisma.js";

const SLUG = "roney-carli";
const COUNTRY_CODE = "ie";
const APPLY = process.argv.includes("--apply");

/** Present in every stale seoTitle; its absence means the row was hand-edited. */
const STALE_MARKERS: Record<LocaleCode, string> = {
  EN: "Manual Therapist",
  PT: "Terapeuta Manual",
  ES: "Terapeuta Manual",
  CS: "Manuální terapeut",
  RO: "Terapeut Manual",
  DE: "Manualtherapeut",
};

const SEO: Record<LocaleCode, { title: string; description: string }> = {
  EN: {
    title: "Roney Carli — Chiropractor & Manual Therapist | Global Health",
    description:
      "Roney Carli, Chiropractor and Manual Therapist at Global Health Ireland. Chiropractic, manual, soft-tissue and neuromuscular therapy, individualised to each patient.",
  },
  PT: {
    title: "Roney Carli — Quiroprático e Terapeuta Manual | Global Health",
    description:
      "Roney Carli, quiroprático e terapeuta manual na Global Health Ireland. Quiropraxia, terapia manual, tecidos moles e terapia neuromuscular, adaptadas a cada paciente.",
  },
  ES: {
    title: "Roney Carli — Quiropráctico y Terapeuta Manual | Global Health",
    description:
      "Roney Carli, quiropráctico y terapeuta manual en Global Health Ireland. Quiropráctica, terapia manual, tejidos blandos y terapia neuromuscular, adaptadas a cada paciente.",
  },
  CS: {
    title: "Roney Carli — Chiropraktik a manuální terapeut | Global Health",
    description:
      "Roney Carli, chiropraktik a manuální terapeut v Global Health Ireland. Chiropraxe, manuální terapie, techniky měkkých tkání a neuromuskulární terapie na míru každému pacientovi.",
  },
  RO: {
    title: "Roney Carli — Chiropractician și terapeut manual | Global Health",
    description:
      "Roney Carli, chiropractician și terapeut manual la Global Health Ireland. Chiropractică, terapie manuală, tehnici pentru țesuturi moi și terapie neuromusculară, adaptate fiecărui pacient.",
  },
  DE: {
    title: "Roney Carli — Chiropraktiker und Manualtherapeut | Global Health",
    description:
      "Roney Carli, Chiropraktiker und Manualtherapeut bei Global Health Ireland. Chiropraktik, Manualtherapie, Weichteiltechniken und neuromuskuläre Therapie, individuell abgestimmt.",
  },
};

async function main() {
  const doctor = await prisma.doctor.findFirst({
    where: { slug: SLUG, country: { code: COUNTRY_CODE } },
    select: { id: true, seoTitle: true },
  });
  if (!doctor) throw new Error(`Doctor ${SLUG} not found in ${COUNTRY_CODE}`);

  const link = await prisma.doctorCountry.findFirst({
    where: { doctorId: doctor.id, country: { code: COUNTRY_CODE } },
    select: { id: true },
  });
  if (!link) throw new Error(`No DoctorCountry row for ${SLUG}/${COUNTRY_CODE}`);

  let changed = 0;

  // Base row carries the market-default (EN) values.
  if (doctor.seoTitle !== SEO.EN.title) {
    changed += 1;
    console.log(`${APPLY ? "SET" : "WOULD SET"} base seoTitle: "${doctor.seoTitle ?? "∅"}" -> "${SEO.EN.title}"`);
    if (APPLY) {
      await prisma.doctor.update({
        where: { id: doctor.id },
        data: { seoTitle: SEO.EN.title, seoDescription: SEO.EN.description },
      });
    }
  }

  for (const locale of Object.keys(SEO) as LocaleCode[]) {
    const tr = await prisma.doctorMarketTranslation.findUnique({
      where: { doctorCountryId_locale: { doctorCountryId: link.id, locale } },
      select: { id: true, seoTitle: true },
    });
    if (!tr) {
      console.log(`${locale}: no translation row — skipped.`);
      continue;
    }
    if (tr.seoTitle === SEO[locale].title) {
      console.log(`${locale}: already current — skipped.`);
      continue;
    }
    if (tr.seoTitle && !tr.seoTitle.includes(STALE_MARKERS[locale])) {
      console.log(`${locale}: seoTitle "${tr.seoTitle}" is not the stale one — left as-is.`);
      continue;
    }
    changed += 1;
    console.log(`${APPLY ? "SET" : "WOULD SET"} ${locale}: "${tr.seoTitle ?? "∅"}" -> "${SEO[locale].title}"`);
    if (APPLY) {
      await prisma.doctorMarketTranslation.update({
        where: { id: tr.id },
        data: { seoTitle: SEO[locale].title, seoDescription: SEO[locale].description },
      });
    }
  }

  console.log("\n────────────");
  console.log(
    APPLY ? `APPLIED: ${changed} row(s) updated.` : `DRY-RUN: ${changed} row(s) would be updated. Pass --apply to persist.`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
