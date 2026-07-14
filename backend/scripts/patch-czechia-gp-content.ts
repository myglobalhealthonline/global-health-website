/**
 * Patch Czechia GP-consultation page content (SEO title/description, hero
 * subtitle, CTA href, eNeschopenka/eRecept FAQs) + doctor title-prefix
 * cleanup + Dr Ahmed Maklad title fix.
 *
 *   node --import tsx scripts/patch-czechia-gp-content.ts            # dry-run
 *   node --import tsx scripts/patch-czechia-gp-content.ts --apply    # write
 *
 * SAFE BY DESIGN: every write matches on the *current* text, so re-running is
 * a no-op. Dry-run (default) prints exactly what would change; nothing is
 * written until you pass --apply. Modeled on patch-ireland-gp-content.ts.
 */
import { LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "cz";
const LOCALE: LocaleCode = "CS";
const APPLY = process.argv.includes("--apply");

const log: string[] = [];
const note = (m: string) => {
  log.push(m);
  console.log(m);
};

// ── Content ──────────────────────────────────────────────────────────────

const SEO_TITLE =
  "Online praktický lékař | Registrováno u ČLK | Global Health Česká republika";
const SEO_DESCRIPTION =
  "Konzultujte s praktickým lékařem registrovaným u ČLK z pohodlí domova. eNeschopenka, elektronický recept, doporučení ke specialistovi. Od 650 Kč. Termín ve stejný den.";
const HERO_SUBTITLE =
  "Praktičtí lékaři registrovaní k výkonu praxe v České republice";
const CTA_HREF = "/czechia/cs/book";

const SICKCERT_Q = "Může online lékař vystavit eNeschopenku?";
const SICKCERT_A =
  "Ano. Lékaři registrovaní u ČLK na platformě Global Health mohou vystavit elektronickou neschopenku (eNeschopenka) online prostřednictvím video konzultace. Elektronická neschopenka je platná po celé České republice a akceptována zaměstnavateli i Českou správou sociálního zabezpečení (ČSSZ). Pracovní neschopnost je předmětem klinického zhodnocení — lékař posoudí váš zdravotní stav a rozhodne o vystavení neschopenky na základě klinické indikace.";
const ERECEPT_Q = "Může online lékař vystavit elektronický recept?";
const ERECEPT_A =
  "Ano. Lékaři registrovaní u ČLK na platformě Global Health mohou vystavit elektronický recept (eRecept) pro léky na předpis, je-li to klinicky vhodné po provedení video konzultace. Elektronický recept je platný ve všech lékárnách v České republice. Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací.";

// Doctor fullName fixes (base col + any cz market translation).
const DOCTOR_NAME_FIXES: Array<[from: string, to: string]> = [
  ["Mudr. Romana Pavlu", "MUDr. Romana Pavlů"],
  ["Mudr. Vojtěch Černý", "MUDr. Vojtěch Černý"],
  ["Mudr. Yasmin Holz", "MUDr. Yasmin Holz"],
  ["Dr. Khoiamul Islam", "MUDr. Khoiamul Islam"],
];

const MAKLAD_NAME_MATCH = "Maklad";
const MAKLAD_TITLE_FROM = "Lékař";
const MAKLAD_TITLE_TO = "Praktický lékař";

// ── FAQ helper ───────────────────────────────────────────────────────────

type Faq = { question: string; answer: string };

function patchFaq(faq: Faq[]): { next: Faq[]; changed: string[] } {
  const changed: string[] = [];
  const next = [...faq];
  if (!next.some((f) => /eNeschopenku/i.test(f.question))) {
    next.push({ question: SICKCERT_Q, answer: SICKCERT_A });
    changed.push("FAQ appended: eNeschopenka Q");
  }
  if (!next.some((f) => /elektronický recept/i.test(f.question))) {
    next.push({ question: ERECEPT_Q, answer: ERECEPT_A });
    changed.push("FAQ appended: eRecept Q");
  }
  return { next, changed };
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);
  const countryId = country.id;

  await prisma.$transaction(
    async (tx) => {
      // 1) PageContentTranslation (CZ / GENERAL_CONSULTATION / CS).
      const pc = await tx.pageContent.findUnique({
        where: { countryId_pageKey: { countryId, pageKey: "GENERAL_CONSULTATION" } },
        select: { id: true, ctaHref: true, translations: { where: { locale: LOCALE } } },
      });
      if (!pc) {
        note("⚠ No PageContent row for CZ/GENERAL_CONSULTATION — skipping page copy.");
      } else if (pc.translations.length === 0) {
        note("⚠ No CS PageContentTranslation for CZ/GENERAL_CONSULTATION — skipping page copy.");
      } else {
        const t = pc.translations[0];
        const data: Prisma.PageContentTranslationUpdateInput = {};

        if (t.seoTitle !== SEO_TITLE) { data.seoTitle = SEO_TITLE; note(`seoTitle: ${t.seoTitle ?? "∅"} -> ${SEO_TITLE}`); }
        if (t.seoDescription !== SEO_DESCRIPTION) { data.seoDescription = SEO_DESCRIPTION; note("seoDescription updated"); }

        // heroSubtitle: only set/overwrite if null or currently mentions "Czechia".
        if (t.heroSubtitle == null || t.heroSubtitle.includes("Czechia")) {
          if (t.heroSubtitle !== HERO_SUBTITLE) {
            data.heroSubtitle = HERO_SUBTITLE;
            note(`heroSubtitle: ${t.heroSubtitle ?? "∅"} -> ${HERO_SUBTITLE}`);
          }
        } else {
          note(`heroSubtitle left as-is (not null/"Czechia"): ${t.heroSubtitle}`);
        }

        if (Array.isArray(t.faq)) {
          const { next, changed } = patchFaq(t.faq as unknown as Faq[]);
          if (changed.length) { data.faq = next as unknown as Prisma.InputJsonValue; changed.forEach(note); }
        } else {
          note("⚠ faq field empty/not an array — FAQ edits skipped.");
        }

        if (Object.keys(data).length && APPLY) {
          await tx.pageContentTranslation.update({ where: { id: t.id }, data });
        }

        // ctaHref lives on the base PageContent row, not the translation.
        if (pc.ctaHref !== CTA_HREF) {
          note(`ctaHref: ${pc.ctaHref ?? "∅"} -> ${CTA_HREF}`);
          if (APPLY) await tx.pageContent.update({ where: { id: pc.id }, data: { ctaHref: CTA_HREF } });
        }
      }

      // 2) Doctor fullName fixes. fullName lives only on the base Doctor row
      // (DoctorMarketTranslation has no fullName column — title/bio/seo only),
      // so there is no per-market translation to patch here.
      for (const [from, to] of DOCTOR_NAME_FIXES) {
        const base = await tx.doctor.updateMany({
          where: { countryId, fullName: { equals: from, mode: "insensitive" } },
          data: { fullName: to },
        });
        if (base.count) note(`Doctor fullName: "${from}" -> "${to}" (${base.count} row(s))`);
      }

      // Generic safety net: any cz doctor whose fullName still starts with
      // "Mudr." (lowercase u/dr) gets the prefix normalized.
      const stray = await tx.doctor.findMany({
        where: { countryId, fullName: { startsWith: "Mudr." } },
        select: { id: true, fullName: true },
      });
      for (const d of stray) {
        const to = d.fullName.replace(/^Mudr\./, "MUDr.");
        if (to !== d.fullName) {
          note(`Doctor fullName prefix fix: "${d.fullName}" -> "${to}"`);
          if (APPLY) await tx.doctor.update({ where: { id: d.id }, data: { fullName: to } });
        }
      }

      // 3) Dr Ahmed Maklad title: "Lékař" -> "Praktický lékař" (base + cs tr).
      const maklBase = await tx.doctor.updateMany({
        where: { countryId, title: MAKLAD_TITLE_FROM, fullName: { contains: MAKLAD_NAME_MATCH } },
        data: { title: MAKLAD_TITLE_TO },
      });
      const maklTr = await tx.doctorMarketTranslation.updateMany({
        where: {
          locale: LOCALE,
          title: MAKLAD_TITLE_FROM,
          doctorCountry: { country: { code: COUNTRY_CODE }, doctor: { fullName: { contains: MAKLAD_NAME_MATCH } } },
        },
        data: { title: MAKLAD_TITLE_TO },
      });
      if (maklBase.count || maklTr.count) note(`Doctor title (${MAKLAD_NAME_MATCH}): "${MAKLAD_TITLE_FROM}" -> "${MAKLAD_TITLE_TO}" (${maklBase.count} base, ${maklTr.count} tr)`);

      if (!APPLY) throw new ROLLBACK();
    },
    { timeout: 30_000 },
  ).catch((e) => {
    if (e instanceof ROLLBACK) return; // dry-run: intentional rollback
    throw e;
  });

  // 4) Verification report — cz GENERAL services, ordered as the page shows them.
  console.log("\n── cz GENERAL services (verification) ──");
  const services = await prisma.service.findMany({
    where: { countryId, kind: "GENERAL" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { slug: true, name: true, basePriceCents: true, currencyCode: true, isActive: true, sortOrder: true },
  });
  services.forEach((s, i) => {
    const price = s.basePriceCents != null ? `${(s.basePriceCents / 100).toFixed(2)} ${s.currencyCode ?? ""}`.trim() : "∅";
    console.log(`  [${i}] ${s.slug} — "${s.name}" — ${price} — active=${s.isActive} — sortOrder=${s.sortOrder}`);
  });

  console.log("\n────────────");
  console.log(
    APPLY
      ? `APPLIED: ${log.length} change(s) written for Czechia GP page.`
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
