/**
 * Patch all Spain doctor profiles from the July 2026
 * "GlobalHealth_Spain_DoctorsPage_Brief" + per-doctor SEO datasheet.
 * Mirrors scripts/patch-ireland-doctors-datasheet.ts.
 *
 *   node --env-file=.env --import tsx scripts/patch-spain-doctors-datasheet.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/patch-spain-doctors-datasheet.ts --apply   # write
 *
 * SAFE BY DESIGN: idempotent — every write compares against the current value
 * first; re-running is a no-op. Dry-run (default) prints exactly what would
 * change. A missing doctor is a warning, never a crash.
 *
 * Per doctor:
 *   - Doctor.fullName = sheet fullName (fixes Dr/Dra prefix bugs — psychologists
 *     get NO prefix, female physicians get "Dra.")
 *   - Doctor.title = sheet specialty label
 *   - Doctor.seoTitle / seoDescription = sheet Title Tag / Meta Description
 *   - Doctor.bio = full CMS-ready bio (paragraphs + bullets + approach + Idiomas)
 *   - Doctor.qualifications = sheet list
 *   - Doctor.languages — canonical English labels (site-wide convention)
 *   - insert missing ES DoctorFaq rows (matched by exact question text)
 *   - editorialChecklist.readyToIndex = true
 *   - existing ES DoctorTranslation row patched too (masks base fields if present)
 *   - the 3 psychologists (sheet.chamber === "COP"): DoctorCountry(es).chamberEntity
 *     "OMC" -> "COP", medicalRegistrationUrl -> cop.es (never overwritten for
 *     the 11 physicians — CGCOM chamber already correct per brief)
 *
 * SPECIAL CASE dr-alfredo-del-valle: the live slug has a known typo
 * ("dr-alfredo-del-vale", missing one "l"). Looked up by fullName-contains
 * fallback when the slug lookup misses, then the slug itself is corrected.
 */
import { LocaleCode } from "@prisma/client";
import { prisma } from "../../src/db/prisma.js";
import { SPAIN_DOCTORS, type DoctorSheet } from "../data/spain-doctors-datasheet.js";

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

const BROKEN_SLUG_FALLBACK: Record<string, string> = {
  "dr-alfredo-del-valle": "Alfredo del Valle",
};

// Public list/profile endpoints resolve display content as:
//   base Doctor -> DoctorTranslation(locale) -> DoctorMarketTranslation(locale)
// via mergeDoctorMarketTranslation(mergeDoctorTranslation(doctor)) — the
// market row wins whenever it exists (doctors.service.ts ~L510-520).  Every
// doctor here carries a *self-referencing* DoctorCountry row for their own
// primary country (created by ensurePrimaryDoctorCountry, used for
// chamberEntity/registrationNumber) that ALSO happens to carry a full
// DoctorMarketTranslation(ES) set — so base-column writes alone are
// invisible on /spain/es/doctors until this row is patched too.
const doctorInclude = {
  translations: true,
  faqs: true,
  country: true,
  additionalCountries: { include: { translations: true } },
} as const;

async function findDoctor(sheet: DoctorSheet) {
  const bySlug = await prisma.doctor.findFirst({
    where: { slug: sheet.dbSlug },
    include: doctorInclude,
  });
  if (bySlug) return bySlug;

  const fallbackName = BROKEN_SLUG_FALLBACK[sheet.dbSlug];
  if (!fallbackName) return null;

  const byName = await prisma.doctor.findFirst({
    where: { fullName: { contains: fallbackName } },
    include: doctorInclude,
  });
  if (byName) {
    change(`slug: "${byName.slug}" -> "${sheet.dbSlug}" (fixing known typo, matched by name)`);
    if (APPLY) await prisma.doctor.update({ where: { id: byName.id }, data: { slug: sheet.dbSlug } });
  }
  return byName;
}

async function patchDoctor(sheet: DoctorSheet) {
  note(`\n== ${sheet.fullName} (${sheet.dbSlug}) ==`);

  const doctor = await findDoctor(sheet);
  if (!doctor) {
    warn(`NOT FOUND in DB (slug or name fallback) — skipping`);
    stats.skipped++;
    return;
  }
  note(`  found: ${doctor.fullName} country=${doctor.country.code}`);
  stats.processed++;

  // --- fullName (Dr/Dra prefix fixes)
  if (doctor.fullName !== sheet.fullName) {
    change(`fullName: "${doctor.fullName}" -> "${sheet.fullName}"`);
    if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { fullName: sheet.fullName } });
  } else note("  fullName: already correct");

  // --- title
  if (doctor.title !== sheet.specialty) {
    change(`title: "${doctor.title}" -> "${sheet.specialty}"`);
    if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { title: sheet.specialty } });
  } else note("  title: already correct");

  // --- seoTitle / seoDescription
  if (doctor.seoTitle !== sheet.seoTitle) {
    change(`seoTitle: "${doctor.seoTitle ?? "(null)"}" -> "${sheet.seoTitle}"`);
    if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { seoTitle: sheet.seoTitle } });
  } else note("  seoTitle: already correct");
  if (doctor.seoDescription !== sheet.seoDescription) {
    change(`seoDescription -> sheet text (${sheet.seoDescription.length} chars)`);
    if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { seoDescription: sheet.seoDescription } });
  } else note("  seoDescription: already correct");

  // --- bio
  if (doctor.bio !== sheet.bio) {
    change(`bio -> sheet CMS bio (${sheet.bio.length} chars, was ${doctor.bio?.length ?? 0})`);
    if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { bio: sheet.bio } });
  } else note("  bio: already correct");

  // --- qualifications
  if (!arraysEqual(doctor.qualifications, sheet.qualifications)) {
    change(`qualifications: ${doctor.qualifications.length} -> ${sheet.qualifications.length} items`);
    if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { qualifications: sheet.qualifications } });
  } else note("  qualifications: already correct");

  // --- languages
  if (!arraysEqual(doctor.languages, sheet.languages)) {
    change(`languages: ${JSON.stringify(doctor.languages)} -> ${JSON.stringify(sheet.languages)}`);
    if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { languages: sheet.languages } });
  } else note("  languages: already correct");

  // --- existing ES DoctorTranslation row (masks base fields if present)
  for (const tr of doctor.translations.filter((t) => t.locale === LocaleCode.ES)) {
    const trPatch: Record<string, string> = {};
    if (tr.title !== sheet.specialty) trPatch.title = sheet.specialty;
    if (tr.bio != null && tr.bio !== sheet.bio) trPatch.bio = sheet.bio;
    if (tr.seoTitle != null && tr.seoTitle !== sheet.seoTitle) trPatch.seoTitle = sheet.seoTitle;
    if (tr.seoDescription != null && tr.seoDescription !== sheet.seoDescription) trPatch.seoDescription = sheet.seoDescription;
    if (Object.keys(trPatch).length) {
      change(`translation(ES): ${Object.keys(trPatch).join(", ")} -> sheet values`);
      if (APPLY) await prisma.doctorTranslation.update({ where: { id: tr.id }, data: trPatch });
    } else note("  translation(ES): already correct");
  }

  // --- self-referencing DoctorCountry(own country) DoctorMarketTranslation(ES)
  // — see doctorInclude comment. This is what the public site actually reads.
  const selfCountryRow = doctor.additionalCountries.find((ac) => ac.countryId === doctor.countryId);
  if (selfCountryRow) {
    const mtr = selfCountryRow.translations.find((t) => t.locale === LocaleCode.ES);
    const mtrPatch: Record<string, string> = {};
    if (mtr?.title !== sheet.specialty) mtrPatch.title = sheet.specialty;
    if (mtr?.bio !== sheet.bio) mtrPatch.bio = sheet.bio;
    if (mtr?.seoTitle !== sheet.seoTitle) mtrPatch.seoTitle = sheet.seoTitle;
    if (mtr?.seoDescription !== sheet.seoDescription) mtrPatch.seoDescription = sheet.seoDescription;
    if (Object.keys(mtrPatch).length) {
      change(`market translation(ES, self-country) ${mtr ? "update" : "create"}: ${Object.keys(mtrPatch).join(", ")} -> sheet values`);
      if (APPLY) {
        if (mtr) {
          await prisma.doctorMarketTranslation.update({ where: { id: mtr.id }, data: mtrPatch });
        } else {
          await prisma.doctorMarketTranslation.create({
            data: { doctorCountryId: selfCountryRow.id, locale: LocaleCode.ES, ...mtrPatch },
          });
        }
      }
    } else note("  market translation(ES, self-country): already correct");
  } else note("  no self-referencing DoctorCountry row — base fields apply directly");

  // --- FAQs (ES) — insert missing by exact question text
  const existingQ = new Set(doctor.faqs.filter((f) => f.locale === LocaleCode.ES).map((f) => f.question));
  let sort = doctor.faqs.length;
  for (const f of sheet.faqs) {
    if (existingQ.has(f.question)) {
      note(`  faq exists: ${f.question}`);
      continue;
    }
    change(`faq add: ${f.question}`);
    if (APPLY)
      await prisma.doctorFaq.create({
        data: { doctorId: doctor.id, locale: LocaleCode.ES, question: f.question, answer: f.answer, sortOrder: sort++, isActive: true },
      });
  }

  // --- readyToIndex
  const checklist = (doctor.editorialChecklist as Record<string, unknown> | null) ?? {};
  if (checklist.readyToIndex !== true) {
    change("editorialChecklist.readyToIndex -> true");
    if (APPLY)
      await prisma.doctor.update({
        where: { id: doctor.id },
        data: { editorialChecklist: { ...checklist, readyToIndex: true } },
      });
  } else note("  readyToIndex: already true");

  // --- psychologist chamber fix (OMC -> COP) + registration URL
  if (sheet.chamber === "COP") {
    const dc = await prisma.doctorCountry.findFirst({
      where: { doctorId: doctor.id, countryId: doctor.countryId },
    });
    if (!dc) {
      warn(`no DoctorCountry(es) row for primary country — cannot fix chamberEntity`);
    } else if (dc.chamberEntity !== "COP") {
      change(`chamberEntity: "${dc.chamberEntity ?? "(null)"}" -> "COP"`);
      if (APPLY) await prisma.doctorCountry.update({ where: { id: dc.id }, data: { chamberEntity: "COP" } });
    } else note("  chamberEntity: already COP");

    if (sheet.registrationUrl && doctor.medicalRegistrationUrl !== sheet.registrationUrl) {
      change(`medicalRegistrationUrl: "${doctor.medicalRegistrationUrl ?? "(null)"}" -> "${sheet.registrationUrl}"`);
      if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { medicalRegistrationUrl: sheet.registrationUrl } });
    } else note("  medicalRegistrationUrl: already correct");
  }
}

async function main() {
  note(APPLY ? "== APPLY ==" : "== DRY-RUN (pass --apply to write) ==");
  note(`${SPAIN_DOCTORS.length} doctors in datasheet`);

  for (const sheet of SPAIN_DOCTORS) {
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
