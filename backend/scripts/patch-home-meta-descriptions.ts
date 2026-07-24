/**
 * SEO fix (July 2026): homepage meta descriptions for PT/ES/CS/RO run past
 * the 155-char SERP limit and get truncated mid-sentence live. The JSON
 * fallback template (frontend/locales/{pt,es,cs,ro}/common.json
 * homeMeta.descriptionTemplate) was already shortened in a prior commit,
 * but it's dormant — live descriptions come from CMS-managed
 * PageContentTranslation rows (pageKey HOME), which win over the JSON
 * fallback in frontend/app/(site)/[country]/[lang]/page.tsx's resolution
 * order (page?.seoDescription ?? extras?.seoDescription ?? template).
 *
 * This patches PageContentTranslation.seoDescription for the 4 HOME rows
 * (Country code pt/es/cz/ro, locale PT/ES/CS/RO) to shortened, pre-approved
 * exact strings. Idempotent: each update only fires when the stored value
 * still equals the known BEFORE text captured at query time this run.
 *
 *   node --env-file=.env --import tsx scripts/patch-home-meta-descriptions.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/patch-home-meta-descriptions.ts --apply    # write
 */
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

type Target = {
  countryCode: string;
  locale: LocaleCode;
  after: string;
};

const TARGETS: Target[] = [
  {
    // 2026-07-24 re-audit: IE/EN row is 167 chars, truncates live at 155 as
    // "...languages. Global…" — trimmed "consultation" + kept the brand close.
    countryCode: "ie",
    locale: "EN",
    after:
      "IMC-registered GPs available today — same-day appointments from €29. Sick certs, prescriptions, specialist referrals, 11 languages. Global Health Ireland.",
  },
  {
    // 2026-07-24 re-audit: BR/PT row is 170 chars, truncates live at 155 as
    // "...Consultas no…" — same trim style as the pt/PT row (Brazilian
    // "registrado"/"encaminhamentos" wording kept).
    countryCode: "br",
    locale: "PT",
    after:
      "Consulte hoje um médico registrado por videochamada — clínica geral, atestados médicos, encaminhamentos para especialistas. Mesmo dia no Brasil.",
  },
  {
    countryCode: "pt",
    locale: "PT",
    after:
      "Consulte hoje um médico registado por videochamada — clínica geral, atestados médicos, referenciações para especialistas. Mesmo dia em Portugal.",
  },
  {
    countryCode: "es",
    locale: "ES",
    after:
      "Consulte hoy con un médico colegiado por videollamada — medicina general, certificados médicos, derivaciones a especialistas. Mismo día en España.",
  },
  {
    countryCode: "cz",
    locale: "CS",
    after:
      "Promluvte si ještě dnes s registrovaným lékařem přes videohovor — praktický lékař, potvrzení, odeslání ke specialistovi. Tentýž den, Česko.",
  },
  {
    countryCode: "ro",
    locale: "RO",
    after:
      "Vorbiți azi cu un medic înregistrat prin apel video — medicină de familie, adeverințe medicale, trimiteri către specialiști. Aceeași zi, România.",
  },
];

type Fix = {
  countryCode: string;
  locale: LocaleCode;
  translationId: string;
  before: string;
  after: string;
};

async function main() {
  const fixes: Fix[] = [];

  console.log("Current PageContentTranslation.seoDescription for HOME (pt/es/cz/ro):\n");

  for (const t of TARGETS) {
    const country = await prisma.country.findUnique({
      where: { code: t.countryCode },
      select: { id: true, name: true },
    });
    if (!country) throw new Error(`Country ${t.countryCode} not found`);

    const page = await prisma.pageContent.findFirst({
      where: { countryId: country.id, pageKey: "HOME" },
      select: { id: true },
    });
    if (!page) throw new Error(`PageContent HOME not found for country ${t.countryCode}`);

    const translation = await prisma.pageContentTranslation.findUnique({
      where: { pageContentId_locale: { pageContentId: page.id, locale: t.locale } },
      select: { id: true, seoDescription: true },
    });
    if (!translation) {
      console.log(
        `SKIP: ${t.countryCode}/${t.locale} — no PageContentTranslation row found for this HOME page.`,
      );
      continue;
    }

    console.log(`--- ${country.name} (${t.countryCode} / ${t.locale}) — id ${translation.id} ---`);
    console.log(`current: ${JSON.stringify(translation.seoDescription)}`);
    console.log(`length:  ${translation.seoDescription?.length ?? 0} chars`);
    console.log("");

    if (translation.seoDescription === t.after) {
      console.log(`SKIP: ${t.countryCode}/${t.locale} — already set to the target text.\n`);
      continue;
    }

    fixes.push({
      countryCode: t.countryCode,
      locale: t.locale,
      translationId: translation.id,
      before: translation.seoDescription ?? "",
      after: t.after,
    });
  }

  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — ${fixes.length} change(s) found:\n`);
  for (const f of fixes) {
    console.log(`country/locale: ${f.countryCode}/${f.locale}`);
    console.log(`id:             ${f.translationId}`);
    console.log(`BEFORE (${f.before.length} chars): ${JSON.stringify(f.before)}`);
    console.log(`AFTER  (${f.after.length} chars): ${JSON.stringify(f.after)}`);
    console.log("");
  }

  if (!APPLY) {
    console.log("Dry run only — pass --apply to write.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const f of fixes) {
      // Guard against a concurrent edit between the read above and this
      // write: only update if the row still holds the exact BEFORE text.
      const result = await tx.pageContentTranslation.updateMany({
        where: { id: f.translationId, seoDescription: f.before },
        data: { seoDescription: f.after },
      });
      if (result.count === 0) {
        throw new Error(
          `Aborting: ${f.countryCode}/${f.locale} (id ${f.translationId}) changed since dry-run read — re-run to check current state.`,
        );
      }
    }
  });
  console.log(`Applied ${fixes.length} change(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
