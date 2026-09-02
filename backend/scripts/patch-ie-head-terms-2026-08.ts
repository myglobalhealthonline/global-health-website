/* eslint-disable no-console */
/**
 * Ireland head-term copy, August 2026. English rows ONLY — every edit is on a
 * per-locale translation row, so no English leaks into cs/de/es/pt/ro.
 *
 * Evidence (OpenSEO rank tracker aca3437b + Search Console, 2026-08-05):
 *
 *   medical chit        1,900/mo  KD 0  — not in the top 40; the phrase does
 *                                          not appear anywhere in the copy
 *   sick note online      260/mo  KD 0  — desktop absent, mobile 36; "sick
 *                                          note" appears, the exact phrase does not
 *   blood test dublin   1,600/mo  KD 0  — no page carries "Dublin" at all
 *
 * WHAT IS DELIBERATELY NOT TOUCHED
 *  - The lab-test hub seoTitle. It was rewritten on 2026-08-04 and its
 *    14-day read is not in yet; changing it again would destroy the only
 *    measurement of that change. "Dublin" goes into the description and hero
 *    subtitle now, and the title is revisited after 2026-08-18.
 *  - ServiceFaq rows. Their per-locale translations fall back to the base
 *    English question, so an English-only FAQ would render inside the Czech,
 *    German, Spanish, Portuguese and Romanian pages.
 *
 *   node --env-file=.env --import tsx scripts/patch-ie-head-terms-2026-08.ts           # dry run
 *   node --env-file=.env --import tsx scripts/patch-ie-head-terms-2026-08.ts --apply   # write
 *
 * .env points at PRODUCTION. Idempotent: every edit is an exact
 * find-and-replace that no-ops once applied.
 */
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

const SEO_DESC_MAX = 155;

/** One exact-string substitution. Reports, never guesses. */
type Swap = { label: string; from: string; to: string };

// --- 1. Service sick-certificate-ireland, EN translation -------------------
// The paragraph already lists the synonyms a reader might search for; this
// adds the two that were missing rather than bolting on new copy.
const SICK_CERT_SWAPS: Swap[] = [
  {
    label: "detailBody · synonym list",
    from: "A sick cert — also called a sick note or a medical certificate — is written confirmation from your doctor that you were medically unfit for work, and for how long.",
    to: "A sick cert — also called a sick note, a medical chit, or a medical certificate — is written confirmation from your doctor that you were medically unfit for work, and for how long. You can request a sick note online in Ireland without leaving home: the assessment is a secure video call and, where clinically appropriate, the certificate is issued electronically the same day.",
  },
];

// --- 2. PageContent HEALTH_TESTS, EN translation ---------------------------
const LAB_SWAPS: Swap[] = [
  {
    label: "seoDescription · current catalogue",
    from: "Order a Randox home blood test kit in Dublin or anywhere in Ireland from €89 — Full Blood Count, Thyroid Function and more. Results in up to 10 days.",
    to: "Order Randox home blood test kits in Dublin or anywhere in Ireland from €57. Turnaround varies by test, from 2–3 working days to 4–6 weeks.",
  },
  {
    label: "heroSubtitle · current catalogue",
    from: "Order a Randox home blood test kit, take your sample at home, and receive your results in up to 10 days. Kits are posted to Dublin and every other county in Ireland. Want a doctor to explain your results? Book a follow-up consultation with an IMC-registered Global Health doctor from €45.",
    to: "Order a Randox home blood test kit from €57. Kits are posted to Dublin and every other county; turnaround varies by test, from 2–3 working days to 4–6 weeks after the lab receives your sample. Want a doctor to explain your results? Book a follow-up consultation with an IMC-registered Global Health doctor from €45.",
  },
];

function applySwaps(field: string, value: string | null, swaps: Swap[]) {
  let next = value ?? "";
  const report: string[] = [];
  for (const swap of swaps) {
    if (next.includes(swap.to)) {
      report.push(`    = ${swap.label}: already applied`);
      continue;
    }
    if (!next.includes(swap.from)) {
      report.push(`    ! ${swap.label}: SOURCE TEXT NOT FOUND — copy changed since this script was written`);
      continue;
    }
    next = next.replace(swap.from, swap.to);
    report.push(`    ~ ${swap.label}: ${swap.from.length} → ${swap.to.length} chars`);
  }
  return { field, before: value ?? "", after: next, report, changed: next !== (value ?? "") };
}

async function main() {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — Ireland head-term copy\n`);
  const problems: string[] = [];

  const ie = await prisma.country.findFirst({ where: { code: "ie" }, select: { id: true } });
  if (!ie) throw new Error('country "ie" not found');

  // ---- 1. sick-certificate-ireland -----------------------------------------
  console.log("=== Service sick-certificate-ireland [EN] ===");
  const service = await prisma.service.findFirst({
    where: { countryId: ie.id, slug: "sick-certificate-ireland" },
    select: { id: true, translations: { where: { locale: "EN" }, select: { id: true, detailBody: true } } },
  });
  const svcEn = service?.translations[0];
  if (!svcEn) problems.push("sick-certificate-ireland has no EN translation row");
  else {
    const body = applySwaps("detailBody", svcEn.detailBody, SICK_CERT_SWAPS);
    body.report.forEach((line) => console.log(line));
    if (body.changed) {
      for (const term of ["medical chit", "sick note online"]) {
        if (!body.after.toLowerCase().includes(term)) problems.push(`sick-cert detailBody still missing "${term}"`);
      }
      if (APPLY) {
        await prisma.serviceTranslation.update({ where: { id: svcEn.id }, data: { detailBody: body.after } });
        console.log("    -> written");
      }
    }
  }

  // ---- 2. lab-test hub -----------------------------------------------------
  console.log("\n=== PageContent HEALTH_TESTS [EN] ===");
  const page = await prisma.pageContent.findFirst({
    where: { countryId: ie.id, pageKey: "HEALTH_TESTS" },
    select: {
      id: true,
      translations: { where: { locale: "EN" }, select: { id: true, seoTitle: true, seoDescription: true, heroSubtitle: true } },
    },
  });
  const pageEn = page?.translations[0];
  if (!pageEn) problems.push("HEALTH_TESTS has no EN translation row");
  else {
    const desc = applySwaps("seoDescription", pageEn.seoDescription, [LAB_SWAPS[0]]);
    const hero = applySwaps("heroSubtitle", pageEn.heroSubtitle, [LAB_SWAPS[1]]);
    [...desc.report, ...hero.report].forEach((line) => console.log(line));
    if (desc.after.length > SEO_DESC_MAX) {
      problems.push(`HEALTH_TESTS seoDescription would be ${desc.after.length} chars, over the ${SEO_DESC_MAX} budget`);
    }
    console.log(`    seoTitle left as-is (${(pageEn.seoTitle ?? "").length} chars): ${pageEn.seoTitle}`);
    console.log(`    seoDescription now ${desc.after.length}/${SEO_DESC_MAX}: ${desc.after}`);
    console.log(`    heroSubtitle now: ${hero.after}`);
    if (APPLY && problems.length === 0 && (desc.changed || hero.changed)) {
      await prisma.pageContentTranslation.update({
        where: { id: pageEn.id },
        data: {
          ...(desc.changed && { seoDescription: desc.after }),
          ...(hero.changed && { heroSubtitle: hero.after }),
        },
      });
      console.log("    -> written");
    }
  }

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):`);
    for (const p of problems) console.error(`  x ${p}`);
    process.exitCode = 1;
    return;
  }
  console.log(APPLY ? "\nDone.\n" : "\nDry run only — re-run with --apply to write.\n");
}

main().finally(() => prisma.$disconnect());
