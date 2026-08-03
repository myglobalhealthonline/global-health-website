/**
 * SEO fix (2026-08-04, OpenSEO live-data pass — Phase 2, Ireland lab tests).
 *
 * `fbc blood test` (880/mo, KD 6) sits at #63, `full blood count` (390, KD 22)
 * at #81, `thyroid test` (320, KD 8) at #80. Both pages already carry
 * keyword-matched titles inside budget, so this is not a metadata problem —
 * the pages are thin (32-34 word intro, zero FAQs) against competitors that
 * answer the query on the page.
 *
 * Four separate defects, in descending order of severity:
 *
 *   1. FACTUAL — every lab-test meta description promises "results in 3-5
 *      working days". The product's own `resultsTimeline` is "Up to 10 days"
 *      and the hub page says "up to 10 days". A searcher clicks a SERP snippet
 *      promising 3-5 days and buys a 10-day test. 12 rows across 2 tests × 6
 *      locales. Fixed by per-locale phrase replacement, not a full rewrite.
 *   2. RENDERING — the Thyroid intro's em dashes are stored as U+FFFD and
 *      render on the live page as "TSH, T3, and T4 ? to assess...". All 6
 *      locales. Any row containing U+FFFD gets it replaced with an em dash.
 *   3. DEPTH — EN intros expanded to answer the query on the page. EN only:
 *      the other five locales are translation work, not a mechanical patch,
 *      and are deliberately left for a translation pass.
 *   4. TRUNCATION — the lab-tests hub's non-EN titles run 69-85 chars and its
 *      descriptions 217-297. EN (57/217) keeps its title; its description is
 *      shortened with the rest.
 *
 * The copy states no diagnostic claims and no turnaround the product data does
 * not support. It still wants a clinician's eye before it is treated as final.
 *
 *   node --env-file=.env --import tsx scripts/patch-ie-lab-tests-phase-2.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/patch-ie-lab-tests-phase-2.ts --apply   # write
 */
import "dotenv/config";
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const COUNTRY = "ie";
const FBC = "Full Blood Count";
const THYROID = "Thyroid Function Test";

const DESC_BUDGET = 155;
const TITLE_BUDGET = 60;
const REPLACEMENT_CHAR = "�";

const len = (v: string) => Array.from(v).length;

/**
 * Defect 1. Per-locale "3-5 working days" phrasing → the real "up to 10 days".
 * Applied as a substring swap so it survives any other edit to the sentence,
 * and is self-idempotent (the AFTER text cannot match the BEFORE pattern).
 */
const TIMELINE_SWAPS: Array<{ locale: LocaleCode | "BASE"; from: string; to: string }> = [
  { locale: "BASE", from: "Fast results in 3-5 working days.", to: "Results in up to 10 days." },
  { locale: "EN", from: "Fast results in 3-5 working days.", to: "Results in up to 10 days." },
  {
    locale: "EN",
    from: "Fast digital results in 3-5 working days.",
    to: "Digital results in up to 10 days.",
  },
  {
    locale: "PT",
    from: "Resultados rápidos em 3-5 dias úteis.",
    to: "Resultados em até 10 dias.",
  },
  {
    locale: "PT",
    from: "Resultados digitais rápidos em 3-5 dias úteis.",
    to: "Resultados digitais em até 10 dias.",
  },
  {
    locale: "ES",
    from: "Resultados rápidos en 3-5 días laborables.",
    to: "Resultados en hasta 10 días.",
  },
  {
    locale: "ES",
    from: "Resultados digitales rápidos en 3-5 días laborables.",
    to: "Resultados digitales en hasta 10 días.",
  },
  {
    locale: "CS",
    from: "Rychlé výsledky za 3–5 pracovních dnů.",
    to: "Výsledky do 10 dnů.",
  },
  {
    locale: "CS",
    from: "Rychlé digitální výsledky za 3–5 pracovních dnů.",
    to: "Digitální výsledky do 10 dnů.",
  },
  {
    locale: "RO",
    from: "Rezultate rapide în 3-5 zile lucrătoare.",
    to: "Rezultate în până la 10 zile.",
  },
  {
    locale: "RO",
    from: "Rezultate digitale rapide în 3-5 zile lucrătoare.",
    to: "Rezultate digitale în până la 10 zile.",
  },
  {
    locale: "DE",
    from: "Schnelle Ergebnisse in 3-5 Werktagen.",
    to: "Ergebnisse in bis zu 10 Tagen.",
  },
  {
    locale: "DE",
    from: "Schnelle digitale Ergebnisse in 3-5 Werktagen.",
    to: "Digitale Ergebnisse in bis zu 10 Tagen.",
  },
];

/** Defect 3. EN-only intro expansion, guarded on the exact stored value. */
const INTROS: Record<string, { before: string; after: string }> = {
  [FBC]: {
    before:
      "<p>A Full Blood Count (FBC) is one of the most commonly requested blood tests. It measures the levels of different cells in your blood and helps detect a wide range of conditions.</p>",
    after:
      "<p>A Full Blood Count (FBC) — also called a complete blood count — is one of the most commonly requested blood tests in Ireland. It measures the different cell types in your blood: red cells and haemoglobin, the five types of white cell, and platelets.</p>" +
      "<p>Because those three groups respond to very different things, one FBC gives a broad picture in a single sample. Low haemoglobin or a low red cell count can point toward anaemia. A raised white cell count is one of the body's responses to infection or inflammation. Platelets are what your blood uses to clot, so an abnormal count is relevant to unexplained bruising or bleeding.</p>" +
      "<p>Your kit is provided and analysed by Randox, a UKAS-accredited laboratory. You take the sample at home — finger prick or venous draw — post it back, and results are returned in up to 10 days. An FBC narrows down what to look at next rather than diagnosing a condition on its own, so if anything falls outside the reference range you can book a follow-up video consultation with an IMC-registered doctor to go through what it means for you.</p>",
  },
  [THYROID]: {
    before:
      `<p>The Thyroid Function Test measures levels of key thyroid hormones ${REPLACEMENT_CHAR} TSH, T3, and T4 ${REPLACEMENT_CHAR} to assess how well your thyroid gland is working. It is used to diagnose or monitor thyroid disorders.</p>`,
    after:
      "<p>A thyroid function test measures the three hormones that show how your thyroid gland is working: TSH, free T4 (thyroxine) and free T3 (triiodothyronine).</p>" +
      "<p>TSH is the signal your pituitary gland sends to the thyroid, which is why it usually moves first and moves most. A raised TSH with a low T4 is the pattern associated with an underactive thyroid (hypothyroidism); a suppressed TSH with a raised T4 or T3 is the pattern associated with an overactive one (hyperthyroidism). Reading all three together is what separates those, and it is also how an existing thyroid treatment is monitored over time.</p>" +
      "<p>The symptoms that bring people to this test — persistent fatigue, unexplained weight change, feeling cold or overheated, hair or nail changes, low mood or anxiety — overlap with a great many other things, which is exactly why a measurement is more useful than a symptom list. Your sample is analysed by Randox, a UKAS-accredited laboratory, using a self-collection kit posted to you, with results in up to 10 days. Thyroid results need interpreting against your symptoms and history, so a follow-up video consultation with an IMC-registered doctor is available once yours arrive.</p>",
  },
};

/** Defect 3. EN FAQs. Base rows only — HealthTestFaqTranslation is a later pass. */
const FAQS: Record<string, Array<{ question: string; answer: string }>> = {
  [FBC]: [
    {
      question: "What does a full blood count test for?",
      answer:
        "An FBC measures your red blood cells and haemoglobin, your white blood cells and their five sub-types, and your platelets. It also reports derived values such as mean corpuscular volume (MCV) and haematocrit. Together these are used to look for anaemia, signs of infection or inflammation, and clotting problems.",
    },
    {
      question: "Do I need to fast before an FBC blood test?",
      answer:
        "No. A full blood count does not require fasting, so you can take your sample at any time of day. If your doctor has asked you to combine it with a test that does require fasting, such as a lipid or glucose panel, follow the instruction for that test.",
    },
    {
      question: "How long do FBC results take in Ireland?",
      answer:
        "Results are returned in up to 10 days from the point your sample reaches the laboratory. You will receive them digitally.",
    },
    {
      question: "Is it a finger prick or a blood draw?",
      answer:
        "Both options are available for this test. The finger prick kit is taken entirely at home; a venous draw collects a larger sample and is the better choice if you have had difficulty with finger-prick collection before.",
    },
    {
      question: "What happens if my results are abnormal?",
      answer:
        "A result outside the reference range is a reason to look further, not a diagnosis on its own — several everyday factors, including a recent infection, can move these numbers. You can book a follow-up video consultation with an IMC-registered doctor to review your results in the context of your symptoms and history.",
    },
  ],
  [THYROID]: [
    {
      question: "What does a thyroid function test measure?",
      answer:
        "It measures thyroid stimulating hormone (TSH), free T4 (thyroxine) and free T3 (triiodothyronine). TSH is the signal from your pituitary gland to your thyroid; T4 and T3 are the hormones the thyroid itself produces.",
    },
    {
      question: "What TSH level indicates an underactive thyroid?",
      answer:
        "Reference ranges vary by laboratory and are reported alongside your result. Broadly, a raised TSH together with a low free T4 is the pattern associated with hypothyroidism, and a suppressed TSH with a raised T4 or T3 is the pattern associated with hyperthyroidism. Interpretation depends on your symptoms, any medication you take, and pregnancy, which is why results should be reviewed with a doctor rather than read against a range alone.",
    },
    {
      question: "Do I need to fast for a thyroid test?",
      answer:
        "No fasting is required. If you take levothyroxine or another thyroid medication, take your sample before that day's dose and tell your doctor when you last took it, as timing affects the reading.",
    },
    {
      question: "How long do thyroid test results take?",
      answer:
        "Results are returned digitally in up to 10 days from the point your sample reaches the laboratory.",
    },
    {
      question: "Can I use this test to monitor thyroid treatment?",
      answer:
        "Yes. Monitoring an established hypothyroidism or hyperthyroidism is one of the common reasons for this test. Any change to your dose should be made by the doctor managing your treatment, working from these results.",
    },
  ],
};

/** Defect 4. Lab-tests hub. EN title is already inside budget and stays. */
const HUB: Array<{ locale: LocaleCode; title: string | null; desc: string }> = [
  {
    locale: "EN",
    title: null,
    desc: "Order a Randox home blood test kit in Ireland from €89 — Full Blood Count, Thyroid Function and more. Results in up to 10 days.",
  },
  {
    locale: "PT",
    title: "Testes de Sangue em Casa Irlanda | Randox | Global Health",
    desc: "Encomende um kit Randox de teste de sangue na Irlanda a partir de €89 — hemograma completo, função tiroideia e mais. Resultados em até 10 dias.",
  },
  {
    locale: "ES",
    title: "Análisis de Sangre en Casa Irlanda | Randox | Global Health",
    desc: "Pide un kit Randox de análisis de sangre en Irlanda desde €89 — hemograma completo, función tiroidea y más. Resultados en hasta 10 días.",
  },
  {
    locale: "CS",
    title: "Domácí krevní testy Irsko | Randox | Global Health",
    desc: "Objednejte si domácí sadu Randox na krevní testy v Irsku od 89 € — kompletní krevní obraz, funkce štítné žlázy a další. Výsledky do 10 dnů.",
  },
  {
    locale: "RO",
    title: "Teste de Sânge la Domiciliu Irlanda | Randox | Global Health",
    desc: "Comandă un kit Randox de test de sânge în Irlanda de la 89 € — hemoleucogramă completă, funcția tiroidiană și altele. Rezultate în până la 10 zile.",
  },
  {
    locale: "DE",
    title: "Bluttests für zu Hause Irland | Randox | Global Health",
    desc: "Bestellen Sie ein Randox-Bluttest-Kit in Irland ab 89 € — großes Blutbild, Schilddrüsenfunktion und mehr. Ergebnisse in bis zu 10 Tagen.",
  },
];

function assertBudgets() {
  const over: string[] = [];
  for (const h of HUB) {
    if (h.title && len(h.title) > TITLE_BUDGET) {
      over.push(`hub:${h.locale} title ${len(h.title)} > ${TITLE_BUDGET}`);
    }
    if (len(h.desc) > DESC_BUDGET) {
      over.push(`hub:${h.locale} description ${len(h.desc)} > ${DESC_BUDGET}`);
    }
  }
  if (over.length > 0) throw new Error(`Proposed copy over budget:\n  ${over.join("\n  ")}`);
}

/** Applies whichever timeline swaps match; returns null when none do. */
function swapTimeline(value: string | null, locale: LocaleCode | "BASE"): string | null {
  if (!value) return null;
  let out = value;
  for (const s of TIMELINE_SWAPS) {
    if (s.locale === locale && out.includes(s.from)) out = out.split(s.from).join(s.to);
  }
  return out === value ? null : out;
}

const fixMojibake = (value: string | null): string | null =>
  value && value.includes(REPLACEMENT_CHAR) ? value.split(REPLACEMENT_CHAR).join("—") : null;

async function main() {
  assertBudgets();
  let writes = 0;

  const tests = await prisma.healthTest.findMany({
    where: { country: { code: COUNTRY }, title: { in: [FBC, THYROID] } },
    select: {
      id: true,
      title: true,
      detailIntro: true,
      seoDescription: true,
      faqs: { select: { id: true } },
      translations: {
        select: { id: true, locale: true, detailIntro: true, seoDescription: true },
        orderBy: { locale: "asc" },
      },
    },
  });

  for (const t of tests) {
    console.log(`\n=== ${t.title}`);

    // --- base row: timeline + mojibake + EN intro expansion
    const baseDesc = swapTimeline(t.seoDescription, "BASE");
    const introSpec = INTROS[t.title];
    let baseIntro = fixMojibake(t.detailIntro);
    if (introSpec) {
      if (t.detailIntro === introSpec.after) {
        console.log("  intro: already expanded");
      } else if (t.detailIntro === introSpec.before) {
        baseIntro = introSpec.after;
        console.log(`  intro: ${len(introSpec.before)} -> ${len(introSpec.after)} chars (expanded)`);
      } else if (baseIntro) {
        console.log("  intro: mojibake fixed only (text differs from the 2026-08-04 baseline)");
      } else {
        console.log("  intro: SKIPPED — differs from the 2026-08-04 baseline");
      }
    }
    if (baseDesc) console.log(`  base desc -> ${baseDesc}`);
    if (baseIntro || baseDesc) {
      writes += 1;
      if (APPLY) {
        await prisma.healthTest.update({
          where: { id: t.id },
          data: {
            ...(baseIntro ? { detailIntro: baseIntro } : {}),
            ...(baseDesc ? { seoDescription: baseDesc } : {}),
          },
        });
      }
    }

    // --- translations: timeline + mojibake (EN also gets the intro expansion)
    for (const tr of t.translations) {
      const desc = swapTimeline(tr.seoDescription, tr.locale);
      let intro = fixMojibake(tr.detailIntro);
      if (tr.locale === "EN" && introSpec && tr.detailIntro === introSpec.before) {
        intro = introSpec.after;
      }
      if (!desc && !intro) continue;
      console.log(`  [${tr.locale}]${intro ? " intro" : ""}${desc ? ` desc -> ${desc}` : ""}`);
      writes += 1;
      if (APPLY) {
        await prisma.healthTestTranslation.update({
          where: { id: tr.id },
          data: { ...(intro ? { detailIntro: intro } : {}), ...(desc ? { seoDescription: desc } : {}) },
        });
      }
    }

    // --- FAQs: only ever seeded into an empty set, never merged or replaced
    const faqs = FAQS[t.title] ?? [];
    if (t.faqs.length > 0) {
      console.log(`  faqs: SKIPPED — ${t.faqs.length} already exist`);
    } else if (faqs.length > 0) {
      console.log(`  faqs: + ${faqs.length} new`);
      writes += faqs.length;
      if (APPLY) {
        await prisma.healthTestFaq.createMany({
          data: faqs.map((f, i) => ({
            healthTestId: t.id,
            question: f.question,
            answer: f.answer,
            sortOrder: i,
          })),
        });
      }
    }
  }

  console.log("\n=== lab-tests hub");
  const hub = await prisma.pageContent.findFirst({
    where: { country: { code: COUNTRY }, pageKey: "HEALTH_TESTS" },
    select: {
      id: true,
      translations: { select: { id: true, locale: true, seoTitle: true, seoDescription: true } },
    },
  });
  if (!hub) {
    console.log("  SKIPPED — no HEALTH_TESTS PageContent for ie");
  } else {
    for (const h of HUB) {
      const row = hub.translations.find((r) => r.locale === h.locale);
      if (!row) {
        console.log(`  [${h.locale}] SKIPPED — no row`);
        continue;
      }
      const setTitle = h.title !== null && row.seoTitle !== h.title;
      const setDesc = row.seoDescription !== h.desc;
      if (!setTitle && !setDesc) {
        console.log(`  [${h.locale}] already patched`);
        continue;
      }
      if (setTitle) console.log(`  [${h.locale}] title  [${len(row.seoTitle ?? "")}] -> [${len(h.title!)}] ${h.title}`);
      if (setDesc) console.log(`  [${h.locale}] desc   [${len(row.seoDescription ?? "")}] -> [${len(h.desc)}] ${h.desc}`);
      writes += 1;
      if (APPLY) {
        await prisma.pageContentTranslation.update({
          where: { id: row.id },
          data: { ...(setTitle ? { seoTitle: h.title! } : {}), ...(setDesc ? { seoDescription: h.desc } : {}) },
        });
      }
    }
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY-RUN"}: ${writes} change(s) ${APPLY ? "written" : "planned"}.`);
  if (!APPLY && writes > 0) console.log("Re-run with --apply to write.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
