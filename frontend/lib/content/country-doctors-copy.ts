import type { CountryCode } from "@/data/countries";
import type { CommonLocale } from "@/lib/i18n/types";

/**
 * Per-country/-locale copy overrides for the /doctors directory hero.
 *
 * Mirrors `country-home-copy.ts`: the shared `common.doctors` i18n bundle is
 * LANGUAGE-scoped (the English bundle renders on every English-speaking
 * market), so a market-specific claim can't live there without leaking to
 * every other market. This module layers a thin, code-owned override keyed
 * by `${code}:${locale}` OVER the shared bundle. A country/locale with no
 * entry keeps the generic copy verbatim — no leak.
 */

type DoctorsBundle = CommonLocale["doctors"];
type DoctorsOverride = Partial<DoctorsBundle>;
export type DoctorDirectorySeo = {
  title: string;
  description: string;
};

function key(code: CountryCode, locale: string): string {
  return `${code.toLowerCase()}:${locale.toLowerCase()}`;
}

const OVERRIDES: Record<string, DoctorsOverride> = {
  "cz:cs": {
    heroLedeTemplate:
      "U každého profilu najdete uvedené registrační údaje, jazyky a aktuální možnosti online rezervace v Česku.",
    heroAvailableSingular: "lékař v seznamu",
    heroAvailablePlural: "lékařů v seznamu",
    trustCard1Title: "Registrace u ČLK",
    trustCard1Subtitle: "Odkaz na oficiální registr",
    trustCard3Title: "Aktuální termíny",
    trustCard3Subtitle: "Zobrazují se při rezervaci",
    floatCard1Title: "Aktuální dostupnost",
    floatCard1Subtitle: "Termíny najdete v rezervačním kalendáři",
    bottomCtaAccent: "online.",
    bioFallbackTemplate: "Profil lékaře pro online konzultace v Česku.",
  },
  "ie:en": {
    heroTitleLead: "IMC-registered",
    heroTitleAccent: "online doctors",
    heroTitleTrail: "in Ireland.",
    // Availability pill: "{count} IMC-registered doctors and clinicians"
    // (count is computed, prefix stays dynamic).
    heroAvailablePlural: "IMC-registered doctors and clinicians",
    heroAvailableSingular: "IMC-registered doctor or clinician available",
    trustCard1Title: "IMC-registered",
    trustCard1Subtitle: "Fully verified",
    // EU Omnibus: the generic "4.9 rating / 2,000+ reviews" claim is
    // unverifiable and must not appear on the Ireland page.
    trustCard2Title: "Reviewed on Doctify",
    trustCard2Subtitle: "{count}+ consultations",
  },
  // Same EU Omnibus liability applies regardless of page language — the
  // fabricated "4.9 rating / 2,000+ reviews" claim must not appear on the
  // Ireland page in any locale. Reuses each locale's already-translated
  // gpPage/specialistPage.hero.stat2 copy for consistency.
  "ie:es": {
    heroTitleLead: "Médicos online",
    heroTitleAccent: "colegiados en el IMC",
    heroTitleTrail: "en Irlanda.",
    trustCard2Title: "Valorado en Doctify",
    trustCard2Subtitle: "{count}+ consultas",
  },
  "ie:pt": {
    heroTitleLead: "Médicos online",
    heroTitleAccent: "registados no IMC",
    heroTitleTrail: "na Irlanda.",
    trustCard2Title: "Avaliado no Doctify",
    trustCard2Subtitle: "{count}+ consultas",
  },
  "ie:cs": {
    heroTitleLead: "Online lékaři",
    heroTitleAccent: "registrovaní u IMC",
    heroTitleTrail: "v Irsku.",
    trustCard2Title: "Hodnoceno na Doctify",
    trustCard2Subtitle: "{count}+ konzultací",
  },
  "ie:ro": {
    heroTitleLead: "Medici online",
    heroTitleAccent: "înregistrați la IMC",
    heroTitleTrail: "în Irlanda.",
    trustCard2Title: "Evaluat pe Doctify",
    trustCard2Subtitle: "{count}+ consultații",
  },
  "ie:de": {
    heroTitleLead: "Online-Ärzte",
    heroTitleAccent: "beim IMC registriert",
    heroTitleTrail: "in Irland.",
    trustCard2Title: "Bewertet auf Doctify",
    trustCard2Subtitle: "{count}+ Konsultationen",
  },
  // Romania — July 2026 SEO brief. "Inregistrati la CMR" is the specific,
  // recognisable trust signal for Romanian patients (more precise than the
  // generic "Licentiat in Romania" the shared bundle uses). Same EU Omnibus
  // liability as Ireland applies here too: the unverifiable "4.9 rating /
  // 2,000+ reviews" claim must not appear on the Romania page in any locale.
  "ro:ro": {
    trustCard1Title: "Înregistrați la CMR",
    trustCard2Title: "Evaluat pe Doctify",
    trustCard2Subtitle: "{count}+ consultații",
  },
  "ro:en": {
    trustCard2Title: "Reviewed on Doctify",
    trustCard2Subtitle: "{count}+ consultations",
  },
  "ro:es": {
    trustCard2Title: "Valorado en Doctify",
    trustCard2Subtitle: "{count}+ consultas",
  },
  "ro:pt": {
    trustCard2Title: "Avaliado no Doctify",
    trustCard2Subtitle: "{count}+ consultas",
  },
  "ro:cs": {
    trustCard2Title: "Hodnoceno na Doctify",
    trustCard2Subtitle: "{count}+ konzultací",
  },
  "ro:de": {
    trustCard2Title: "Bewertet auf Doctify",
    trustCard2Subtitle: "{count}+ Konsultationen",
  },
  // Spain — July 2026 SEO brief. Same EU Omnibus liability as Ireland/Romania:
  // the unverifiable "4.9 rating / 2,000+ reviews" claim must not appear.
  // trustCard1Title is the fully-formed Spanish phrase (not "{country}" + a
  // template swap) because `config.name` for Spain is the untranslated
  // English display name ("Spain"), so the generic "{country}" substitution
  // would otherwise render "Licensed in Spain" on the Spanish-language page.
  "es:es": {
    trustCard1Title: "Colegiado en España",
    trustCard2Title: "Evaluado en Doctify",
    trustCard2Subtitle: "{count}+ consultas",
  },
  // Brazil — July 2026 SEO brief. Brazil's default locale is pt, but the
  // shared pt.json bundle is Portugal's own PT-PT market copy ("licenciado",
  // "a equipa", "marca"), which reads as European Portuguese — not PT-BR —
  // on the Brazil page. "{country}" substitutions are also skipped here
  // (fully-formed strings instead) for the same reason as es:es above:
  // `config.name` for Brazil is the untranslated English display name
  // ("Brazil"), so "registrado no {country}" would render "no Brazil".
  "br:pt": {
    theTeamBadge: "Nossos médicos",
    heroLedeTemplate:
      "Cada clínico abaixo está registrado no Brasil, verificado para atendimento online e avaliado por pacientes após cada consulta.",
    bookAppointment: "Agendar consulta",
    trustCard1Title: "Registrado no CRM",
    trustCard1Subtitle: "Clínicos totalmente verificados",
    trustCard2Title: "Avaliado no Doctify",
    trustCard2Subtitle: "{count}+ consultas",
  },
  // Same EU/Brazilian consumer-protection issue as Ireland/Romania: the
  // fabricated "4.9 rating / 2,000+ reviews" claim must not appear on the
  // Brazil page in any locale — reuses each locale's already-translated
  // Doctify copy.
  "br:en": {
    trustCard2Title: "Reviewed on Doctify",
    trustCard2Subtitle: "{count}+ consultations",
  },
  "br:es": {
    trustCard2Title: "Valorado en Doctify",
    trustCard2Subtitle: "{count}+ consultas",
  },
  "br:cs": {
    trustCard2Title: "Hodnoceno na Doctify",
    trustCard2Subtitle: "{count}+ konzultací",
  },
  "br:ro": {
    trustCard2Title: "Evaluat pe Doctify",
    trustCard2Subtitle: "{count}+ consultații",
  },
  "br:de": {
    trustCard2Title: "Bewertet auf Doctify",
    trustCard2Subtitle: "{count}+ Konsultationen",
  },
  // Portugal — July 2026 SEO brief. "Registado" (not "licenciado") is the
  // contemporary PT-PT term for regulator registration, and Portugal's roster
  // spans three regulators (OM physicians, OPP psychologists, ON nutritionists) —
  // "organismo regulador competente" accommodates that instead of naming just OM.
  // Same EU Omnibus liability as every other market: the unverifiable "4.9 rating /
  // 2,000+ reviews" claim must not appear on the Portugal page in any locale.
  "pt:pt": {
    theTeamBadge: "Os nossos clínicos",
    heroLedeTemplate:
      "Cada clínico abaixo está registado no organismo regulador competente em Portugal, verificado para atendimento online e avaliado por pacientes após cada consulta.",
    trustCard1Title: "Registado em Portugal",
    trustCard1Subtitle: "Clínicos totalmente verificados",
    trustCard2Title: "Avaliado no Doctify",
    trustCard2Subtitle: "{count}+ consultas",
  },
  "pt:en": {
    trustCard2Title: "Reviewed on Doctify",
    trustCard2Subtitle: "{count}+ consultations",
  },
  "pt:es": {
    trustCard2Title: "Valorado en Doctify",
    trustCard2Subtitle: "{count}+ consultas",
  },
  "pt:cs": {
    trustCard2Title: "Hodnoceno na Doctify",
    trustCard2Subtitle: "{count}+ konzultací",
  },
  "pt:ro": {
    trustCard2Title: "Evaluat pe Doctify",
    trustCard2Subtitle: "{count}+ consultații",
  },
  "pt:de": {
    trustCard2Title: "Bewertet auf Doctify",
    trustCard2Subtitle: "{count}+ Konsultationen",
  },
};

const SEO: Record<string, DoctorDirectorySeo> = {
  "ie:en": {
    title: "Online Doctors Ireland | IMC-Registered GPs & Specialists",
    description:
      "Browse IMC-registered doctors and clinicians in Ireland. View specialties, registration details, languages and online booking options.",
  },
  "ie:es": {
    title: "Médicos Online Irlanda | Médicos y Especialistas en el IMC",
    description:
      "Consulte médicos y profesionales clínicos colegiados en el IMC en Irlanda. Vea especialidades, datos registrales, idiomas y opciones de reserva online.",
  },
  "ie:pt": {
    title: "Médicos Online Irlanda | Clínicos e Especialistas no IMC",
    description:
      "Veja médicos e clínicos registados no IMC na Irlanda. Consulte especialidades, dados de registo, idiomas e opções de marcação online.",
  },
  "ie:cs": {
    title: "Online lékaři Irsko | Praktičtí lékaři a specialisté u IMC",
    description:
      "Prohlédněte si lékaře a kliniky registrované u IMC v Irsku. Zobrazte specializace, registrační údaje, jazyky a možnosti online objednání.",
  },
  "ie:ro": {
    title: "Medici Online Irlanda | Medici și Specialiști Înregistrați la IMC",
    description:
      "Căutați medici și clinicieni înregistrați la IMC în Irlanda. Vedeți specialități, date de înregistrare, limbi vorbite și opțiuni de programare online.",
  },
  "ie:de": {
    title: "Online-Ärzte Irland | Hausärzte und Fachärzte beim IMC",
    description:
      "Finden Sie beim IMC registrierte Ärzte und klinische Fachkräfte in Irland. Sehen Sie Fachgebiete, Registrierungsdaten, Sprachen und Online-Buchungsoptionen.",
  },
};

/** Merge the country/locale override (if any) onto the `doctors` bundle. */
export function overrideDoctorsBundle(
  base: DoctorsBundle,
  code: CountryCode,
  locale: string,
): DoctorsBundle {
  const over = OVERRIDES[key(code, locale)];
  return over ? { ...base, ...over } : base;
}

export function doctorDirectorySeo(
  code: CountryCode,
  locale: string,
): DoctorDirectorySeo | null {
  return SEO[key(code, locale)] ?? null;
}
