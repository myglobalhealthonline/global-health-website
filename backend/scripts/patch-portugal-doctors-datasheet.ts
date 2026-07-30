/**
 * Patch all Portugal doctor profiles from the July 2026 "Dr portugal seo.docx"
 * per-doctor datasheet (scripts/data/portugal-doctors-datasheet.ts). Mirrors
 * scripts/applied/patch-ireland-doctors-datasheet.ts / applied/patch-spain-doctors-datasheet.ts.
 *
 *   node --env-file=.env --import tsx scripts/patch-portugal-doctors-datasheet.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/patch-portugal-doctors-datasheet.ts --apply   # write
 *
 * SAFE BY DESIGN: idempotent — every write is compared against the current
 * value first; re-running is a no-op. Dry-run (default) prints exactly what
 * would change. A missing doctor is a warning, never a crash; one doctor's
 * error never aborts the run (per-doctor try/catch).
 *
 * Per doctor where Portugal is the PRIMARY country (16 of 17 entries):
 *   - base Doctor: title, bio, seoTitle, seoDescription, qualifications (diffed independently)
 *   - sheet.fullNameFix -> base Doctor.fullName (no translation-layer override exists for this field)
 *   - sheet.medicalRegistrationUrlFix -> base Doctor.medicalRegistrationUrl (same, base-only)
 *   - sheet.languagesAdd -> appended to base Doctor.languages if missing, case-insensitive (base-only)
 *   - DoctorTranslation(PT) — create if missing (with full sheet content), else diff+patch
 *   - the `pt` DoctorCountry's DoctorMarketTranslation(PT) — this OVERRIDES DoctorTranslation
 *     on the live /portugal/pt/doctors/... page (the established "self-market-row shadow"
 *     gotcha from the Tiago/Brazil/Ireland/Spain briefs) — diffed the same way
 *   - DoctorFaq(PT) — insert missing by exact question text; if the question matches an
 *     existing row but the answer differs, update the answer (never touch a matching,
 *     unchanged FAQ)
 *
 * MARKET-ONLY (sheet.isMarketOnly — Dr. Tiago Figueira, primary country Ireland):
 *   ONLY the `pt` DoctorCountry's DoctorMarketTranslation(PT) is touched (title/bio/
 *   seoTitle/seoDescription). Base Doctor, DoctorTranslation, qualifications and
 *   languagesAdd are intentionally NOT touched here — those fields live on his
 *   Ireland profile and a Portugal brief must not change how Ireland renders.
 *   If no `pt` DoctorCountry row exists at all, this is logged as an error and
 *   skipped — creating that row is a separate admin action, not this script's job.
 */
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";
import { PORTUGAL_DOCTORS, type PortugalDoctorSheet } from "./data/portugal-doctors-datasheet.js";

const APPLY = process.argv.includes("--apply");
const note = (m: string) => console.log(m);

const stats = { processed: 0, skipped: 0, warnings: 0, changes: 0 };
const warn = (m: string) => {
  stats.warnings++;
  note(`  ⚠ ${m}`);
};
const change = (m: string) => {
  stats.changes++;
  note(`  ~ ${m}`);
};

const doctorInclude = {
  translations: true,
  faqs: true,
  additionalCountries: { where: { country: { code: "pt" } }, include: { translations: true } },
} as const;

async function patchDoctor(sheet: PortugalDoctorSheet) {
  note(`\n== ${sheet.dbSlug} ==`);

  const doctor = await prisma.doctor.findFirst({ where: { slug: sheet.dbSlug }, include: doctorInclude });
  if (!doctor) {
    warn(`NOT FOUND in DB (slug ${sheet.dbSlug}) — skipping`);
    stats.skipped++;
    return;
  }
  note(`  found: ${doctor.fullName}`);
  stats.processed++;

  const ptDc = doctor.additionalCountries[0];

  if (sheet.isMarketOnly) {
    // ── Market-only doctor: touch ONLY the pt DoctorMarketTranslation(PT) row ──
    if (!ptDc) {
      warn(`no pt DoctorCountry row — cannot place Portugal market content (creating that row is a separate admin action, not done here)`);
    } else {
      const ptMt = ptDc.translations.find((t) => t.locale === LocaleCode.PT);
      const mtValues = { title: sheet.title, bio: sheet.bio, seoTitle: sheet.seoTitle, seoDescription: sheet.seoDescription };
      if (!ptMt) {
        change(`pt DoctorMarketTranslation(PT) [market-only] create: title, bio, seoTitle, seoDescription`);
        if (APPLY) await prisma.doctorMarketTranslation.create({ data: { doctorCountryId: ptDc.id, locale: LocaleCode.PT, ...mtValues } });
      } else {
        const patch: Record<string, string> = {};
        if (ptMt.title !== mtValues.title) patch.title = mtValues.title;
        if ((ptMt.bio ?? "") !== mtValues.bio) patch.bio = mtValues.bio;
        if (ptMt.seoTitle !== mtValues.seoTitle) patch.seoTitle = mtValues.seoTitle;
        if (ptMt.seoDescription !== mtValues.seoDescription) patch.seoDescription = mtValues.seoDescription;
        if (Object.keys(patch).length) {
          change(`pt DoctorMarketTranslation(PT) [market-only] update: ${Object.keys(patch).join(", ")}`);
          if (APPLY) await prisma.doctorMarketTranslation.update({ where: { id: ptMt.id }, data: patch });
        } else note("  pt DoctorMarketTranslation(PT): already correct");
      }
    }
    note("  base Doctor / DoctorTranslation / qualifications / languages NOT touched (market-only — lives on Ireland profile)");
  } else {
    // ── Portugal-primary doctor: base Doctor + DoctorTranslation(PT) + pt DoctorMarketTranslation(PT) ──

    // base Doctor fields
    const basePatch: Record<string, unknown> = {};
    if (doctor.title !== sheet.title) basePatch.title = sheet.title;
    if ((doctor.bio ?? "").trim() !== sheet.bio.trim()) basePatch.bio = sheet.bio;
    if (doctor.seoTitle !== sheet.seoTitle) basePatch.seoTitle = sheet.seoTitle;
    if (doctor.seoDescription !== sheet.seoDescription) basePatch.seoDescription = sheet.seoDescription;
    if (sheet.qualifications && JSON.stringify(doctor.qualifications) !== JSON.stringify(sheet.qualifications)) {
      basePatch.qualifications = sheet.qualifications;
    }
    if (sheet.fullNameFix && doctor.fullName !== sheet.fullNameFix) basePatch.fullName = sheet.fullNameFix;
    if (sheet.medicalRegistrationUrlFix && doctor.medicalRegistrationUrl !== sheet.medicalRegistrationUrlFix) {
      basePatch.medicalRegistrationUrl = sheet.medicalRegistrationUrlFix;
    }
    if (Object.keys(basePatch).length) {
      change(`Doctor base fields: ${Object.keys(basePatch).join(", ")}`);
      if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: basePatch });
    } else note("  Doctor base fields: already correct");

    // languages (base-only, no translation-layer column)
    if (sheet.languagesAdd?.length) {
      const have = new Set(doctor.languages.map((l) => l.toLowerCase()));
      const missing = sheet.languagesAdd.filter((l) => !have.has(l.toLowerCase()));
      if (missing.length) {
        const next = [...doctor.languages, ...missing];
        change(`languages: append ${JSON.stringify(missing)} -> ${JSON.stringify(next)}`);
        if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { languages: next } });
      } else note("  languages: already contains sheet.languagesAdd");
    }

    // DoctorTranslation(PT) — create if missing, else diff+patch
    const ptTr = doctor.translations.find((t) => t.locale === LocaleCode.PT);
    const trValues = { title: sheet.title, bio: sheet.bio, seoTitle: sheet.seoTitle, seoDescription: sheet.seoDescription };
    if (!ptTr) {
      change(`DoctorTranslation(PT) create: title, bio, seoTitle, seoDescription`);
      if (APPLY) await prisma.doctorTranslation.create({ data: { doctorId: doctor.id, locale: LocaleCode.PT, ...trValues } });
    } else {
      const trPatch: Record<string, string> = {};
      if (ptTr.title !== trValues.title) trPatch.title = trValues.title;
      if ((ptTr.bio ?? "").trim() !== trValues.bio.trim()) trPatch.bio = trValues.bio;
      if (ptTr.seoTitle !== trValues.seoTitle) trPatch.seoTitle = trValues.seoTitle;
      if (ptTr.seoDescription !== trValues.seoDescription) trPatch.seoDescription = trValues.seoDescription;
      if (Object.keys(trPatch).length) {
        change(`DoctorTranslation(PT) update: ${Object.keys(trPatch).join(", ")}`);
        if (APPLY) await prisma.doctorTranslation.update({ where: { id: ptTr.id }, data: trPatch });
      } else note("  DoctorTranslation(PT): already correct");
    }

    // pt DoctorMarketTranslation(PT) — OVERRIDES DoctorTranslation on the live page (self-market-row shadow gotcha)
    if (!ptDc) {
      warn(`no pt DoctorCountry row for a Portugal-primary doctor — expected one per the roster investigation; check admin`);
    } else {
      const ptMt = ptDc.translations.find((t) => t.locale === LocaleCode.PT);
      const mtValues = { title: sheet.title, bio: sheet.bio, seoTitle: sheet.seoTitle, seoDescription: sheet.seoDescription };
      if (!ptMt) {
        change(`pt DoctorMarketTranslation(PT) [OVERRIDES DoctorTranslation on live page] create: title, bio, seoTitle, seoDescription`);
        if (APPLY) await prisma.doctorMarketTranslation.create({ data: { doctorCountryId: ptDc.id, locale: LocaleCode.PT, ...mtValues } });
      } else {
        const patch: Record<string, string> = {};
        if (ptMt.title !== mtValues.title) patch.title = mtValues.title;
        if ((ptMt.bio ?? "").trim() !== mtValues.bio.trim()) patch.bio = mtValues.bio;
        if (ptMt.seoTitle !== mtValues.seoTitle) patch.seoTitle = mtValues.seoTitle;
        if (ptMt.seoDescription !== mtValues.seoDescription) patch.seoDescription = mtValues.seoDescription;
        if (Object.keys(patch).length) {
          change(`pt DoctorMarketTranslation(PT) [OVERRIDES DoctorTranslation on live page] update: ${Object.keys(patch).join(", ")}`);
          if (APPLY) await prisma.doctorMarketTranslation.update({ where: { id: ptMt.id }, data: patch });
        } else note("  pt DoctorMarketTranslation(PT): already correct");
      }
    }
  }

  // ── DoctorFaq(PT) — insert missing by question text; update answer if question matches but differs ──
  const existingByQ = new Map(doctor.faqs.filter((f) => f.locale === LocaleCode.PT).map((f) => [f.question, f]));
  let sort = doctor.faqs.length;
  for (const f of sheet.faqs) {
    const existing = existingByQ.get(f.question);
    if (!existing) {
      change(`faq add: ${f.question}`);
      if (APPLY) {
        await prisma.doctorFaq.create({
          data: { doctorId: doctor.id, locale: LocaleCode.PT, question: f.question, answer: f.answer, sortOrder: sort++, isActive: true },
        });
      }
    } else if (existing.answer !== f.answer) {
      change(`faq answer update: ${f.question}`);
      if (APPLY) await prisma.doctorFaq.update({ where: { id: existing.id }, data: { answer: f.answer } });
    } else {
      note(`  faq exists (unchanged): ${f.question}`);
    }
  }
}

async function main() {
  note(APPLY ? "== APPLY ==" : "== DRY-RUN (pass --apply to write) ==");
  note(`${PORTUGAL_DOCTORS.length} doctors in datasheet`);

  for (const sheet of PORTUGAL_DOCTORS) {
    try {
      await patchDoctor(sheet);
    } catch (e) {
      stats.skipped++;
      stats.warnings++;
      note(`  ⚠ ERROR patching ${sheet.dbSlug}: ${e instanceof Error ? e.message : e} — continuing`);
    }
  }

  note(`\n== SUMMARY ==`);
  note(`processed: ${stats.processed}, skipped: ${stats.skipped}, warnings: ${stats.warnings}`);
  note(APPLY ? `APPLIED: ${stats.changes} changes` : `DRY-RUN: ${stats.changes} changes would be written`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
