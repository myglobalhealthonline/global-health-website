/**
 * Patch Ireland CLINIC HOME page content per the July 2026 SEO Content Changes
 * Brief v2 (GlobalHealth_IrelandPage_ContentBrief_v2.docx).
 *
 *   node --import tsx scripts/patch-ireland-home-content.ts            # dry-run
 *   node --import tsx scripts/patch-ireland-home-content.ts --apply    # write
 *
 * SAFE BY DESIGN: every write matches on the *current* value, so re-running is a
 * no-op and a wrong target simply matches 0 rows instead of corrupting data.
 * Dry-run (default) prints exactly what would change; nothing is written until
 * you pass --apply. Service summaries are set ONLY when currently empty (the
 * brief's premise is "no description exists") — existing copy is never clobbered.
 *
 * Covers ONLY the genuine per-country DB rows for the /ireland/en hub. Everything
 * else in the brief is done in code on the Dev-hassaan branch:
 *   - Meta title/desc, H1, hero paragraph, hero bullets, trust-ribbon labels,
 *     stats rescope, team H2, services H2, how-it-works, final-CTA →
 *     frontend/lib/content/country-home-copy.ts + page.tsx (per-country override).
 *   - Canonical / OG URL (brief 1.3, 1.6) → env NEXT_PUBLIC_SITE_URL on Railway
 *     (human-only; not a DB or code edit).
 *   - Stat "3 doctors" (brief 4/6) → now renders the REAL IE active-doctor count;
 *     if it shows 4 not 3, deactivate the extra doctor in admin (data, not copy).
 */
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ie";
const LOCALE: LocaleCode = "EN";
const APPLY = process.argv.includes("--apply");

const log: string[] = [];
const note = (m: string) => {
  log.push(m);
  console.log(m);
};

// ── Brief content ────────────────────────────────────────────────────────────

// Doctor card label (brief §3): Dr Tiago "Clinical leadership" → "General
// Practitioner". Team/featured card role falls back to Doctor.title when the
// doctor has no linked Specialty, so this is a Doctor.title edit.
const DOCTOR_NAME_MATCH = "Tiago";
const DOCTOR_TITLE_FROM = "Clinical leadership";
const DOCTOR_TITLE_TO = "General Practitioner";

// Service card descriptions (brief §5) — set only where summary is empty.
const SERVICE_DESCRIPTIONS: Array<{ match: RegExp; label: string; summary: string }> = [
  {
    match: /sick\s*(leave|cert|note|cert)/i,
    label: "Sick Leave",
    summary:
      "IMC-registered doctor issues a valid sick certificate for work or school — accepted by Irish employers.",
  },
  {
    match: /cardiolog/i,
    label: "Cardiology",
    summary:
      "Cardiologist review by video call — ECG interpretation, chest pain assessment, palpitations, hypertension and cardiovascular risk evaluation.",
  },
  {
    match: /dermatolog/i,
    label: "Dermatology",
    summary:
      "Dermatologist review by video call with high-resolution image analysis — acne, eczema, suspicious lesions, psoriasis and skin conditions.",
  },
];

// Footer clinic description (brief §10) — IE-only, so it lives on CountryFooter,
// not the global i18n footerTagline.
const FOOTER_TAGLINE =
  "Online medical consultations with IMC-registered doctors in Ireland. Valid prescriptions, sick certs and specialist referrals.";

const isEmpty = (v: string | null | undefined) => !v || v.trim() === "";

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);
  const countryId = country.id;

  await prisma
    .$transaction(
      async (tx) => {
        // 1) Dr Tiago title (base col + any IE market translation).
        const docBase = await tx.doctor.updateMany({
          where: {
            countryId,
            title: DOCTOR_TITLE_FROM,
            fullName: { contains: DOCTOR_NAME_MATCH },
          },
          data: { title: DOCTOR_TITLE_TO },
        });
        const docTr = await tx.doctorMarketTranslation.updateMany({
          where: {
            locale: LOCALE,
            title: DOCTOR_TITLE_FROM,
            doctorCountry: {
              country: { code: COUNTRY_CODE },
              doctor: { fullName: { contains: DOCTOR_NAME_MATCH } },
            },
          },
          data: { title: DOCTOR_TITLE_TO },
        });
        if (docBase.count || docTr.count) {
          note(
            `Doctor title (${DOCTOR_NAME_MATCH}): "${DOCTOR_TITLE_FROM}" -> "${DOCTOR_TITLE_TO}" (${docBase.count} base, ${docTr.count} tr)`,
          );
        } else {
          note(
            `⚠ Dr ${DOCTOR_NAME_MATCH}: no Doctor.title = "${DOCTOR_TITLE_FROM}" in IE. If the label is a linked Specialty instead, reassign his specialty in admin (a content script must not rename a shared Specialty).`,
          );
        }

        // 2) Service card descriptions — set base + EN translation where empty.
        const services = await tx.service.findMany({
          where: { countryId },
          select: {
            id: true,
            name: true,
            slug: true,
            summary: true,
            translations: { where: { locale: LOCALE }, select: { id: true, summary: true } },
          },
        });
        for (const target of SERVICE_DESCRIPTIONS) {
          const matches = services.filter((s) => target.match.test(s.name));
          if (matches.length === 0) {
            note(`⚠ ${target.label}: no IE service name matched /${target.match.source}/ — skipped.`);
            continue;
          }
          for (const s of matches) {
            const tr = s.translations[0];
            const baseEmpty = isEmpty(s.summary);
            const trEmpty = !tr || isEmpty(tr.summary);
            if (!baseEmpty && !trEmpty) {
              note(`· ${target.label} "${s.name}" (${s.slug}) already has a summary — left untouched.`);
              continue;
            }
            if (baseEmpty) {
              note(`Service summary base: "${s.name}" (${s.slug}) -> set`);
              if (APPLY) await tx.service.update({ where: { id: s.id }, data: { summary: target.summary } });
            }
            if (tr && trEmpty) {
              note(`Service summary EN tr: "${s.name}" (${s.slug}) -> set`);
              if (APPLY) await tx.serviceTranslation.update({ where: { id: tr.id }, data: { summary: target.summary } });
            } else if (!tr) {
              note(`  (no EN ServiceTranslation for "${s.name}" — base col drives the card)`);
            }
          }
        }

        // 3) Footer clinic description (IE only).
        const footer = await tx.countryFooter.findUnique({
          where: { countryId },
          select: { tagline: true },
        });
        if (footer?.tagline !== FOOTER_TAGLINE) {
          note(`CountryFooter.tagline: ${footer?.tagline ?? "∅ (uses global)"} -> IE-specific`);
          if (APPLY) {
            await tx.countryFooter.upsert({
              where: { countryId },
              create: { countryId, tagline: FOOTER_TAGLINE },
              update: { tagline: FOOTER_TAGLINE },
            });
          }
        }

        if (!APPLY) throw new ROLLBACK();
      },
      { timeout: 30_000 },
    )
    .catch((e) => {
      if (e instanceof ROLLBACK) return; // dry-run: intentional rollback
      throw e;
    });

  console.log("\n────────────");
  console.log(
    APPLY
      ? `APPLIED: ${log.length} change(s) written for Ireland clinic home page.`
      : `DRY-RUN: ${log.length} change(s) would be written. Pass --apply to persist.`,
  );
  await prisma.$disconnect();
}

/** Sentinel to roll back the whole dry-run transaction. */
class ROLLBACK extends Error {}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
