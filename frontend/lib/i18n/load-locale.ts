import type { LocaleCode } from "@/lib/i18n/types";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";

import enHome from "@/locales/en/home.json";
import ptHome from "@/locales/pt/home.json";
import esHome from "@/locales/es/home.json";
import csHome from "@/locales/cs/home.json";
import roHome from "@/locales/ro/home.json";
import deHome from "@/locales/de/home.json";

import enServices from "@/locales/en/services.json";
import ptServices from "@/locales/pt/services.json";
import esServices from "@/locales/es/services.json";
import csServices from "@/locales/cs/services.json";
import roServices from "@/locales/ro/services.json";
import deServices from "@/locales/de/services.json";

import enFaq from "@/locales/en/faq.json";
import ptFaq from "@/locales/pt/faq.json";
import esFaq from "@/locales/es/faq.json";
import csFaq from "@/locales/cs/faq.json";
import roFaq from "@/locales/ro/faq.json";
import deFaq from "@/locales/de/faq.json";

import enLegal from "@/locales/en/legal.json";
import ptLegal from "@/locales/pt/legal.json";
import esLegal from "@/locales/es/legal.json";
import csLegal from "@/locales/cs/legal.json";
import roLegal from "@/locales/ro/legal.json";
import deLegal from "@/locales/de/legal.json";

import enForms from "@/locales/en/forms.json";
import ptForms from "@/locales/pt/forms.json";
import esForms from "@/locales/es/forms.json";
import csForms from "@/locales/cs/forms.json";
import roForms from "@/locales/ro/forms.json";
import deForms from "@/locales/de/forms.json";

const homeByLocale = { en: enHome, pt: ptHome, es: esHome, cs: csHome, ro: roHome, de: deHome } as const;
const servicesByLocale = { en: enServices, pt: ptServices, es: esServices, cs: csServices, ro: roServices, de: deServices } as const;
const faqByLocale = { en: enFaq, pt: ptFaq, es: esFaq, cs: csFaq, ro: roFaq, de: deFaq } as const;
const legalByLocale = { en: enLegal, pt: ptLegal, es: esLegal, cs: csLegal, ro: roLegal, de: deLegal } as const;
const formsByLocale = { en: enForms, pt: ptForms, es: esForms, cs: csForms, ro: roForms, de: deForms } as const;

export function loadLocaleBundle(locale: LocaleCode) {
  return {
    common: getCommonLocale(locale),
    home: homeByLocale[locale] ?? homeByLocale.en,
    services: servicesByLocale[locale] ?? servicesByLocale.en,
    faq: faqByLocale[locale] ?? faqByLocale.en,
    legal: legalByLocale[locale] ?? legalByLocale.en,
    forms: formsByLocale[locale] ?? formsByLocale.en,
  };
}
