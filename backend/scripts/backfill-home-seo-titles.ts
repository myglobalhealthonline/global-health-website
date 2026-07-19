/**
 * Standardizes homepage <title> / meta description across all countries and
 * locales to one format:
 *
 *   Online Doctor {Country} | Registered GPs & Specialists | Global Health
 *
 * Writes PageContentTranslation.seoTitle/seoDescription for the HOME page of
 * every country in the map below. Ireland EN is deliberately skipped — its
 * current title ("Online Doctor Ireland | IMC-Registered GPs | Global
 * Health") already follows the format with the stronger IMC wording and
 * ranks; do not regress it.
 *
 * Idempotent — plain upserts, safe to re-run.
 *
 * Run:
 *   pnpm --filter backend exec tsx --env-file=.env scripts/backfill-home-seo-titles.ts
 */
import { prisma } from "../src/db/prisma.js";

/** Per-locale title/description templates. {c} = localized country name. */
const TEMPLATES: Record<string, { title: string; description: string }> = {
  EN: {
    title: "Online Doctor {c} | Registered GPs & Specialists | Global Health",
    description:
      "See a registered doctor online today — GP consultations, medical certificates, specialist referrals. Same-day video appointments in {c}.",
  },
  PT: {
    title: "Médico Online {c} | Clínicos Gerais e Especialistas Registados | Global Health",
    description:
      "Consulte hoje um médico registado por videochamada — consultas de clínica geral, atestados médicos, referenciações para especialistas. Consultas no mesmo dia em {c}.",
  },
  ES: {
    title: "Médico Online {c} | Médicos de Cabecera y Especialistas Colegiados | Global Health",
    description:
      "Consulte hoy con un médico colegiado por videollamada — consultas de medicina general, certificados médicos, derivaciones a especialistas. Citas el mismo día en {c}.",
  },
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

/** Localized country display names, keyed country code → locale → name. */
const COUNTRY_NAMES: Record<string, Record<string, string>> = {
  ie: { EN: "Ireland", PT: "Irlanda", ES: "Irlanda", CS: "Irsko", RO: "Irlanda", DE: "Irland" },
  pt: { EN: "Portugal", PT: "Portugal", ES: "Portugal", CS: "Portugalsko", RO: "Portugalia", DE: "Portugal" },
  es: { EN: "Spain", PT: "Espanha", ES: "España", CS: "Španělsko", RO: "Spania", DE: "Spanien" },
  cz: { EN: "Czechia", PT: "Chéquia", ES: "Chequia", CS: "Česko", RO: "Cehia", DE: "Tschechien" },
  ro: { EN: "Romania", PT: "Roménia", ES: "Rumanía", CS: "Rumunsko", RO: "România", DE: "Rumänien" },
  br: { EN: "Brazil", PT: "Brasil", ES: "Brasil", CS: "Brazílie", RO: "Brazilia", DE: "Brasilien" },
};

// Brazil is pt-BR: European-Portuguese participles read wrong there.
const BR_PT = {
  title: "Médico Online Brasil | Clínicos Gerais e Especialistas Registrados | Global Health",
  description:
    "Consulte hoje um médico registrado por videochamada — consultas de clínica geral, atestados médicos, encaminhamentos para especialistas. Consultas no mesmo dia no Brasil.",
};

async function main() {
  const pages = await prisma.pageContent.findMany({
    where: { pageKey: "HOME" },
    select: {
      id: true,
      country: { select: { code: true } },
      translations: { select: { id: true, locale: true } },
    },
  });
  for (const page of pages) {
    const code = page.country.code.toLowerCase();
    const names = COUNTRY_NAMES[code];
    if (!names) {
      console.log(`!! no name map for country ${code} — skipped`);
      continue;
    }
    for (const tr of page.translations) {
      if (code === "ie" && tr.locale === "EN") {
        console.log("ie EN skipped (keep IMC title)");
        continue;
      }
      const template = TEMPLATES[tr.locale];
      const name = names[tr.locale];
      if (!template || !name) {
        console.log(`!! ${code} ${tr.locale}: no template/name — skipped`);
        continue;
      }
      const value =
        code === "br" && tr.locale === "PT"
          ? BR_PT
          : {
              title: template.title.replaceAll("{c}", name),
              description: template.description.replaceAll("{c}", name),
            };
      await prisma.pageContentTranslation.update({
        where: { id: tr.id },
        data: { seoTitle: value.title, seoDescription: value.description },
      });
      console.log(`ok ${code} ${tr.locale}: ${value.title}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
