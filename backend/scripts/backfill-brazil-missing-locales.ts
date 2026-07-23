/**
 * Brazil (country "br") supports the site-wide 6-locale set (EN/PT/ES/CS/RO/DE),
 * same as ie/cz/pt/es/ro — but unlike those countries, Brazil's HOME PageContent
 * row never got PageContentTranslation rows created for CS/RO/DE. The public
 * per-field fallback (getPublicPageContent in page-content.service.ts) then
 * silently serves the PT (defaultLocale) content at /brazil/cs, /brazil/ro,
 * /brazil/de — a duplicate-content / bad-hreflang SEO bug (verified live
 * 2026-07-23: those three URLs render the Portuguese <title> verbatim).
 *
 * backfill-home-seo-titles.ts already carries verified-good CS/RO/DE
 * title/description templates and localized Brazil country names — it just
 * only UPDATEs translation rows that already exist, so it silently no-ops
 * for br/CS, br/RO, br/DE. This script does the one-time CREATE (upsert)
 * those three rows need, reusing the exact same templates/name strings so
 * voice/format stays identical to every other country's HOME SEO copy.
 *
 * Scope: HOME page only. DOCTORS_INDEX, GENERAL_CONSULTATION,
 * SPECIALIST_CONSULTATION, PRESCRIPTIONS and HEALTH_TESTS have the same
 * CS/RO/DE gap for Brazil (confirmed by audit), as does the
 * dr-renato-sarmento doctor profile — none of that is touched here since no
 * verified template copy exists for that content yet (see patch-brazil-
 * doctors-content.ts's own note: "CS/RO/DE ... none exist yet and the brief
 * supplies no content for them — not fabricated here"). Fabricating
 * Czech/Romanian/German medical marketing copy for those pages is out of
 * scope for this script.
 *
 * Only sets seoTitle/seoDescription — every other PageContentTranslation
 * field is nullable and every other country's CS/RO/DE (and even fully-
 * populated cz's) HOME rows already have heroTitle etc. as null, relying on
 * the same per-field PT/EN fallback. Matches the existing site-wide pattern,
 * doesn't invent new hero copy.
 *
 * Idempotent — plain upserts keyed on (pageContentId, locale), safe to re-run.
 *
 * Run:
 *   pnpm --filter backend exec tsx --env-file=.env scripts/backfill-brazil-missing-locales.ts
 */
import { prisma } from "../src/db/prisma.js";

const TEMPLATES: Record<"CS" | "RO" | "DE", { title: string; description: string }> = {
  CS: {
    title: "Online lékař {c} | Registrovaní praktičtí lékaři a specialisté | Global Health",
    description:
      "Promluvte si ještě dnes s registrovaným lékařem přes videohovor — konzultace s praktickým lékařem, potvrzení, odeslání ke specialistovi. Termíny tentýž den, {c}.",
  },
  RO: {
    title: "Medic Online {c} | Medici de Familie și Specialiști Înregistrați | Global Health",
    description:
      "Vorbiți azi cu un medic înregistrat prin apel video — consultații de medicină de familie, adeverințe medicale, trimiteri către specialiști. Programări în aceeași zi, {c}.",
  },
  DE: {
    title: "Online-Arzt {c} | Registrierte Hausärzte & Fachärzte | Global Health",
    description:
      "Sprechen Sie noch heute per Videoanruf mit einem registrierten Arzt — Hausarzttermine, Atteste, Facharztüberweisungen. Termine am selben Tag, {c}.",
  },
};

// Localized Brazil country name per locale — from backfill-home-seo-titles.ts's COUNTRY_NAMES.br.
const BR_NAME: Record<"CS" | "RO" | "DE", string> = { CS: "Brazílie", RO: "Brazilia", DE: "Brasilien" };

async function main() {
  const country = await prisma.country.findUnique({ where: { code: "br" }, select: { id: true } });
  if (!country) throw new Error("Country br not found");

  const home = await prisma.pageContent.findUnique({
    where: { countryId_pageKey: { countryId: country.id, pageKey: "HOME" } },
    include: { translations: { select: { id: true, locale: true } } },
  });
  if (!home) throw new Error("No HOME PageContent row for br");

  for (const locale of ["CS", "RO", "DE"] as const) {
    const existing = home.translations.find((t) => t.locale === locale);
    const template = TEMPLATES[locale];
    const value = {
      seoTitle: template.title.replaceAll("{c}", BR_NAME[locale]),
      seoDescription: template.description.replaceAll("{c}", BR_NAME[locale]),
    };
    await prisma.pageContentTranslation.upsert({
      where: { pageContentId_locale: { pageContentId: home.id, locale } },
      create: { pageContentId: home.id, locale, ...value },
      update: value,
    });
    console.log(`${existing ? "updated" : "created"} br/HOME/${locale}: ${value.seoTitle}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
