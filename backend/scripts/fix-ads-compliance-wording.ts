/**
 * Ads-policy content corrections from docs/MULTILINGUAL_AND_ADS_COMPLIANCE_AUDIT.md
 * ("Post-translation ads-policy scan" section).
 *
 * Fix 1 — syphilis cure-claim (Google healthcare: no affirmative cure claims).
 *   Service slug `saude-sexual-ist-online` (country br): the "does syphilis
 *   have a cure?" ServiceFaq (base PT + EN/ES translations), reworded from
 *   an affirmative cure claim to a treatability claim. Also strips the
 *   "curável"/"curable" half of the "tratável e curável" detailBody phrase
 *   in all three locales.
 *
 * Fix 2 — Brazil statute jurisdiction scope (EN/ES only). Across all br
 *   ServiceFaqTranslation rows (locale EN/ES) whose answer cites Law
 *   14.510/2022 with a "guarantees nationwide validity" framing, reword to
 *   jurisdiction-scoped phrasing ("Under Brazilian federal law (...),
 *   acts ... are valid throughout Brazil"). PT base is left as-is (correct
 *   for Brazilian readers) since the task only requires EN/ES.
 *
 * Usage:
 *   npx tsx scripts/fix-ads-compliance-wording.ts                 # dry run (default)
 *   I18N_SNAPSHOT_CONFIRMED=1 npx tsx scripts/fix-ads-compliance-wording.ts --apply
 */
import "dotenv/config";
import { prisma, disconnectDb } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const CONFIRMED = process.env.I18N_SNAPSHOT_CONFIRMED === "1";
const DRY_RUN = !(APPLY && CONFIRMED);

type Change = {
  entity: string;
  slug: string;
  locale: string;
  field: string;
  oldText: string;
  newText: string;
};

const changes: Change[] = [];

function excerpt(full: string, changed: string, pad = 150): { old: string; next: string } {
  const i = full.indexOf(changed);
  if (i < 0) return { old: full.slice(0, pad * 2), next: full.slice(0, pad * 2) };
  const start = Math.max(0, i - pad);
  const end = Math.min(full.length, i + changed.length + pad);
  return { old: `...${full.slice(start, end)}...`, next: "" };
}

function record(
  entity: string,
  slug: string,
  locale: string,
  field: string,
  oldFull: string,
  newFull: string,
) {
  // Find the first differing region to center the excerpt on.
  let i = 0;
  const minLen = Math.min(oldFull.length, newFull.length);
  while (i < minLen && oldFull[i] === newFull[i]) i++;
  let jOld = oldFull.length;
  let jNew = newFull.length;
  while (jOld > i && jNew > i && oldFull[jOld - 1] === newFull[jNew - 1]) {
    jOld--;
    jNew--;
  }
  const pad = 150;
  const oldExcerpt = `...${oldFull.slice(Math.max(0, i - pad), Math.min(oldFull.length, jOld + pad))}...`;
  const newExcerpt = `...${newFull.slice(Math.max(0, i - pad), Math.min(newFull.length, jNew + pad))}...`;
  changes.push({ entity, slug, locale, field, oldText: oldExcerpt, newText: newExcerpt });
}

// ---------------------------------------------------------------------------
// Fix 1: syphilis cure-claim FAQ + detailBody "curável"/"curable" trim.
// ---------------------------------------------------------------------------

async function fixSyphilisCureClaim() {
  const svc = await prisma.service.findFirst({
    where: { slug: "saude-sexual-ist-online", country: { code: "br" } },
    include: { faqs: { include: { translations: true } }, translations: true },
  });
  if (!svc) {
    console.warn("saude-sexual-ist-online (br) not found — skipping Fix 1");
    return;
  }

  const faq = svc.faqs.find((f) => f.question.includes("cura"));
  if (!faq) {
    console.warn("syphilis-cure FAQ not found on saude-sexual-ist-online — skipping FAQ part of Fix 1");
  } else {
    // PT base
    const ptOldQ = faq.question;
    const ptNewQ = "A sífilis tem tratamento?";
    const ptOldA = faq.answer;
    const ptCureSentence = "a sífilis tem cura com tratamento adequado com penicilina benzatina";
    if (ptOldA.toLowerCase().includes(ptCureSentence)) {
      const ptNewA = ptOldA.replace(
        /a sífilis tem cura com tratamento adequado com penicilina benzatina/i,
        "o tratamento da sífilis com penicilina benzatina é altamente eficaz quando indicado pelo médico",
      );
      record("ServiceFaq", svc.slug, "PT (base)", "question", ptOldQ, ptNewQ);
      record("ServiceFaq", svc.slug, "PT (base)", "answer", ptOldA, ptNewA);
      if (APPLY && CONFIRMED) {
        await prisma.serviceFaq.update({
          where: { id: faq.id },
          data: { question: ptNewQ, answer: ptNewA },
        });
      }
    } else {
      console.warn(`PT base answer text didn't match expected cure phrase, got: ${ptOldA}`);
    }

    const en = faq.translations.find((t) => t.locale === "EN");
    if (en) {
      const enOldQ = en.question;
      const enNewQ = "Can syphilis be treated?";
      const enOldA = en.answer;
      const enCureSentence = "syphilis is curable with appropriate treatment with benzathine penicillin";
      if (enOldA.toLowerCase().includes(enCureSentence)) {
        const enNewA = enOldA.replace(
          /syphilis is curable with appropriate treatment with benzathine penicillin/i,
          "syphilis is treatable — treatment with benzathine penicillin is highly effective when indicated by a doctor",
        );
        record("ServiceFaqTranslation", svc.slug, "EN", "question", enOldQ, enNewQ);
        record("ServiceFaqTranslation", svc.slug, "EN", "answer", enOldA, enNewA);
        if (APPLY && CONFIRMED) {
          await prisma.serviceFaqTranslation.update({
            where: { id: en.id },
            data: { question: enNewQ, answer: enNewA },
          });
        }
      } else {
        console.warn(`EN answer text didn't match expected cure phrase, got: ${enOldA}`);
      }
    }

    const es = faq.translations.find((t) => t.locale === "ES");
    if (es) {
      const esOldQ = es.question;
      const esNewQ = "¿La sífilis tiene tratamiento?";
      const esOldA = es.answer;
      const esCureSentence = "la sífilis tiene cura con tratamiento adecuado con penicilina benzatina";
      if (esOldA.toLowerCase().includes(esCureSentence)) {
        const esNewA = esOldA.replace(
          /la sífilis tiene cura con tratamiento adecuado con penicilina benzatina/i,
          "el tratamiento de la sífilis con penicilina benzatina es altamente eficaz cuando lo indica el médico",
        );
        record("ServiceFaqTranslation", svc.slug, "ES", "question", esOldQ, esNewQ);
        record("ServiceFaqTranslation", svc.slug, "ES", "answer", esOldA, esNewA);
        if (APPLY && CONFIRMED) {
          await prisma.serviceFaqTranslation.update({
            where: { id: es.id },
            data: { question: esNewQ, answer: esNewA },
          });
        }
      } else {
        console.warn(`ES answer text didn't match expected cure phrase, got: ${esOldA}`);
      }
    }
  }

  // detailBody "tratável e curável" / "treatable and curable" trim — base + EN/ES translations.
  const detailTargets: { locale: string; text: string | null | undefined; isBase: boolean; translationId?: string }[] = [
    { locale: "PT (base)", text: svc.detailBody, isBase: true },
    ...svc.translations
      .filter((t) => t.locale === "EN" || t.locale === "ES")
      .map((t) => ({ locale: t.locale, text: t.detailBody, isBase: false, translationId: t.id })),
  ];

  const cureAndTreatablePatterns: [RegExp, string][] = [
    [/A sífilis é tratável e curável( —)?/i, "A sífilis é tratável$1"],
    [/La sífilis es tratable y curable( —)?/i, "La sífilis es tratable$1"],
    [/Syphilis is treatable and curable( —)?/i, "Syphilis is treatable$1"],
  ];

  for (const target of detailTargets) {
    if (!target.text) continue;
    for (const [pattern, replacement] of cureAndTreatablePatterns) {
      if (pattern.test(target.text)) {
        const newText = target.text.replace(pattern, replacement);
        record(
          target.isBase ? "Service" : "ServiceTranslation",
          svc.slug,
          target.locale,
          "detailBody",
          target.text,
          newText,
        );
        if (APPLY && CONFIRMED) {
          if (target.isBase) {
            await prisma.service.update({ where: { id: svc.id }, data: { detailBody: newText } });
          } else {
            await prisma.serviceTranslation.update({
              where: { id: target.translationId! },
              data: { detailBody: newText },
            });
          }
        }
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Fix 2: Law 14.510/2022 jurisdiction-scope wording (EN/ES only).
// ---------------------------------------------------------------------------

const LAW_14510_PATTERNS: [RegExp, string][] = [
  // EN — "Law 14.510/2022 guarantees national/nationwide validity for acts
  // performed/carried out by/via/through telemedicine." (all comma/period
  // number-format + verb variants collapse to one jurisdiction-scoped form.)
  [
    /Law 14[.,]510\/2022 guarantees (?:national|nationwide) validity for acts (?:performed|carried out) (?:by|via|through) telemedicine\./,
    "Under Brazilian federal law (Law 14.510/2022), acts performed via telemedicine are valid throughout Brazil.",
  ],
  [
    /Law 14\.510\/2022 establishes that acts performed by telemedicine are valid throughout the national territory\./,
    "Under Brazilian federal law (Law 14.510/2022), acts performed via telemedicine are valid throughout Brazil's national territory.",
  ],
  [
    /has legal validity guaranteed by CFM Resolution 2\.314\/2022 and Law 14\.510\/2022/,
    "has legal validity under Brazilian law (CFM Resolution 2.314/2022 and Law 14.510/2022)",
  ],
  // ES — analogous.
  [
    /La Ley 14[.,]510\/2022 garantiza validez nacional para los actos (?:realizados|practicados) por telemedicina\./,
    "Según la ley federal brasileña (Ley 14.510/2022), los actos realizados por telemedicina son válidos en todo Brasil.",
  ],
  [
    /La Ley 14\.510\/2022 establece que los actos realizados por telemedicina tienen validez en todo el territorio nacional\./,
    "Según la ley federal brasileña (Ley 14.510/2022), los actos realizados por telemedicina son válidos en todo el territorio nacional de Brasil.",
  ],
  [
    /tiene validez legal garantizada por la Resolución CFM 2\.314\/2022 y por la Ley 14\.510\/2022/,
    "tiene validez legal según la ley brasileña (Resolución CFM 2.314/2022 y Ley 14.510/2022)",
  ],
];

async function fixLaw14510Scope() {
  const rows = await prisma.serviceFaqTranslation.findMany({
    where: {
      locale: { in: ["EN", "ES"] },
      serviceFaq: { service: { country: { code: "br" } } },
      OR: [{ answer: { contains: "14.510" } }, { answer: { contains: "14,510" } }],
    },
    include: { serviceFaq: { include: { service: true } } },
  });

  for (const row of rows) {
    let newAnswer = row.answer;
    let matched = false;
    for (const [pattern, replacement] of LAW_14510_PATTERNS) {
      if (pattern.test(newAnswer)) {
        newAnswer = newAnswer.replace(pattern, replacement);
        matched = true;
      }
    }
    if (!matched) {
      console.warn(
        `[Fix 2] no known jurisdiction-scope pattern matched ${row.serviceFaq.service.slug}/${row.locale}/${row.id}: ${row.answer}`,
      );
      continue;
    }
    if (newAnswer === row.answer) continue;
    record(
      "ServiceFaqTranslation",
      row.serviceFaq.service.slug,
      row.locale,
      "answer",
      row.answer,
      newAnswer,
    );
    if (APPLY && CONFIRMED) {
      await prisma.serviceFaqTranslation.update({ where: { id: row.id }, data: { answer: newAnswer } });
    }
  }
}

async function main() {
  await fixSyphilisCureClaim();
  await fixLaw14510Scope();

  console.log(`\n${"=".repeat(80)}`);
  console.log(`${changes.length} change(s) ${DRY_RUN ? "(DRY RUN — no writes)" : "(APPLIED)"}`);
  console.log("=".repeat(80));
  for (const c of changes) {
    console.log(`\n[${c.entity}] slug=${c.slug} locale=${c.locale} field=${c.field}`);
    console.log(`  OLD: ${c.oldText}`);
    console.log(`  NEW: ${c.newText}`);
  }

  if (DRY_RUN) {
    console.log(
      `\nDry run complete. Re-run with --apply and I18N_SNAPSHOT_CONFIRMED=1 to write these ${changes.length} change(s).`,
    );
  } else {
    console.log(`\nApplied ${changes.length} change(s).`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
