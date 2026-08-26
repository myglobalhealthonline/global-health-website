import type { CountryCode } from "@/data/countries";
import type { loadLocaleBundle } from "@/lib/i18n/load-locale";

/**
 * Per-country/-locale copy overrides for the country HOME hub page.
 *
 * The shared i18n `home`/`services` bundles are LANGUAGE-scoped — the English
 * bundle renders on Portugal/en, Spain/en, etc. too. Market-specific copy (a
 * clinic brief written for one country) can't live there without leaking to
 * every other market's same-language view. This module layers a thin,
 * code-owned override keyed by `${code}:${locale}` OVER the shared bundle:
 *
 *   page CMS record  ▸  this override  ▸  shared i18n default
 *
 * A country/locale with no entry keeps the generic copy verbatim, so nothing
 * crosses markets. Two consumption shapes:
 *   • `homePageExtras()` — flat, page-level strings read directly (SEO, H1,
 *     hero paragraph, hero bullets, services H2).
 *   • `overrideHomeBundle()` — deep-merges nested overrides into the `home`
 *     bundle so downstream `t.team.headline`, `t.statsBand.*`, etc. just work.
 */

type HomeBundle = ReturnType<typeof loadLocaleBundle>["home"];
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** Page-level strings consumed directly (not part of the `home` bundle). */
export type HomePageExtras = {
  seoTitle?: string;
  seoDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  /** H1 — rendered plain (no accent underline) when set. */
  heroTitle?: string;
  /** Hero paragraph below the H1. */
  heroSubtitle?: string;
  /** Hero trust bullets, verbatim (no country name appended). Exactly three. */
  heroBullets?: string[];
  /** Small above-fold hero price line, e.g. "GP consultations from €39". */
  heroPriceBadge?: string;
  /** Services section H2. */
  servicesHeadline?: string;
};

function key(code: CountryCode, locale: string): string {
  return `${code}:${locale}`;
}

/** Exported for the title-budget regression test only — not part of the
 *  public API other modules should read; use `homePageExtras()` instead. */
export const EXTRAS: Record<string, HomePageExtras> = {
  "IE:en": {
    seoTitle:
      "Online Doctor Ireland | IMC-Registered GPs & Specialists | Same Day",
    seoDescription:
      "See an IMC-registered doctor by video call today for GP consultations, sick certs and specialist referrals. Same-day appointments anywhere in Ireland from €39.",
    ogTitle: "Online Doctor Ireland | See a Doctor Today | Global Health",
    ogDescription:
      "IMC-registered GPs and specialists by video call for sick certs, prescriptions and referrals. Same-day appointments anywhere in Ireland.",
    heroTitle: "Online Doctor Ireland | IMC-registered physicians, same day.",
    heroSubtitle:
      "GP consultations, sick certs, specialist referrals and medical support by secure video call from anywhere in Ireland. Same-day appointments available.",
    heroBullets: [
      "IMC-registered doctors",
      "Same-day appointments",
      "Valid sick certs & prescriptions",
    ],
    servicesHeadline: "GP and specialist consultations from €39.",
    heroPriceBadge: "GP consultations from €39",
  },
  "IE:es": {
    seoTitle:
      "Médico Online Irlanda | Médicos de Cabecera y Especialistas Colegiados en el IMC | Mismo Día",
    seoDescription:
      "Consulte hoy con un médico colegiado en el IMC por videollamada para consultas de médico de cabecera, certificados médicos y derivaciones a especialistas. Citas el mismo día en toda Irlanda desde 39 €.",
    ogTitle: "Médico Online Irlanda | Consulte hoy | Global Health",
    ogDescription:
      "Médicos de cabecera y especialistas colegiados en el IMC por videollamada para certificados médicos, recetas y derivaciones. Citas el mismo día en toda Irlanda.",
    heroTitle: "Médico Online Irlanda | médicos colegiados en el IMC, el mismo día.",
    heroSubtitle:
      "Consultas de médico de cabecera, certificados médicos, derivaciones a especialistas y apoyo médico por videollamada segura desde cualquier lugar de Irlanda. Citas el mismo día disponibles.",
    heroBullets: [
      "Médicos colegiados en el IMC",
      "Citas el mismo día",
      "Certificados médicos y recetas válidos",
    ],
    servicesHeadline: "Consultas de médico de cabecera y especialista desde 39 €.",
    heroPriceBadge: "Consultas de médico de cabecera desde 39 €",
  },
  "IE:pt": {
    seoTitle:
      "Médico Online Irlanda | Clínicos Gerais e Especialistas Registados no IMC | Mesmo Dia",
    seoDescription:
      "Consulte hoje um médico registado no IMC por videochamada para consultas de clínica geral, atestados médicos e referenciações para especialistas. Consultas no mesmo dia em toda a Irlanda a partir de 39 €.",
    ogTitle: "Médico Online Irlanda | Consulte hoje | Global Health",
    ogDescription:
      "Clínicos gerais e especialistas registados no IMC por videochamada para atestados médicos, receitas e referenciações. Consultas no mesmo dia em toda a Irlanda.",
    heroTitle: "Médico Online Irlanda | médicos registados no IMC, no mesmo dia.",
    heroSubtitle:
      "Consultas de clínica geral, atestados médicos, referenciações para especialistas e apoio médico por videochamada segura, de qualquer lugar da Irlanda. Consultas no mesmo dia disponíveis.",
    heroBullets: [
      "Médicos registados no IMC",
      "Consultas no mesmo dia",
      "Atestados e receitas médicas válidos",
    ],
    servicesHeadline: "Consultas de clínica geral e especialidade a partir de 39 €.",
    heroPriceBadge: "Consultas de clínica geral a partir de 39 €",
  },
  "IE:cs": {
    seoTitle:
      "Online lékař Irsko | Praktičtí lékaři a specialisté registrovaní u IMC | Tentýž den",
    seoDescription:
      "Promluvte si dnes s lékařem registrovaným u IMC prostřednictvím videohovoru pro konzultace s praktickým lékařem, pracovní neschopnost a odeslání ke specialistovi. Termíny tentýž den kdekoli v Irsku od 39 €.",
    ogTitle: "Online lékař Irsko | Konzultace ještě dnes | Global Health",
    ogDescription:
      "Praktičtí lékaři a specialisté registrovaní u IMC prostřednictvím videohovoru pro pracovní neschopnost, recepty a odeslání ke specialistovi. Termíny tentýž den kdekoli v Irsku.",
    heroTitle: "Online lékař Irsko | lékaři registrovaní u IMC, tentýž den.",
    heroSubtitle:
      "Konzultace s praktickým lékařem, pracovní neschopnost, odeslání ke specialistovi a lékařská podpora prostřednictvím zabezpečeného videohovoru odkudkoli z Irska. K dispozici jsou termíny tentýž den.",
    heroBullets: [
      "Lékaři registrovaní u IMC",
      "Termíny tentýž den",
      "Platná pracovní neschopnost a recepty",
    ],
    servicesHeadline: "Konzultace s praktickým lékařem a specialistou od 39 €.",
    heroPriceBadge: "Konzultace s praktickým lékařem od 39 €",
  },
  "IE:ro": {
    seoTitle:
      "Medic Online Irlanda | Medici de Familie și Specialiști Înregistrați la IMC | În Aceeași Zi",
    seoDescription:
      "Vorbiți azi cu un medic înregistrat la IMC prin apel video pentru consultații de medicină de familie, concedii medicale și trimiteri către specialiști. Programări în aceeași zi oriunde în Irlanda de la 39 €.",
    ogTitle: "Medic Online Irlanda | Consultație azi | Global Health",
    ogDescription:
      "Medici de familie și specialiști înregistrați la IMC prin apel video pentru concedii medicale, rețete și trimiteri. Programări în aceeași zi oriunde în Irlanda.",
    heroTitle: "Medic Online Irlanda | medici înregistrați la IMC, în aceeași zi.",
    heroSubtitle:
      "Consultații de medicină de familie, concedii medicale, trimiteri către specialiști și sprijin medical prin apel video securizat, de oriunde din Irlanda. Programări disponibile în aceeași zi.",
    heroBullets: [
      "Medici înregistrați la IMC",
      "Programări în aceeași zi",
      "Concedii medicale și rețete valabile",
    ],
    servicesHeadline: "Consultații de medicină de familie și specialitate de la 39 €.",
    heroPriceBadge: "Consultații de medicină de familie de la 39 €",
  },
  "IE:de": {
    seoTitle:
      "Online-Arzt Irland | Bei IMC registrierte Hausärzte & Fachärzte | Am selben Tag",
    seoDescription:
      "Sprechen Sie noch heute per Videoanruf mit einem bei IMC registrierten Arzt für Hausarzttermine, Krankschreibungen und Facharztüberweisungen. Termine am selben Tag in ganz Irland ab 39 €.",
    ogTitle: "Online-Arzt Irland | Noch heute einen Arzt sprechen | Global Health",
    ogDescription:
      "Bei IMC registrierte Hausärzte und Fachärzte per Videoanruf für Krankschreibungen, Rezepte und Überweisungen. Termine am selben Tag in ganz Irland.",
    heroTitle: "Online-Arzt Irland | bei IMC registrierte Ärzte, am selben Tag.",
    heroSubtitle:
      "Hausarzttermine, Krankschreibungen, Facharztüberweisungen und medizinische Unterstützung per sicherem Videoanruf, von überall in Irland. Termine am selben Tag verfügbar.",
    heroBullets: [
      "Bei IMC registrierte Ärzte",
      "Termine am selben Tag",
      "Gültige Krankschreibungen & Rezepte",
    ],
    servicesHeadline: "Hausarzt- und Facharzttermine ab 39 €.",
    heroPriceBadge: "Hausarzttermine ab 39 €",
  },
  // Spain/Romania/Brazil have no seeded HOME PageContentTranslation row (the
  // seed script only covers ie/pt), so they fell through to the generic
  // "Medicine Anytime / Anywhere" i18n default. These heroTitle-only entries
  // give them the same "Online medical care in {Country}" pattern IE/PT get
  // from the DB, without needing a DB write.
  // Portugal GP price €39 (owner-confirmed 2026-07-25). Badge strings reuse
  // the proofread IE-locale phrasings, same figure.
  "pt:pt": { heroPriceBadge: "Consultas de clínica geral a partir de 39 €" },
  "pt:en": { heroPriceBadge: "GP consultations from €39" },
  "pt:es": { heroPriceBadge: "Consultas de médico de cabecera desde 39 €" },
  "pt:cs": { heroPriceBadge: "Konzultace s praktickým lékařem od 39 €" },
  "pt:ro": { heroPriceBadge: "Consultații de medicină de familie de la 39 €" },
  "pt:de": { heroPriceBadge: "Hausarzttermine ab 39 €" },
  "es:en": { heroTitle: "Online medical care in Spain" },
  "es:es": { heroTitle: "Atención médica online en España" },
  "es:pt": { heroTitle: "Cuidados médicos online em Espanha" },
  "es:cs": { heroTitle: "Online lékařská péče ve Španělsku" },
  "es:ro": { heroTitle: "Îngrijire medicală online în Spania" },
  "es:de": { heroTitle: "Online-medizinische Versorgung in Spanien" },
  "ro:en": { heroTitle: "Online medical care in Romania" },
  "ro:es": { heroTitle: "Atención médica online en Rumanía" },
  "ro:pt": { heroTitle: "Cuidados médicos online na Roménia" },
  "ro:cs": { heroTitle: "Online lékařská péče v Rumunsku" },
  "ro:ro": { heroTitle: "Îngrijire medicală online în România" },
  "ro:de": { heroTitle: "Online-medizinische Versorgung in Rumänien" },
  "br:en": { heroTitle: "Online medical care in Brazil" },
  "br:es": { heroTitle: "Atención médica online en Brasil" },
  "br:pt": { heroTitle: "Cuidados médicos online no Brasil" },
  "br:cs": { heroTitle: "Online lékařská péče v Brazílii" },
  "br:ro": { heroTitle: "Îngrijire medicală online în Brazilia" },
  "br:de": { heroTitle: "Online-medizinische Versorgung in Brasilien" },
  // Czechia was missed when the es/ro/br entries above were added (same
  // "no seeded HOME row" situation — confirmed live 2026-08-09: every
  // Czechia HOME PageContentTranslation locale is null) — its home page fell
  // through all the way to the generic "Medicína kdykoliv" ("Medicine
  // anytime") i18n tagline instead of a market-specific title, the one
  // country without the distinctive pattern every sibling market has.
  "cz:en": { heroTitle: "Online medical care in Czechia" },
  "cz:cs": { heroTitle: "Online lékařská péče v Česku" },
  "cz:pt": { heroTitle: "Cuidados médicos online na Chéquia" },
  "cz:es": { heroTitle: "Atención médica online en Chequia" },
  "cz:ro": { heroTitle: "Îngrijire medicală online în Cehia" },
  "cz:de": { heroTitle: "Online-medizinische Versorgung in Tschechien" },
};

const BUNDLE: Record<string, DeepPartial<HomeBundle>> = {
  "IE:en": {
    countryHero: {
      // Availability badge reads "3 doctors available" instead of "3 available".
      available: "doctors available",
    },
    trust: {
      licensedPlural: "IMC-registered doctors",
      // Regulator tile renders "{IMC} {gdpr}" → "IMC registered · verified".
      gdpr: "registered · verified",
    },
    team: {
      headline: "Named doctors. Verified registration.",
      headlineAccent: "No anonymous rotas.",
    },
    statsBand: {
      stat1Label: "IMC-registered doctors",
      stat1Caption: "Registered with the Irish Medical Council.",
    },
    howItWorks: {
      step1Body:
        "Browse GP consultations, sick certs and specialist referrals. Filter by language, specialty, or price.",
      step2Body:
        "Select an IMC-registered doctor and choose an open appointment slot from their live calendar.",
      step3Body:
        "Join the secure video consultation from any device. Receive a clinical note, prescription or sick cert when clinically indicated.",
    },
    finalCta: {
      body: "Browse IMC-registered doctors, then choose an open appointment time. Same-day appointments available.",
    },
  },
  "IE:es": {
    countryHero: {
      available: "médicos disponibles",
    },
    trust: {
      licensedPlural: "médicos colegiados en el IMC",
      gdpr: "colegiado · verificado",
    },
    team: {
      headline: "Médicos con nombre. Colegiación verificada.",
      headlineAccent: "Sin turnos anónimos.",
    },
    statsBand: {
      stat1Label: "Médicos colegiados en el IMC",
      stat1Caption: "Colegiados en el Irish Medical Council.",
    },
    howItWorks: {
      step1Body:
        "Explore consultas de médico de cabecera, certificados médicos y derivaciones a especialistas. Filtre por idioma, especialidad o precio.",
      step2Body:
        "Elija un médico colegiado en el IMC y seleccione un horario disponible en su calendario en tiempo real.",
      step3Body:
        "Únase a la videoconsulta segura desde cualquier dispositivo. Reciba una nota clínica, receta o certificado médico cuando esté clínicamente indicado.",
    },
    finalCta: {
      body: "Explore médicos colegiados en el IMC y elija un horario disponible. Citas el mismo día disponibles.",
    },
  },
  "IE:pt": {
    countryHero: {
      available: "médicos disponíveis",
    },
    trust: {
      licensedPlural: "médicos registados no IMC",
      gdpr: "registado · verificado",
    },
    team: {
      headline: "Médicos identificados. Registo verificado.",
      headlineAccent: "Sem escalas anónimas.",
    },
    statsBand: {
      stat1Label: "Médicos registados no IMC",
      stat1Caption: "Registados no Irish Medical Council.",
    },
    howItWorks: {
      step1Body:
        "Explore consultas de clínica geral, atestados médicos e referenciações para especialistas. Filtre por idioma, especialidade ou preço.",
      step2Body:
        "Escolha um médico registado no IMC e selecione um horário disponível no seu calendário em tempo real.",
      step3Body:
        "Entre na videoconsulta segura a partir de qualquer dispositivo. Receba uma nota clínica, receita ou atestado médico quando clinicamente indicado.",
    },
    finalCta: {
      body: "Explore médicos registados no IMC e escolha um horário disponível. Consultas no mesmo dia disponíveis.",
    },
  },
  "IE:cs": {
    countryHero: {
      available: "dostupných lékařů",
    },
    trust: {
      licensedPlural: "lékaři registrovaní u IMC",
      gdpr: "registrováno · ověřeno",
    },
    team: {
      headline: "Jmenovití lékaři. Ověřená registrace.",
      headlineAccent: "Žádné anonymní rotace.",
    },
    statsBand: {
      stat1Label: "Lékaři registrovaní u IMC",
      stat1Caption: "Registrováni u Irish Medical Council.",
    },
    howItWorks: {
      step1Body:
        "Procházejte konzultace s praktickým lékařem, pracovní neschopnost a odeslání ke specialistovi. Filtrujte podle jazyka, oboru nebo ceny.",
      step2Body:
        "Vyberte lékaře registrovaného u IMC a zvolte volný termín z jeho aktuálního kalendáře.",
      step3Body:
        "Připojte se k zabezpečené videokonzultaci z jakéhokoli zařízení. Obdržíte klinickou zprávu, recept nebo pracovní neschopnost, je-li to klinicky indikováno.",
    },
    finalCta: {
      body: "Procházejte lékaře registrované u IMC a zvolte volný termín. K dispozici termíny tentýž den.",
    },
  },
  "IE:ro": {
    countryHero: {
      available: "medici disponibili",
    },
    trust: {
      licensedPlural: "medici înregistrați la IMC",
      gdpr: "înregistrat · verificat",
    },
    team: {
      headline: "Medici cu nume. Înregistrare verificată.",
      headlineAccent: "Fără ture anonime.",
    },
    statsBand: {
      stat1Label: "Medici înregistrați la IMC",
      stat1Caption: "Înregistrați la Irish Medical Council.",
    },
    howItWorks: {
      step1Body:
        "Explorați consultații de medicină de familie, concedii medicale și trimiteri către specialiști. Filtrați după limbă, specialitate sau preț.",
      step2Body:
        "Alegeți un medic înregistrat la IMC și selectați un interval liber din calendarul său actualizat.",
      step3Body:
        "Alăturați-vă consultației video securizate de pe orice dispozitiv. Primiți o notă clinică, o rețetă sau un concediu medical atunci când este indicat clinic.",
    },
    finalCta: {
      body: "Explorați medici înregistrați la IMC și alegeți un interval liber. Programări disponibile în aceeași zi.",
    },
  },
  "IE:de": {
    countryHero: {
      available: "Ärzte verfügbar",
    },
    trust: {
      licensedPlural: "bei IMC registrierte Ärzte",
      gdpr: "registriert · verifiziert",
    },
    team: {
      headline: "Namentlich genannte Ärzte. Verifizierte Registrierung.",
      headlineAccent: "Keine anonymen Rotationen.",
    },
    statsBand: {
      stat1Label: "Bei IMC registrierte Ärzte",
      stat1Caption: "Beim Irish Medical Council registriert.",
    },
    howItWorks: {
      step1Body:
        "Durchsuchen Sie Hausarzttermine, Krankschreibungen und Facharztüberweisungen. Filtern Sie nach Sprache, Fachgebiet oder Preis.",
      step2Body:
        "Wählen Sie einen bei IMC registrierten Arzt und einen freien Termin aus seinem aktuellen Kalender.",
      step3Body:
        "Nehmen Sie von jedem Gerät aus an der sicheren Videokonsultation teil. Sie erhalten bei klinischer Indikation einen Arztbericht, ein Rezept oder eine Krankschreibung.",
    },
    finalCta: {
      body: "Durchsuchen Sie bei IMC registrierte Ärzte und wählen Sie einen freien Termin. Termine am selben Tag verfügbar.",
    },
  },
};

// Key lookup is case-insensitive: EXTRAS historically mixes "IE:en" and
// "es:en" key styles and CountryCode casing varies by call site.
const EXTRAS_NORMALIZED: Record<string, HomePageExtras> = Object.fromEntries(
  Object.entries(EXTRAS).map(([k, v]) => [k.toLowerCase(), v]),
);

export function homePageExtras(
  code: CountryCode,
  locale: string,
): HomePageExtras | null {
  return EXTRAS_NORMALIZED[key(code, locale).toLowerCase()] ?? null;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge<T>(base: T, over: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(over)) {
    return (over === undefined ? base : (over as T));
  }
  const out: Record<string, unknown> = { ...base };
  for (const k of Object.keys(over)) {
    out[k] = k in base ? deepMerge(out[k], over[k]) : over[k];
  }
  return out as T;
}

/** Deep-merge the country/locale override (if any) onto the home bundle. */
export function overrideHomeBundle(
  base: HomeBundle,
  code: CountryCode,
  locale: string,
): HomeBundle {
  const over = BUNDLE[key(code, locale)];
  return over ? deepMerge(base, over) : base;
}
