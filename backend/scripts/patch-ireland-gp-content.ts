/**
 * Patch Ireland GP-consultation page content per the July 2026 SEO Content
 * Changes Brief (GlobalHealth_IrelandGP_ContentBrief.docx).
 *
 *   node --import tsx scripts/patch-ireland-gp-content.ts            # dry-run
 *   node --import tsx scripts/patch-ireland-gp-content.ts --apply    # write
 *
 * SAFE BY DESIGN: every write matches on the *current* text, so re-running is a
 * no-op and a wrong target simply matches 0 rows instead of corrupting data.
 * Dry-run (default) prints exactly what would change; nothing is written until
 * you pass --apply.
 *
 * Covers only the per-country DB fields (PageContentTranslation, Service,
 * Doctor, CountryFooter, Country). Deliberately NOT covered here — see the
 * triage doc docs/ireland-gp-content-brief-triage.md:
 *   - Romania/Brazil footer clinics (brief §10) — market go-live decision, not
 *     a copy edit; do NOT flip Country.isActive from a content script.
 *   - Hero bullets / review stat / Practice-areas H2 / Team H2 (brief items
 *     6,12,13,14,16,25) — these are GLOBAL i18n (gp.hero.*, gp.gpConsultations*)
 *     shared by every market, so IE-specific claims ("IMC-registered",
 *     "45,000 consultations") cannot live there without per-country plumbing.
 *   - Final-CTA / footer "across Europe" wording — done in code (frontend).
 */
import { LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ie";
const LOCALE: LocaleCode = "EN";
const APPLY = process.argv.includes("--apply");

/** Collected human-readable change log, printed at the end. */
const log: string[] = [];
const note = (m: string) => {
  log.push(m);
  console.log(m);
};

// ── Brief content (current -> new) ───────────────────────────────────────────

// PageContentTranslation scalar overrides (brief items 4, 5, 11, 23, 27).
const SEO_TITLE =
  "Online GP Consultation Ireland | IMC-Registered Doctor | Same Day | Global Health";
const SEO_DESCRIPTION =
  "See an IMC-registered GP online today — same-day appointments from €39. Sick certs, prescriptions, referrals and more. Available across Ireland in multiple languages.";
const HERO_SUBTITLE =
  "IMC-registered GPs available by secure video call — same-day appointments for acute illness, sick certs, prescription reviews, referrals and chronic disease queries. Consultations in English, Portuguese, Spanish, Arabic and more.";
const WHOFOR_TITLE = "What our GPs treat — conditions and concerns";
const WHYCHOOSE_TITLE =
  "Why patients choose Global Health for online GP care in Ireland";

// intro one-word fix (brief item 15).
const INTRO_FROM = "Clinicians review your symptoms";
const INTRO_TO = "Doctors review your symptoms";

// whoFor +mental health bullet (brief item 24).
const MENTAL_HEALTH_ITEM =
  "Mental health concerns — anxiety, low mood, stress and sleep difficulties";

// FAQ edits (brief items 28, 29) — matched by a distinctive current-answer slice.
const FAQ2_MATCH = "Online GP consultations at Global Health cost from €39";
const FAQ2_ANSWER =
  "Online GP consultations at Global Health start from €39 with an IMC-registered doctor. There are no hidden fees and no membership required. See service cards above for specific consultation prices by type.";
const FAQ5_MATCH = "Open slots are shown during booking";
const FAQ5_ANSWER =
  "Same-day appointments are available — open slots are shown during booking. Most patients are seen within hours of booking. Availability depends on the selected service and clinician schedule.";

// New sick-cert FAQ (brief item 30).
const SICKCERT_Q = "Can an online GP in Ireland issue a sick cert?";
const SICKCERT_A =
  "Yes. IMC-registered GPs at Global Health can issue a valid sick certificate following a clinical assessment by secure video call. Sick certs issued by telemedicine are accepted by Irish employers. Note: sick certificates for Department of Social Protection Illness Benefit claims require a paper form (IB1) completed by your GP — our doctors can advise on this during the consultation.";

// Service card renames (brief items 17-20, 22) + card-4 summary (item 21).
const SERVICE_NAMES: Array<[from: string, to: string]> = [
  ["See a Doctor Online in Ireland", "GP Consultation Online"],
  ["Sick Leave Medical Assessment in Ireland", "Sick Cert Online"],
  ["Ongoing Treatment Review in Ireland", "Repeat Prescription Online"],
  ["Chronic Disease & Ongoing Care Consultation", "Chronic Conditions — GP Review Online"],
  ["Paediatric GP Consultation in Ireland", "Paediatric GP Online"],
];
const SERVICE_SUMMARIES: Array<[from: string, to: string]> = [
  [
    "Our IMC-registered Family Medicine specialists provide ongoing chronic disease care via secure video call.",
    "Our IMC-registered GPs provide ongoing chronic condition care via secure video call. Same-day and scheduled appointments available.",
  ],
];

// Card 1 price (brief item 7) — "show the lowest price": the flagship GP
// Consultation card is `acute-medical-consultation`, currently €45. The lowest
// GP *consultation* price is €39, so align the card to €39 to match the FAQ +
// meta anchors. MONEY PATH: this changes both the displayed AND charged price;
// matched on the current 4500 so it's idempotent and no-ops if already €39.
const GP_PRICE_SLUG = "acute-medical-consultation";
const GP_PRICE_FROM_CENTS = 4500;
const GP_PRICE_TO_CENTS = 3900;

// Doctor title fix (brief item 26).
const DOCTOR_NAME_MATCH = "Maklad";
const DOCTOR_TITLE_FROM = "Medical Doctor";
const DOCTOR_TITLE_TO = "General Practitioner";

// Footer tagline override (brief item 8) — IE-only, so it lives on CountryFooter,
// not the global i18n footerTagline.
const FOOTER_TAGLINE =
  "Online medical consultations with IMC-registered GPs in Ireland. Valid prescriptions, sick certs and specialist referrals.";

// Country rename (brief item 9, safe half) — Romania/Brazil activation excluded.
const CZ_NAME_FROM = "Czechia";
const CZ_NAME_TO = "Czech Republic";

// ── FAQ / whoFor JSON helpers ────────────────────────────────────────────────

type Faq = { question: string; answer: string };

function patchFaq(faq: Faq[]): { next: Faq[]; changed: string[] } {
  const changed: string[] = [];
  const next = faq.map((f) => {
    if (f.answer.includes(FAQ2_MATCH) && f.answer !== FAQ2_ANSWER) {
      changed.push(`FAQ price answer -> "${f.question}"`);
      return { ...f, answer: FAQ2_ANSWER };
    }
    if (f.answer.includes(FAQ5_MATCH) && f.answer !== FAQ5_ANSWER) {
      changed.push(`FAQ wait-time answer -> "${f.question}"`);
      return { ...f, answer: FAQ5_ANSWER };
    }
    return f;
  });
  const hasSickCert = next.some((f) => /sick cert/i.test(f.question));
  if (!hasSickCert) {
    next.push({ question: SICKCERT_Q, answer: SICKCERT_A });
    changed.push("FAQ appended: sick-cert Q");
  }
  return { next, changed };
}

function patchWhoFor(items: string[]): { next: string[]; changed: string[] } {
  const changed: string[] = [];
  if (items.some((i) => /mental health/i.test(i))) return { next: items, changed };
  changed.push("whoFor appended: mental-health bullet");
  return { next: [...items, MENTAL_HEALTH_ITEM], changed };
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
    // 1) PageContentTranslation (IE / GENERAL_CONSULTATION / EN).
    const pc = await tx.pageContent.findUnique({
      where: { countryId_pageKey: { countryId, pageKey: "GENERAL_CONSULTATION" } },
      select: { id: true, translations: { where: { locale: LOCALE } } },
    });
    if (!pc) {
      note("⚠ No PageContent row for IE/GENERAL_CONSULTATION — skipping page copy.");
    } else if (pc.translations.length === 0) {
      note("⚠ No EN PageContentTranslation for IE/GENERAL_CONSULTATION — skipping page copy.");
    } else {
      const t = pc.translations[0];
      const data: Prisma.PageContentTranslationUpdateInput = {};

      if (t.seoTitle !== SEO_TITLE) { data.seoTitle = SEO_TITLE; note(`seoTitle: ${t.seoTitle ?? "∅"} -> ${SEO_TITLE}`); }
      if (t.seoDescription !== SEO_DESCRIPTION) { data.seoDescription = SEO_DESCRIPTION; note("seoDescription updated"); }
      if (t.heroSubtitle !== HERO_SUBTITLE) { data.heroSubtitle = HERO_SUBTITLE; note("heroSubtitle (paragraph below H1) updated"); }
      if (t.whoForTitle !== WHOFOR_TITLE) { data.whoForTitle = WHOFOR_TITLE; note(`whoForTitle: ${t.whoForTitle ?? "∅"} -> ${WHOFOR_TITLE}`); }
      if (t.whyChooseTitle !== WHYCHOOSE_TITLE) { data.whyChooseTitle = WHYCHOOSE_TITLE; note(`whyChooseTitle: ${t.whyChooseTitle ?? "∅"} -> ${WHYCHOOSE_TITLE}`); }

      if (t.intro && t.intro.includes(INTRO_FROM)) {
        data.intro = t.intro.replaceAll(INTRO_FROM, INTRO_TO);
        note("intro: 'Clinicians' -> 'Doctors'");
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
        note("⚠ whoForItems empty/not an array — mental-health bullet skipped.");
      }

      if (Object.keys(data).length && APPLY) {
        await tx.pageContentTranslation.update({ where: { id: t.id }, data });
      }
    }

    // 2) Service card names + card-4 summary (base col + EN translation).
    for (const [from, to] of SERVICE_NAMES) {
      const base = await tx.service.updateMany({ where: { countryId, name: from }, data: { name: to } });
      const tr = await tx.serviceTranslation.updateMany({ where: { locale: LOCALE, name: from, service: { countryId } }, data: { name: to } });
      if (base.count || tr.count) note(`Service name: "${from}" -> "${to}" (${base.count} base, ${tr.count} tr)`);
    }
    for (const [from, to] of SERVICE_SUMMARIES) {
      const base = await tx.service.updateMany({ where: { countryId, summary: from }, data: { summary: to } });
      const tr = await tx.serviceTranslation.updateMany({ where: { locale: LOCALE, summary: from, service: { countryId } }, data: { summary: to } });
      if (base.count || tr.count) note(`Service summary (card 4) updated (${base.count} base, ${tr.count} tr)`);
    }

    // 2b) Card 1 price €45 -> €39 (lowest consultation; brief item 7).
    const price = await tx.service.updateMany({
      where: { countryId, slug: GP_PRICE_SLUG, basePriceCents: GP_PRICE_FROM_CENTS },
      data: { basePriceCents: GP_PRICE_TO_CENTS },
    });
    if (price.count) note(`Service price ${GP_PRICE_SLUG}: €${GP_PRICE_FROM_CENTS / 100} -> €${GP_PRICE_TO_CENTS / 100} (charged + displayed)`);

    // 3) Doctor title (base col + any IE market translation).
    const docBase = await tx.doctor.updateMany({
      where: { countryId, title: DOCTOR_TITLE_FROM, fullName: { contains: DOCTOR_NAME_MATCH } },
      data: { title: DOCTOR_TITLE_TO },
    });
    const docTr = await tx.doctorMarketTranslation.updateMany({
      where: {
        locale: LOCALE,
        title: DOCTOR_TITLE_FROM,
        doctorCountry: { country: { code: COUNTRY_CODE }, doctor: { fullName: { contains: DOCTOR_NAME_MATCH } } },
      },
      data: { title: DOCTOR_TITLE_TO },
    });
    if (docBase.count || docTr.count) note(`Doctor title (${DOCTOR_NAME_MATCH}): "${DOCTOR_TITLE_FROM}" -> "${DOCTOR_TITLE_TO}" (${docBase.count} base, ${docTr.count} tr)`);

    // 4) Footer tagline override (IE only).
    const footer = await tx.countryFooter.findUnique({ where: { countryId }, select: { tagline: true } });
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

    // 5) Czechia -> Czech Republic (safe rename; activation NOT touched).
    const cz = await tx.country.updateMany({ where: { code: "cz", name: CZ_NAME_FROM }, data: { name: CZ_NAME_TO } });
    if (cz.count) note(`Country cz name: "${CZ_NAME_FROM}" -> "${CZ_NAME_TO}"`);

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
      ? `APPLIED: ${log.length} change(s) written for Ireland GP page.`
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
