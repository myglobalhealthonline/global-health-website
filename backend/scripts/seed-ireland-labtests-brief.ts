/**
 * Ireland Lab Tests page — SEO/content brief remediation (July 2026).
 *
 * Scope: IRELAND (ie) + ENGLISH (EN) ONLY. Rewrites the live HEALTH_TESTS
 * PageContent EN translation and the two IE HealthTest rows to the confirmed
 * Randox home-kit service model, removing the false "every result reviewed
 * by a doctor" claim (Consumer Protection Act 2007 / EU Omnibus risk).
 *
 * Owner-confirmed 2026-07-14: follow-up consult = "See a Doctor Online in
 * Ireland" (slug acute-medical-consultation), live price €45 — copy now
 * states "from €45" wherever the follow-up is mentioned. No CTA hyperlink:
 * intro/whoFor/whyChoose/faq/disclaimer are plain-text fields, no link
 * support in ServiceIntro/FAQSection/MedicalDisclaimer.
 *
 * Deliberately NOT touched here (flagged to owner):
 *   - Other markets (cz/pt/es/ro/br) HEALTH_TESTS content — different model.
 *   - Standalone CTA button-band (brief §6) — needs a bespoke section, not
 *     requested.
 *
 *   npx tsx scripts/seed-ireland-labtests-brief.ts          # dry run
 *   npx tsx scripts/seed-ireland-labtests-brief.ts --apply  # write (PROD)
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const PAGE_KEY = "HEALTH_TESTS";
const LOCALE = "EN" as const;

// ── PageContent EN copy (Randox model) ──
const HERO_TITLE = "Home Blood Tests Ireland — Randox Lab Kits, Results in Up to 10 Days";
const HERO_SUBTITLE =
  "Order a Randox home blood test kit, take your sample at home, and receive your results in up to 10 days. Want a doctor to explain your results? Book a follow-up consultation with an IMC-registered Global Health doctor from €45.";
const SEO_TITLE = "Home Blood Tests Ireland — Randox Lab Kits | Global Health";
const SEO_DESCRIPTION =
  "Order a Randox home blood test kit in Ireland from €89. Full Blood Count, Thyroid Function and more. Take your sample at home and receive results in up to 10 days. Book a follow-up with an IMC-registered doctor from €45.";

const INTRO =
  "Global Health offers Randox home blood test kits in Ireland — clinical-grade tests you take yourself at home. Order your kit, collect your sample following the instructions provided, and post it to the Randox laboratory in the freepost envelope included. Randox delivers your results digitally in up to 10 days. If you would like a doctor to talk you through what your results mean, you can book an optional follow-up consultation with an IMC-registered Global Health doctor from €45.";

const WHO_FOR_TITLE = "Who these tests are for";
const WHO_FOR_INTRO = "Our home blood tests may be a good fit if you are looking into:";
const WHO_FOR_ITEMS = [
  "Full Blood Count — for fatigue and low energy, suspected anaemia, immune concerns, or a routine health check",
  "Thyroid Function Test — for unexplained weight changes, fatigue, hair loss, feeling cold all the time, or irregular periods",
  "Routine health screening and general wellbeing checks from home",
  "Monitoring a known condition between GP visits",
];

// How it works (5 steps) mapped onto the whyChoose slot (titled list).
const WHY_CHOOSE_TITLE = "How it works";
const WHY_CHOOSE_ITEMS = [
  "Order your Randox kit — choose your test and add it to your cart. Your kit is dispatched within 1–2 working days.",
  "Take your sample at home — follow the instructions included in the kit (finger-prick or venous self-collection, depending on the test).",
  "Post your sample to the Randox lab — a freepost return envelope is included in every kit.",
  "Receive your results — Randox delivers your results digitally in up to 10 days.",
  "Optional — book a follow-up consultation with an IMC-registered Global Health doctor from €45 to review your results and advise on next steps.",
];

const FAQ = [
  {
    question: "How does a home blood test kit work?",
    answer:
      "You order your kit online, take your own sample at home following the step-by-step instructions provided, and post it to the Randox laboratory using the freepost envelope included. Randox analyses your sample and delivers your results digitally in up to 10 days.",
  },
  {
    question: "Is a venous blood draw difficult to do at home?",
    answer:
      "The venous self-collection kit is designed for home use and comes with clear instructions. The Full Blood Count is also available as a simpler finger-prick sample. You do not need to visit a clinic.",
  },
  {
    question: "How long do results take?",
    answer: "Randox delivers your results digitally in up to 10 days after receiving your sample.",
  },
  {
    question: "Who analyses my blood sample?",
    answer:
      "Your sample is analysed by Randox, a UKAS-accredited laboratory trusted across the UK and Ireland. Your results are delivered to you directly by Randox.",
  },
  {
    question: "What happens if my results show something abnormal?",
    answer:
      "Your results are delivered to you by Randox. If anything looks abnormal, or you are unsure what your results mean, we recommend booking a follow-up consultation with an IMC-registered Global Health doctor (from €45), who can explain your results and advise on next steps. In a medical emergency, call 112 or attend your nearest emergency department.",
  },
  {
    question: "Is the doctor consultation included in the €89?",
    answer:
      "No. The €89 covers the Randox test kit and its laboratory analysis. A doctor review is optional and booked separately as a follow-up consultation with an IMC-registered Global Health doctor, from €45.",
  },
  {
    question: "Can I get these tests on the HSE?",
    answer:
      "Some blood tests may be available through the HSE or your GP, sometimes at no cost. Our home test kits are a convenient private option you can order and complete at home, without a referral or waiting for an appointment.",
  },
  {
    question: "Are Randox tests clinically accurate?",
    answer:
      "Yes. Randox is a UKAS-accredited laboratory and the kits are clinical-grade. Sample quality depends on following the collection instructions provided in your kit.",
  },
];

const DISCLAIMER_PARAGRAPHS = [
  "Home blood test kits offered through Global Health in Ireland are provided and analysed by Randox, a UKAS-accredited laboratory. Your results are delivered to you directly by Randox.",
  "A test result does not by itself constitute a diagnosis. A doctor review is not included in the price of the kit. If you would like your results explained, you can book an optional follow-up consultation with a doctor registered with the Irish Medical Council, from €45, who can advise on any recommended next steps at their professional discretion.",
  "Our doctors do not routinely prescribe controlled substances through online consultations.",
  "Home blood tests are not suitable for medical emergencies. If you are experiencing a medical emergency, contact emergency services immediately by calling 112 or attend your nearest emergency department.",
];

const DISCLAIMER_SHORT =
  "Home blood test kits in Ireland are provided and analysed by Randox, a UKAS-accredited laboratory, and results are delivered to you directly. A test result does not itself constitute a diagnosis, and a doctor review is not included in the kit price — an optional follow-up consultation with an IMC-registered doctor is available separately from €45. In a medical emergency call 112.";

// ── HealthTest card fixes (base columns + EN translation) ──
const RANDOX_ATTR = "Provided and analysed by Randox, a UKAS-accredited laboratory.";
const HEALTH_TESTS: Record<string, { resultsTimeline: string; sampleType: string; shortDescription: string }> = {
  "full-blood-count": {
    resultsTimeline: "Up to 10 days",
    sampleType: "Finger Prick / Venous Blood",
    shortDescription:
      "A comprehensive blood test that checks your overall health, including red and white blood cells, haemoglobin, and platelets. Available as a finger prick or venous blood draw. " +
      RANDOX_ATTR,
  },
  "thyroid-function-test": {
    resultsTimeline: "Up to 10 days",
    sampleType: "Venous Blood (self-collection kit included)",
    shortDescription:
      "A blood test that measures thyroid hormone levels (TSH, T3, T4) to assess thyroid function and detect conditions such as hypothyroidism or hyperthyroidism. Results delivered digitally. " +
      RANDOX_ATTR,
  },
};

async function main(): Promise<void> {
  const ie = await prisma.country.findUnique({ where: { code: "ie" }, select: { id: true } });
  if (!ie) throw new Error("IE country not found");

  // ---- PageContent (EN) ----
  const pc = await prisma.pageContent.findUnique({
    where: { countryId_pageKey: { countryId: ie.id, pageKey: PAGE_KEY } },
  });
  if (!pc) throw new Error("IE HEALTH_TESTS PageContent row missing — expected PUBLISHED row.");

  const before = await prisma.pageContentTranslation.findUnique({
    where: { pageContentId_locale: { pageContentId: pc.id, locale: LOCALE } },
    select: { heroTitle: true, seoTitle: true, intro: true, whyChooseTitle: true },
  });
  console.log("\nPageContent EN — BEFORE:");
  console.log("  heroTitle:", before?.heroTitle ?? "(null → bundle fallback)");
  console.log("  seoTitle :", before?.seoTitle ?? "(null → hub fallback)");
  console.log("  intro    :", (before?.intro ?? "").slice(0, 80) + "…");

  if (APPLY) {
    await prisma.pageContent.update({
      where: { id: pc.id },
      data: { showIntro: true, showWhoFor: true, showWhyChoose: true, showFaq: true, showDisclaimer: true },
    });
    await prisma.pageContentTranslation.upsert({
      where: { pageContentId_locale: { pageContentId: pc.id, locale: LOCALE } },
      create: {
        pageContentId: pc.id,
        locale: LOCALE,
        heroTitle: HERO_TITLE,
        heroSubtitle: HERO_SUBTITLE,
        seoTitle: SEO_TITLE,
        seoDescription: SEO_DESCRIPTION,
        intro: INTRO,
        whoForTitle: WHO_FOR_TITLE,
        whoForIntro: WHO_FOR_INTRO,
        whoForItems: WHO_FOR_ITEMS,
        whyChooseTitle: WHY_CHOOSE_TITLE,
        whyChooseItems: WHY_CHOOSE_ITEMS,
        faq: FAQ,
        disclaimerParagraphs: DISCLAIMER_PARAGRAPHS,
        disclaimerShort: DISCLAIMER_SHORT,
      },
      update: {
        heroTitle: HERO_TITLE,
        heroSubtitle: HERO_SUBTITLE,
        seoTitle: SEO_TITLE,
        seoDescription: SEO_DESCRIPTION,
        intro: INTRO,
        whoForTitle: WHO_FOR_TITLE,
        whoForIntro: WHO_FOR_INTRO,
        whoForItems: WHO_FOR_ITEMS,
        whyChooseTitle: WHY_CHOOSE_TITLE,
        whyChooseItems: WHY_CHOOSE_ITEMS,
        faq: FAQ,
        disclaimerParagraphs: DISCLAIMER_PARAGRAPHS,
        disclaimerShort: DISCLAIMER_SHORT,
      },
    });
  }
  console.log("PageContent EN — AFTER:", APPLY ? "written" : "(dry run — would write Randox copy)");

  // ---- HealthTest cards (base + EN translation) ----
  const rows: Array<{ slug: string; field: string; before: string | null; after: string }> = [];
  for (const [slug, next] of Object.entries(HEALTH_TESTS)) {
    const ht = await prisma.healthTest.findUnique({
      where: { countryId_slug: { countryId: ie.id, slug } },
      select: { id: true, resultsTimeline: true, sampleType: true, shortDescription: true },
    });
    if (!ht) {
      console.log(`  !! HealthTest ${slug} not found — skipped`);
      continue;
    }
    rows.push({ slug, field: "resultsTimeline", before: ht.resultsTimeline, after: next.resultsTimeline });
    rows.push({ slug, field: "sampleType", before: ht.sampleType, after: next.sampleType });
    rows.push({ slug, field: "shortDescription", before: (ht.shortDescription ?? "").slice(0, 40) + "…", after: next.shortDescription.slice(0, 40) + "…" });

    if (APPLY) {
      await prisma.healthTest.update({
        where: { id: ht.id },
        data: { resultsTimeline: next.resultsTimeline, sampleType: next.sampleType, shortDescription: next.shortDescription },
      });
      await prisma.healthTestTranslation.updateMany({
        where: { healthTestId: ht.id, locale: LOCALE },
        data: { resultsTimeline: next.resultsTimeline, sampleType: next.sampleType, shortDescription: next.shortDescription },
      });
    }
  }
  console.log(`\nHealthTest cards — ${APPLY ? "APPLIED" : "DRY RUN"}:`);
  console.table(rows);

  if (!APPLY) console.log("\nRe-run with --apply to write to PROD.");
  else console.log("\n✅ Applied to PROD. IE non-EN locales still need a translation pass (see header).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
