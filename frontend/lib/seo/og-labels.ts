import type { OgImageKind } from "@/lib/seo/og-image";

type OgLanguage = "en" | "pt" | "es" | "cs" | "ro" | "de";

const LABELS: Readonly<Record<OgLanguage, Readonly<Record<OgImageKind, string>>>> = {
  en: {
    page: "GLOBAL HEALTH",
    country: "HEALTHCARE WITHOUT BORDERS",
    service: "CLINICAL SERVICE",
    doctor: "MEET YOUR DOCTOR",
    article: "HEALTH JOURNAL",
    pricing: "PLANS & PRICING",
    corporate: "GLOBAL HEALTH FOR TEAMS",
    legal: "INFORMATION",
  },
  pt: {
    page: "SAÚDE GLOBAL",
    country: "SAÚDE SEM FRONTEIRAS",
    service: "SERVIÇO CLÍNICO",
    doctor: "CONHEÇA SEU MÉDICO",
    article: "REVISTA DE SAÚDE",
    pricing: "PLANOS E PREÇOS",
    corporate: "SAÚDE GLOBAL PARA EQUIPES",
    legal: "INFORMAÇÕES",
  },
  es: {
    page: "SALUD GLOBAL",
    country: "SALUD SIN FRONTERAS",
    service: "SERVICIO CLÍNICO",
    doctor: "CONOCE A TU MÉDICO",
    article: "REVISTA DE SALUD",
    pricing: "PLANES Y PRECIOS",
    corporate: "SALUD GLOBAL PARA EQUIPOS",
    legal: "INFORMACIÓN",
  },
  cs: {
    page: "GLOBÁLNÍ ZDRAVÍ",
    country: "ZDRAVOTNÍ PÉČE BEZ HRANIC",
    service: "KLINICKÁ SLUŽBA",
    doctor: "POZNEJTE SVÉHO LÉKAŘE",
    article: "ZDRAVOTNÍ MAGAZÍN",
    pricing: "PLÁNY A CENY",
    corporate: "GLOBÁLNÍ ZDRAVÍ PRO TÝMY",
    legal: "INFORMACE",
  },
  ro: {
    page: "SĂNĂTATE GLOBALĂ",
    country: "SĂNĂTATE FĂRĂ FRONTIERE",
    service: "SERVICIU CLINIC",
    doctor: "CUNOAȘTEȚI MEDICUL DVS.",
    article: "JURNAL DE SĂNĂTATE",
    pricing: "PLANURI ȘI PREȚURI",
    corporate: "SĂNĂTATE GLOBALĂ PENTRU ECHIPE",
    legal: "INFORMAȚII",
  },
  de: {
    page: "GLOBALE GESUNDHEIT",
    country: "GESUNDHEIT OHNE GRENZEN",
    service: "MEDIZINISCHE LEISTUNG",
    doctor: "IHR ARZT IM PORTRÄT",
    article: "GESUNDHEITSMAGAZIN",
    pricing: "PLÄNE & PREISE",
    corporate: "GLOBALE GESUNDHEIT FÜR TEAMS",
    legal: "INFORMATIONEN",
  },
};

export function getOgLabel(kind: OgImageKind, locale?: string): string {
  const language = locale?.trim().toLowerCase().split(/[-_]/u, 1)[0] as OgLanguage | undefined;
  return (language && LABELS[language] ? LABELS[language] : LABELS.en)[kind];
}
