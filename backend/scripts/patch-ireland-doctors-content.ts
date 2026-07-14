/**
 * Patch Ireland /ireland/en/doctors (DOCTORS_INDEX) page content + doctor
 * record fixes per the July 2026 SEO Content Changes Brief.
 *
 *   node --import tsx scripts/patch-ireland-doctors-content.ts            # dry-run
 *   node --import tsx scripts/patch-ireland-doctors-content.ts --apply    # write
 *
 * SAFE BY DESIGN: every write matches on the *current* text, so re-running is a
 * no-op and a wrong target simply matches 0 rows instead of corrupting data.
 * Dry-run (default) prints exactly what would change; nothing is written until
 * you pass --apply.
 */
import { LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ie";
const LOCALE: LocaleCode = "EN";
const PAGE_KEY = "DOCTORS_INDEX";
const APPLY = process.argv.includes("--apply");

const log: string[] = [];
const note = (m: string) => {
  log.push(m);
  console.log(m);
};

// ── Brief content (current -> new) ───────────────────────────────────────────

// PageContentTranslation scalar overrides. Stored WITHOUT the "| Global
// Health" suffix — resolveBrandTitle appends the site suffix, so storing it
// here would double it.
const SEO_TITLE = "Online Doctors Ireland | IMC-Registered GPs & Specialists";
const SEO_DESCRIPTION =
  "Browse IMC-registered doctors and clinicians in Ireland — GPs, specialists, psychologist and nutritional therapist. View registration numbers, specialties and languages. Book same day.";
const WHYCHOOSE_TITLE = "Why patients choose Global Health for online care in Ireland";

// FAQ edits — Q2 rewritten, Q6/Q7 appended. Preserve Q1, Q3-Q5 untouched.
const FAQ2_MATCH = "How do I know a doctor is properly qualified?";
const FAQ2_ANSWER =
  "Each doctor profile on Global Health displays their Irish Medical Council (IMC) registration number and division — General or Specialist — which you can verify independently at medicalcouncil.ie. For our Psychologist, PSI registration is shown and verifiable at thepsi.ie. For our Nutritional Therapist, NTOI membership is shown. Credentials such as FRCPCH, FEBN, FRCGP, MCPsychI and other specialist qualifications are listed on individual profiles where applicable.";

const Q6 = "Do I need a GP referral to see a specialist on Global Health?";
const A6 =
  "No. All consultations on Global Health — including specialist consultations with our Consultant Psychiatrist, Neurology Registrar, Medical Oncology Registrar and Consultant Paediatrician — are direct-access. You can book directly without a GP referral. If you have existing reports, investigation results or GP letters, sharing these in advance will help your specialist prepare — but they are not required to book.";

const Q7 = "What is the difference between a GP and a specialist consultation on Global Health?";
const A7 =
  "GP consultations are suitable for acute illness, chronic disease management, prescription renewals, sick certs, mental health assessment and general health queries — from €39. Specialist consultations provide a deeper level of specialist assessment: our Consultant Psychiatrist for complex mental health conditions, our Neurology Registrar for neurological concerns, our Medical Oncology Registrar for cancer-related consultations, and our Consultant Paediatrician for complex paediatric and endocrine conditions. Our Psychologist provides therapeutic mental health sessions. Our Nutritional Therapist provides personalised evidence-based nutritional programmes. Our Rehabilitation Consultant provides physiotherapy assessment and exercise prescription. All prices are shown before booking — no hidden fees.";

// Footer tagline override (IE only).
const FOOTER_TAGLINE =
  "Online medical consultations and therapy with IMC-registered doctors and clinicians in Ireland. Valid prescriptions, sick certs, specialist referrals and nutritional programmes.";

// Doctor title fixes — matched by fullName contains (case-insensitive).
const TIAGO_MATCH = "Tiago";
const TIAGO_TITLE_TO = "General Practitioner";

const FAHAD_MATCH = "Fahad Farooq";
const FAHAD_TITLE_FROM = "Neurologist";
const FAHAD_TITLE_TO = "Neurology Registrar";

const FATIMA_MATCH = "Fatima Ali";
const FATIMA_TITLE_FROM = "Oncologist";
const FATIMA_TITLE_TO = "Medical Oncology Registrar";

// Bio typo fix.
const BIO_TYPO_FROM = "L anguages";
const BIO_TYPO_TO = "Languages";

// ── FAQ helper ───────────────────────────────────────────────────────────────

type Faq = { question: string; answer: string };

function patchFaq(faq: Faq[]): { next: Faq[]; changed: string[] } {
  const changed: string[] = [];
  let next = faq.map((f) => {
    if (f.question.includes(FAQ2_MATCH) && f.answer !== FAQ2_ANSWER) {
      changed.push(`FAQ Q2 answer -> "${f.question}"`);
      return { ...f, answer: FAQ2_ANSWER };
    }
    return f;
  });
  if (!next.some((f) => f.question === Q6)) {
    next = [...next, { question: Q6, answer: A6 }];
    changed.push("FAQ appended: Q6 (GP referral)");
  }
  if (!next.some((f) => f.question === Q7)) {
    next = [...next, { question: Q7, answer: A7 }];
    changed.push("FAQ appended: Q7 (GP vs specialist)");
  }
  return { next, changed };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);
  const countryId = country.id;

  await prisma.$transaction(
    async (tx) => {
      // 1) PageContentTranslation (IE / DOCTORS_INDEX / EN).
      const pc = await tx.pageContent.findUnique({
        where: { countryId_pageKey: { countryId, pageKey: PAGE_KEY } },
        select: { id: true, translations: { where: { locale: LOCALE } } },
      });
      if (!pc) {
        note(`⚠ No PageContent row for IE/${PAGE_KEY} — skipping page copy.`);
      } else if (pc.translations.length === 0) {
        note(`⚠ No EN PageContentTranslation for IE/${PAGE_KEY} — skipping page copy.`);
      } else {
        const t = pc.translations[0];
        const data: Prisma.PageContentTranslationUpdateInput = {};

        if (t.seoTitle !== SEO_TITLE) { data.seoTitle = SEO_TITLE; note(`seoTitle: ${t.seoTitle ?? "∅"} -> ${SEO_TITLE}`); }
        if (t.seoDescription !== SEO_DESCRIPTION) { data.seoDescription = SEO_DESCRIPTION; note("seoDescription updated"); }
        if (t.whyChooseTitle !== WHYCHOOSE_TITLE) { data.whyChooseTitle = WHYCHOOSE_TITLE; note(`whyChooseTitle: ${t.whyChooseTitle ?? "∅"} -> ${WHYCHOOSE_TITLE}`); }

        if (Array.isArray(t.faq)) {
          const { next, changed } = patchFaq(t.faq as unknown as Faq[]);
          if (changed.length) { data.faq = next as unknown as Prisma.InputJsonValue; changed.forEach(note); }
        } else {
          note("⚠ faq field empty/not an array — FAQ edits skipped.");
        }

        if (Object.keys(data).length && APPLY) {
          await tx.pageContentTranslation.update({ where: { id: t.id }, data });
        }
      }

      // 2) Footer tagline override (IE only) — shared row also touched by the
      // GP-content script; matches on current text so it's idempotent either way.
      const footer = await tx.countryFooter.findUnique({ where: { countryId }, select: { tagline: true } });
      if (footer?.tagline !== FOOTER_TAGLINE) {
        note(`CountryFooter.tagline: ${footer?.tagline ?? "∅ (uses global)"} -> IE-specific (doctors-page copy)`);
        if (APPLY) {
          await tx.countryFooter.upsert({
            where: { countryId },
            create: { countryId, tagline: FOOTER_TAGLINE },
            update: { tagline: FOOTER_TAGLINE },
          });
        }
      }

      // 3) Doctor title fixes (base col only — no per-country title override
      // exists for these three in DoctorMarketTranslation per the brief).
      const tiago = await tx.doctor.findMany({
        where: { countryId, fullName: { contains: TIAGO_MATCH } },
        select: { id: true, fullName: true, title: true, bio: true },
      });
      for (const d of tiago) {
        note(`Doctor "${d.fullName}" current title: "${d.title}"`);
        if (d.title !== TIAGO_TITLE_TO) {
          note(`Doctor title: "${d.fullName}" "${d.title}" -> "${TIAGO_TITLE_TO}"`);
          if (APPLY) await tx.doctor.update({ where: { id: d.id }, data: { title: TIAGO_TITLE_TO } });
        }
        if (d.bio?.includes(BIO_TYPO_FROM)) {
          const fixed = d.bio.replaceAll(BIO_TYPO_FROM, BIO_TYPO_TO);
          note(`Doctor bio typo fixed: "${d.fullName}" "L anguages" -> "Languages"`);
          if (APPLY) await tx.doctor.update({ where: { id: d.id }, data: { bio: fixed } });
        }
      }
      const tiagoIds = tiago.map((d) => d.id);
      if (tiagoIds.length) {
        const trRows = await tx.doctorMarketTranslation.findMany({
          where: { doctorCountry: { doctorId: { in: tiagoIds } }, bio: { contains: BIO_TYPO_FROM } },
          select: { id: true, bio: true },
        });
        for (const tr of trRows) {
          const fixed = tr.bio!.replaceAll(BIO_TYPO_FROM, BIO_TYPO_TO);
          note(`DoctorMarketTranslation bio typo fixed (id ${tr.id})`);
          if (APPLY) await tx.doctorMarketTranslation.update({ where: { id: tr.id }, data: { bio: fixed } });
        }
      }

      const fahad = await tx.doctor.updateMany({
        where: { countryId, fullName: { contains: FAHAD_MATCH }, title: FAHAD_TITLE_FROM },
        data: { title: FAHAD_TITLE_TO },
      });
      if (fahad.count) note(`Doctor title (${FAHAD_MATCH}): "${FAHAD_TITLE_FROM}" -> "${FAHAD_TITLE_TO}" (${fahad.count})`);
      else {
        const check = await tx.doctor.findFirst({ where: { countryId, fullName: { contains: FAHAD_MATCH } }, select: { fullName: true, title: true } });
        if (check) note(`ℹ Doctor "${check.fullName}" title is "${check.title}" (expected "${FAHAD_TITLE_FROM}") — not matched, skipped.`);
        else note(`⚠ No doctor found matching "${FAHAD_MATCH}".`);
      }

      const fatima = await tx.doctor.updateMany({
        where: { countryId, fullName: { contains: FATIMA_MATCH }, title: FATIMA_TITLE_FROM },
        data: { title: FATIMA_TITLE_TO },
      });
      if (fatima.count) note(`Doctor title (${FATIMA_MATCH}): "${FATIMA_TITLE_FROM}" -> "${FATIMA_TITLE_TO}" (${fatima.count})`);
      else {
        const check = await tx.doctor.findFirst({ where: { countryId, fullName: { contains: FATIMA_MATCH } }, select: { fullName: true, title: true } });
        if (check) note(`ℹ Doctor "${check.fullName}" title is "${check.title}" (expected "${FATIMA_TITLE_FROM}") — not matched, skipped.`);
        else note(`⚠ No doctor found matching "${FATIMA_MATCH}".`);
      }

      // 4) Verified badge sweep — Ireland DoctorCountry rows.
      const dcRows = await tx.doctorCountry.findMany({
        where: { countryId },
        select: { id: true, isVerified: true, registrationNumber: true, doctor: { select: { fullName: true } } },
      });
      const unverified = dcRows.filter((r) => !r.isVerified);
      note(`Verified-badge sweep: ${dcRows.length} IE DoctorCountry row(s), ${unverified.length} unverified.`);
      for (const r of unverified) {
        const hasReg = !!r.registrationNumber?.trim();
        if (hasReg) {
          note(`  -> will verify: "${r.doctor.fullName}" (registrationNumber present)`);
          if (APPLY) await tx.doctorCountry.update({ where: { id: r.id }, data: { isVerified: true, verifiedAt: new Date() } });
        } else {
          note(`  ⚠ NOT verified (no registrationNumber on file): "${r.doctor.fullName}"`);
        }
      }

      if (!APPLY) throw new ROLLBACK();
    },
    { timeout: 30_000 },
  ).catch((e) => {
    if (e instanceof ROLLBACK) return; // dry-run: intentional rollback
    throw e;
  });

  console.log("\n────────────");
  console.log(
    APPLY
      ? `APPLIED: ${log.length} change(s) written for Ireland doctors page.`
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
