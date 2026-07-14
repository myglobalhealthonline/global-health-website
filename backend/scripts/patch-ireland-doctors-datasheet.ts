/**
 * Patch all Ireland doctor profiles from the July 2026 Doctor Profile Data
 * Sheet (see scripts/data/ireland-doctors-datasheet.ts for the transcribed
 * content). Mirrors scripts/patch-tiago-profile-content.ts.
 *
 *   node --env-file=.env --import tsx scripts/patch-ireland-doctors-datasheet.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/patch-ireland-doctors-datasheet.ts --apply   # write
 *
 * SAFE BY DESIGN: idempotent — every write is compared against the current
 * value first; re-running is a no-op. Dry-run (default) prints exactly what
 * would change. A missing doctor is a warning, never a crash.
 *
 * Per doctor:
 *   - Doctor.title = sheet specialty label
 *   - Doctor.seoTitle / seoDescription = sheet Title Tag / Meta Description
 *   - Doctor.bio = full CMS-ready bio (paragraphs + bullets + approach + Languages)
 *   - Doctor.qualifications = sheet CMS list
 *   - Doctor.languages — only if different from sheet (DB format: ["English", ...])
 *   - insert missing EN DoctorFaq rows (matched by exact question text)
 *   - editorialChecklist.readyToIndex = true (merged over existing JSON)
 *   - DoctorTranslation EN title patched if different
 *   - DoctorCountry(ie) DoctorMarketTranslation EN row patched (it OVERRIDES
 *     base Doctor fields on the public IE profile)
 *   - medicalRegistrationUrl never overwritten — warn if not medicalcouncil.ie
 *
 * SPECIAL CASE khoiamul-islam: primary country is cz. Base Doctor fields are
 * NOT touched (would leak IE copy onto his cz profile); instead the
 * DoctorCountry(ie) DoctorMarketTranslation EN row is upserted with
 * title/seoTitle/seoDescription/bio. FAQs are per-doctor (not market-scoped
 * in the schema) so they WILL also show on his cz profile — added anyway,
 * with a warning.
 */
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";
import { IRELAND_DOCTORS, type DoctorSheet } from "./data/ireland-doctors-datasheet.js";

const APPLY = process.argv.includes("--apply");
const note = (m: string) => console.log(m);

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const stats = { processed: 0, skipped: 0, warnings: 0, changes: 0 };
const warn = (m: string) => {
  stats.warnings++;
  note(`  ⚠ ${m}`);
};
const change = (m: string) => {
  stats.changes++;
  note(`  ~ ${m}`);
};

// khoiamul-islam's primary country is cz — never write his base Doctor fields.
const MARKET_ONLY_SLUGS = new Set(["khoiamul-islam"]);

async function patchDoctor(sheet: DoctorSheet) {
  note(`\n== ${sheet.displayName} (${sheet.dbSlug}) ==`);

  const doctor = await prisma.doctor.findFirst({
    where: { slug: sheet.dbSlug },
    include: { translations: true, faqs: true, country: true },
  });
  if (!doctor) {
    warn(`NOT FOUND in DB — skipping (sheet slug: ${sheet.sheetSlug})`);
    stats.skipped++;
    return;
  }
  note(`  found: ${doctor.fullName} country=${doctor.country.code}`);
  stats.processed++;

  const marketOnly = MARKET_ONLY_SLUGS.has(sheet.dbSlug);

  // --- IE market translation (overrides base fields on the public IE profile)
  const ieDc = await prisma.doctorCountry.findFirst({
    where: { doctorId: doctor.id, country: { code: "ie" } },
    include: { translations: { where: { locale: LocaleCode.EN } } },
  });
  const ieEn = ieDc?.translations[0];

  if (marketOnly) {
    // Ireland copy goes ONLY to the IE market translation row.
    if (!ieDc) {
      warn("primary country is cz but no DoctorCountry(ie) row exists — cannot place IE content; skipping content writes");
    } else {
      const patch: Record<string, string> = {};
      if (ieEn?.title !== sheet.specialty) patch.title = sheet.specialty;
      if (ieEn?.seoTitle !== sheet.seoTitle) patch.seoTitle = sheet.seoTitle;
      if (ieEn?.seoDescription !== sheet.seoDescription) patch.seoDescription = sheet.seoDescription;
      if (ieEn?.bio !== sheet.bio) patch.bio = sheet.bio;
      if (Object.keys(patch).length) {
        change(`IE market translation (EN) ${ieEn ? "update" : "create"}: ${Object.keys(patch).join(", ")}`);
        if (APPLY) {
          if (ieEn) {
            await prisma.doctorMarketTranslation.update({ where: { id: ieEn.id }, data: patch });
          } else {
            await prisma.doctorMarketTranslation.create({
              data: { doctorCountryId: ieDc.id, locale: LocaleCode.EN, ...patch },
            });
          }
        }
      } else note("  IE market translation (EN): already correct");
    }
    note("  base Doctor fields NOT touched (cz-primary doctor — IE copy would leak onto cz profile)");
  } else {
    // --- 1. title
    if (doctor.title !== sheet.specialty) {
      change(`title: "${doctor.title}" -> "${sheet.specialty}"`);
      if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { title: sheet.specialty } });
    } else note("  title: already correct");

    // --- 2/3. seoTitle / seoDescription
    if (doctor.seoTitle !== sheet.seoTitle) {
      change(`seoTitle: "${doctor.seoTitle ?? "(null)"}" -> "${sheet.seoTitle}"`);
      if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { seoTitle: sheet.seoTitle } });
    } else note("  seoTitle: already correct");
    if (doctor.seoDescription !== sheet.seoDescription) {
      change(`seoDescription -> sheet text (${sheet.seoDescription.length} chars)`);
      if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { seoDescription: sheet.seoDescription } });
    } else note("  seoDescription: already correct");

    // --- 4. bio
    if (doctor.bio !== sheet.bio) {
      change(`bio -> sheet CMS bio (${sheet.bio.length} chars, was ${doctor.bio?.length ?? 0})`);
      if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { bio: sheet.bio } });
    } else note("  bio: already correct");

    // --- 5. qualifications
    if (!arraysEqual(doctor.qualifications, sheet.qualifications)) {
      change(`qualifications: ${doctor.qualifications.length} -> ${sheet.qualifications.length} items`);
      if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { qualifications: sheet.qualifications } });
    } else note("  qualifications: already correct");

    // --- 6. languages
    if (!arraysEqual(doctor.languages, sheet.languages)) {
      change(`languages: ${JSON.stringify(doctor.languages)} -> ${JSON.stringify(sheet.languages)}`);
      if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { languages: sheet.languages } });
    } else note("  languages: already correct");

    // --- 9a. DoctorTranslation EN title
    for (const tr of doctor.translations.filter((t) => t.locale === LocaleCode.EN)) {
      if (tr.title !== sheet.specialty) {
        change(`translation(EN).title: "${tr.title}" -> "${sheet.specialty}"`);
        if (APPLY) await prisma.doctorTranslation.update({ where: { id: tr.id }, data: { title: sheet.specialty } });
      }
    }

    // --- 9b. IE market translation (mirrors Tiago script section 1b)
    if (ieEn) {
      const patch: Record<string, string> = {};
      if (ieEn.title !== sheet.specialty) patch.title = sheet.specialty;
      if (ieEn.seoTitle !== sheet.seoTitle) patch.seoTitle = sheet.seoTitle;
      if (ieEn.seoDescription !== sheet.seoDescription) patch.seoDescription = sheet.seoDescription;
      if (Object.keys(patch).length) {
        change(`IE market translation (EN): ${Object.keys(patch).join(", ")} -> sheet values`);
        if (APPLY) await prisma.doctorMarketTranslation.update({ where: { id: ieEn.id }, data: patch });
      } else note("  IE market translation (EN): already correct");
    } else note("  IE market translation (EN): none — base fields apply");
  }

  // --- 7. FAQs (EN) — insert missing by exact question text
  if (marketOnly) {
    warn("FAQs are per-doctor, NOT market-scoped — the 6 IE FAQs below will ALSO show on his cz profile");
  }
  const existingQ = new Set(doctor.faqs.filter((f) => f.locale === LocaleCode.EN).map((f) => f.question));
  let sort = doctor.faqs.length;
  for (const f of sheet.faqs) {
    if (existingQ.has(f.question)) {
      note(`  faq exists: ${f.question}`);
      continue;
    }
    change(`faq add: ${f.question}`);
    if (APPLY)
      await prisma.doctorFaq.create({
        data: { doctorId: doctor.id, locale: LocaleCode.EN, question: f.question, answer: f.answer, sortOrder: sort++, isActive: true },
      });
  }

  // --- 8. readyToIndex
  const checklist = (doctor.editorialChecklist as Record<string, unknown> | null) ?? {};
  if (checklist.readyToIndex !== true) {
    change("editorialChecklist.readyToIndex -> true");
    if (APPLY)
      await prisma.doctor.update({
        where: { id: doctor.id },
        data: { editorialChecklist: { ...checklist, readyToIndex: true } },
      });
  } else note("  readyToIndex: already true");

  // --- 10. registration URL — report only, never overwrite
  if (!doctor.medicalRegistrationUrl?.includes("medicalcouncil.ie")) {
    warn(`medicalRegistrationUrl does NOT point at medicalcouncil.ie: ${doctor.medicalRegistrationUrl ?? "(null)"} — fix in admin if this doctor is IMC-registered`);
  } else note("  medicalRegistrationUrl: ok (medicalcouncil.ie)");
}

async function main() {
  note(APPLY ? "== APPLY ==" : "== DRY-RUN (pass --apply to write) ==");
  note(`${IRELAND_DOCTORS.length} doctors in datasheet`);

  for (const sheet of IRELAND_DOCTORS) {
    try {
      await patchDoctor(sheet);
    } catch (e) {
      stats.skipped++;
      stats.warnings++;
      note(`  ⚠ ERROR patching ${sheet.dbSlug}: ${e instanceof Error ? e.message : e} — continuing`);
    }
  }

  note(`\n== SUMMARY ==`);
  note(`processed: ${stats.processed}, skipped: ${stats.skipped}, changes ${APPLY ? "applied" : "pending"}: ${stats.changes}, warnings: ${stats.warnings}`);
  note(APPLY ? "== APPLIED ==" : "== DRY-RUN complete — nothing written ==");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
