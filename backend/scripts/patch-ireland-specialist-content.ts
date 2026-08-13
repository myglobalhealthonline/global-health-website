/**
 * Patch Ireland specialist-consultation page content per the July 2026 SEO
 * Content Changes Brief (GlobalHealth_IrelandSpecialists_ContentBrief.docx).
 *
 *   node --import tsx scripts/patch-ireland-specialist-content.ts            # dry-run
 *   node --import tsx scripts/patch-ireland-specialist-content.ts --apply    # write
 *
 * SAFE BY DESIGN: every write matches on the *current* text, so re-running is a
 * no-op and a wrong target simply matches 0 rows instead of corrupting data.
 * Dry-run (default) prints exactly what would change; nothing is written until
 * you pass --apply.
 *
 * Covers only the per-country DB fields (PageContent SPECIALIST_CONSULTATION /
 * EN, plus the five specialist Service rows). Deliberately NOT covered here —
 * see the triage doc docs/plans/content-briefs/ireland-specialist-content-brief-triage.md:
 *   - Paediatric card "250 min" (brief §4.3) — clinical DATA, not copy. The
 *     script DETECTS and warns; it does NOT guess a duration. Fix in CMS after
 *     the clinical team confirms 25 vs 50 min.
 *   - Doctor registration labels (brief §6, items 23/24) — need the actual
 *     INDI/NTOI and CORU numbers; external data, add in CMS.
 *   - Footer tagline (item 13) — CountryFooter.tagline is ONE row per country,
 *     shown on the GP page too, so a specialist-only tagline can't live there.
 *   - Footer clinics Romania/Brazil (item 14) — market go-live decision.
 *   - Hero bullets / stat bar / section + team H2s (items 15,16,17,18,20,22) —
 *     GLOBAL i18n (specialistPage.hero.*, specialistPage.*Title) shared by every
 *     market; IE-specific claims ("IMC-registered") can't live there.
 *   - Review claim (item 4) — ALREADY DONE in i18n (specialistPage.hero.stat2 =
 *     "45,000 consultations in 2025" / "Reviewed on Doctify").
 *   - Canonical/OG URL (items §1.3/1.4/1.5) — resolves from NEXT_PUBLIC_SITE_URL;
 *     ops env, and generateMetadata already feeds seoTitle/desc into OG+Twitter.
 */
import { LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ie";
const LOCALE: LocaleCode = "EN";
const PAGE_KEY = "SPECIALIST_CONSULTATION";
const APPLY = process.argv.includes("--apply");

const log: string[] = [];
const note = (m: string) => {
  log.push(m);
  console.log(m);
};

// ── Brief content (current -> new) ───────────────────────────────────────────

// PageContentTranslation scalar overrides (brief §1.1, §1.2, §2.1, §2.2).
const SEO_TITLE =
  "Online Specialist Consultation Ireland | Cardiology, Neurology, Paediatrics | Global Health";
const SEO_DESCRIPTION =
  "See an IMC-registered specialist online in Ireland — Cardiology from €250, Neurology from €160, Paediatrics from €250. No referral required. Book same day.";
const HERO_TITLE =
  "Online Specialist Consultation Ireland — IMC-registered doctors, no referral needed.";
// heroSubtitle feeds BOTH the paragraph below the H1 (§2.2) AND the Final-CTA
// body (§10.2) — the "remove dermatology" CTA fix rides the same field.
const HERO_SUBTITLE =
  "IMC-registered cardiologists, neurologists, paediatricians, physiotherapists and nutritionists — available by secure video call in Ireland. Same-day appointments available, no GP referral required.";
const WHOFOR_TITLE = "What our specialists treat — conditions and concerns";
const WHYCHOOSE_TITLE =
  "Why patients choose Global Health for online specialist care in Ireland";

// Overview intro fixes (brief §3) — matched substrings.
const INTRO_FIXES: Array<[from: string, to: string]> = [
  ["a clinician", "a doctor"],
  ["registered with Irish Medical Council", "registered with the Irish Medical Council"],
];

// whoFor +physiotherapy bullet (brief item 21).
const PHYSIO_ITEM =
  "Physiotherapy assessment for musculoskeletal injuries, sports rehabilitation, and neurological conditions";

// whyChoose bullet 1 (brief item 26) — matched by a distinctive current slice.
const WHYCHOOSE_B1_MATCH = "registered with Irish Medical Council";
const WHYCHOOSE_B1_NEW =
  "IMC-registered specialists — registration numbers displayed on every profile";

// FAQ edits (brief §8.1, §8.2) — matched by a distinctive current-answer slice.
const FAQ_PRICE_MATCH = "cost from €89";
const FAQ_PRICE_ANSWER =
  "Online specialist consultations at Global Health start from €89. Prices vary by specialty: Cardiology €250, Neurology €160, Paediatric Specialist €250, Physiotherapy and Nutrition from €89. There are no hidden fees and no membership required.";
const FAQ_REFERRAL_MATCH = "not always required to book";
const FAQ_REFERRAL_ANSWER =
  "No referral is required to book a specialist consultation at Global Health — you can book directly. Some specialists may ask for your GP notes or existing investigations to prepare for the appointment, so having these available is helpful where possible.";

// New direct-access FAQ (brief §8.3) — the highest-intent query on the page.
const NEWFAQ_Q = "Can I see a specialist online in Ireland without going through my GP?";
const NEWFAQ_A =
  "Yes. Global Health specialist consultations are direct-access — no GP referral is required. You can book directly with an IMC-registered cardiologist, neurologist, paediatrician or physiotherapist, or with our nutritionist. For complex conditions where GP notes or existing investigation results are available, sharing these in advance helps the specialist prepare for your appointment — but they are not required to book.";

// Disclaimer (brief §9) — drop the GP-level paragraph wrongly inherited by the
// specialist page. Matched on the distinctive "provided at GP level" marker; the
// correct specialist paragraph is left untouched.
const GP_DISCLAIMER_MARKER = "provided at GP level";

// Service card renames (brief §4.2) — matched on current name.
const SERVICE_NAMES: Array<[from: string, to: string]> = [
  ["Cardiology Specialist Consultation in Ireland", "Cardiology Consultation Online"],
  ["Neurology Specialist Consultation in Ireland", "Neurology Consultation Online"],
  ["Nutrition Specialist Consultation in Ireland", "Nutrition & Dietetics Consultation Online"],
  ["Paediatric Specialist Consultation in Ireland", "Paediatric Specialist Consultation Online"],
  ["Physiotherapy Specialist Consultation in Ireland", "Physiotherapy Consultation Online"],
];

// Paediatric duration data error (brief §4.3) — DETECT only, never guess.
const PAEDIATRIC_BAD_DURATION = 250;

// ── FAQ / whoFor / whyChoose JSON helpers ────────────────────────────────────

type Faq = { question: string; answer: string };

function patchFaq(faq: Faq[]): { next: Faq[]; changed: string[] } {
  const changed: string[] = [];
  const next = faq.map((f) => {
    if (f.answer.includes(FAQ_PRICE_MATCH) && f.answer !== FAQ_PRICE_ANSWER) {
      changed.push(`FAQ price answer -> "${f.question}"`);
      return { ...f, answer: FAQ_PRICE_ANSWER };
    }
    if (f.answer.includes(FAQ_REFERRAL_MATCH) && f.answer !== FAQ_REFERRAL_ANSWER) {
      changed.push(`FAQ referral answer -> "${f.question}"`);
      return { ...f, answer: FAQ_REFERRAL_ANSWER };
    }
    return f;
  });
  const hasDirectAccess = next.some((f) => /without.*\bGP\b|GP referral|going through my GP/i.test(f.question));
  if (!hasDirectAccess) {
    next.push({ question: NEWFAQ_Q, answer: NEWFAQ_A });
    changed.push("FAQ appended: direct-access (no-referral) Q");
  }
  return { next, changed };
}

function patchWhoFor(items: string[]): { next: string[]; changed: string[] } {
  if (items.some((i) => /physiotherap/i.test(i))) return { next: items, changed: [] };
  return { next: [...items, PHYSIO_ITEM], changed: ["whoFor appended: physiotherapy bullet"] };
}

function patchWhyChoose(items: string[]): { next: string[]; changed: string[] } {
  const changed: string[] = [];
  const next = items.map((i) => {
    if (i.includes(WHYCHOOSE_B1_MATCH) && i !== WHYCHOOSE_B1_NEW) {
      changed.push("whyChoose bullet 1 -> IMC-registered / numbers-on-profile");
      return WHYCHOOSE_B1_NEW;
    }
    return i;
  });
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
      // 1) PageContentTranslation (IE / SPECIALIST_CONSULTATION / EN).
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
        if (t.heroTitle !== HERO_TITLE) { data.heroTitle = HERO_TITLE; note(`heroTitle (H1): ${t.heroTitle ?? "∅"} -> ${HERO_TITLE}`); }
        if (t.heroSubtitle !== HERO_SUBTITLE) { data.heroSubtitle = HERO_SUBTITLE; note("heroSubtitle (paragraph below H1 + Final-CTA body) updated"); }
        if (t.whoForTitle !== WHOFOR_TITLE) { data.whoForTitle = WHOFOR_TITLE; note(`whoForTitle: ${t.whoForTitle ?? "∅"} -> ${WHOFOR_TITLE}`); }
        if (t.whyChooseTitle !== WHYCHOOSE_TITLE) { data.whyChooseTitle = WHYCHOOSE_TITLE; note(`whyChooseTitle: ${t.whyChooseTitle ?? "∅"} -> ${WHYCHOOSE_TITLE}`); }

        if (t.intro) {
          let intro = t.intro;
          for (const [from, to] of INTRO_FIXES) if (intro.includes(from)) intro = intro.replaceAll(from, to);
          if (intro !== t.intro) { data.intro = intro; note("intro: 'a clinician'->'a doctor', 'the' before IMC"); }
        }

        if (Array.isArray(t.faq)) {
          const { next, changed } = patchFaq(t.faq as unknown as Faq[]);
          if (changed.length) { data.faq = next as unknown as Prisma.InputJsonValue; changed.forEach(note); }
        } else {
          note("⚠ faq field empty/not an array — FAQ edits skipped.");
        }

        if (Array.isArray(t.whoForItems)) {
          const { next, changed } = patchWhoFor(t.whoForItems as unknown as string[]);
          if (changed.length) { data.whoForItems = next as unknown as Prisma.InputJsonValue; changed.forEach(note); }
        } else {
          note("⚠ whoForItems empty/not an array — physiotherapy bullet skipped.");
        }

        if (Array.isArray(t.whyChooseItems)) {
          const { next, changed } = patchWhyChoose(t.whyChooseItems as unknown as string[]);
          if (changed.length) { data.whyChooseItems = next as unknown as Prisma.InputJsonValue; changed.forEach(note); }
        } else {
          note("⚠ whyChooseItems empty/not an array — bullet-1 edit skipped.");
        }

        if (Array.isArray(t.disclaimerParagraphs)) {
          const paras = t.disclaimerParagraphs as unknown as string[];
          const kept = paras.filter((p) => !p.toLowerCase().includes(GP_DISCLAIMER_MARKER));
          if (kept.length !== paras.length) {
            data.disclaimerParagraphs = kept as unknown as Prisma.InputJsonValue;
            note(`disclaimer: removed ${paras.length - kept.length} GP-level paragraph(s) from specialist page`);
          } else {
            note("ℹ disclaimerParagraphs has no 'GP level' text — GP disclaimer is likely the COUNTRY shortDisclaimer (see triage §9).");
          }
        } else {
          note("ℹ disclaimerParagraphs empty — GP disclaimer likely the COUNTRY shortDisclaimer (see triage §9).");
        }

        if (Object.keys(data).length && APPLY) {
          await tx.pageContentTranslation.update({ where: { id: t.id }, data });
        }
      }

      // 2) Service card names (base col + EN translation), matched on current.
      for (const [from, to] of SERVICE_NAMES) {
        const base = await tx.service.updateMany({ where: { countryId, name: from }, data: { name: to } });
        const tr = await tx.serviceTranslation.updateMany({ where: { locale: LOCALE, name: from, service: { countryId } }, data: { name: to } });
        if (base.count || tr.count) note(`Service name: "${from}" -> "${to}" (${base.count} base, ${tr.count} tr)`);
      }

      // 2b) Paediatric duration data error (brief §4.3) — DETECT + WARN, never write.
      const paed = await tx.service.findMany({
        where: { countryId, durationMinutes: PAEDIATRIC_BAD_DURATION, name: { contains: "Paediatric" } },
        select: { slug: true, name: true, durationMinutes: true },
      });
      for (const p of paed) {
        note(`⚠ CLINICAL DATA ERROR: "${p.name}" (${p.slug}) durationMinutes=${p.durationMinutes}. Confirm 25 vs 50 with the clinical team and fix in CMS — NOT written by this script.`);
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
      ? `APPLIED: ${log.length} log line(s) for the Ireland specialist page.`
      : `DRY-RUN: ${log.length} log line(s). Pass --apply to persist (paediatric duration + warnings never write).`,
  );
  await prisma.$disconnect();
}

/** Sentinel to roll back the whole dry-run transaction. */
class ROLLBACK extends Error {}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
