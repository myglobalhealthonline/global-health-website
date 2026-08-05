import type { LocaleCode } from "@/lib/i18n/types";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { deepMergeLocale } from "@/lib/i18n/deep-merge-locale";

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

import enAbout from "@/locales/en/about.json";
import ptAbout from "@/locales/pt/about.json";
import esAbout from "@/locales/es/about.json";
import csAbout from "@/locales/cs/about.json";
import roAbout from "@/locales/ro/about.json";
import deAbout from "@/locales/de/about.json";

import enContact from "@/locales/en/contact.json";
import ptContact from "@/locales/pt/contact.json";
import esContact from "@/locales/es/contact.json";
import csContact from "@/locales/cs/contact.json";
import roContact from "@/locales/ro/contact.json";
import deContact from "@/locales/de/contact.json";

import enAuth from "@/locales/en/auth.json";
import ptAuth from "@/locales/pt/auth.json";
import esAuth from "@/locales/es/auth.json";
import csAuth from "@/locales/cs/auth.json";
import roAuth from "@/locales/ro/auth.json";
import deAuth from "@/locales/de/auth.json";

import enAccount from "@/locales/en/account.json";
import ptAccount from "@/locales/pt/account.json";
import esAccount from "@/locales/es/account.json";
import csAccount from "@/locales/cs/account.json";
import roAccount from "@/locales/ro/account.json";
import deAccount from "@/locales/de/account.json";

import enDoctor from "@/locales/en/doctor.json";
import ptDoctor from "@/locales/pt/doctor.json";
import esDoctor from "@/locales/es/doctor.json";
import csDoctor from "@/locales/cs/doctor.json";
import roDoctor from "@/locales/ro/doctor.json";
import deDoctor from "@/locales/de/doctor.json";

import enSubscription from "@/locales/en/subscription.json";
import ptSubscription from "@/locales/pt/subscription.json";
import esSubscription from "@/locales/es/subscription.json";
import csSubscription from "@/locales/cs/subscription.json";
import roSubscription from "@/locales/ro/subscription.json";
import deSubscription from "@/locales/de/subscription.json";

import enCorporate from "@/locales/en/corporate.json";
import ptCorporate from "@/locales/pt/corporate.json";
import esCorporate from "@/locales/es/corporate.json";
import csCorporate from "@/locales/cs/corporate.json";
import roCorporate from "@/locales/ro/corporate.json";
import deCorporate from "@/locales/de/corporate.json";

import enTools from "@/locales/en/tools.json";
import ptTools from "@/locales/pt/tools.json";
import esTools from "@/locales/es/tools.json";
import csTools from "@/locales/cs/tools.json";
import roTools from "@/locales/ro/tools.json";
import deTools from "@/locales/de/tools.json";

const homeByLocale = { en: enHome, pt: ptHome, es: esHome, cs: csHome, ro: roHome, de: deHome } as const;
const servicesByLocale = { en: enServices, pt: ptServices, es: esServices, cs: csServices, ro: roServices, de: deServices } as const;
const faqByLocale = { en: enFaq, pt: ptFaq, es: esFaq, cs: csFaq, ro: roFaq, de: deFaq } as const;
const legalByLocale = { en: enLegal, pt: ptLegal, es: esLegal, cs: csLegal, ro: roLegal, de: deLegal } as const;
const formsByLocale = { en: enForms, pt: ptForms, es: esForms, cs: csForms, ro: roForms, de: deForms } as const;
const aboutByLocale = { en: enAbout, pt: ptAbout, es: esAbout, cs: csAbout, ro: roAbout, de: deAbout } as const;
const contactByLocale = { en: enContact, pt: ptContact, es: esContact, cs: csContact, ro: roContact, de: deContact } as const;
const authByLocale = { en: enAuth, pt: ptAuth, es: esAuth, cs: csAuth, ro: roAuth, de: deAuth } as const;
const accountByLocale = { en: enAccount, pt: ptAccount, es: esAccount, cs: csAccount, ro: roAccount, de: deAccount } as const;
const subscriptionByLocale = { en: enSubscription, pt: ptSubscription, es: esSubscription, cs: csSubscription, ro: roSubscription, de: deSubscription } as const;
const doctorByLocale = { en: enDoctor, pt: ptDoctor, es: esDoctor, cs: csDoctor, ro: roDoctor, de: deDoctor } as const;
const corporateByLocale = { en: enCorporate, pt: ptCorporate, es: esCorporate, cs: csCorporate, ro: roCorporate, de: deCorporate } as const;
const toolsByLocale = { en: enTools, pt: ptTools, es: esTools, cs: csTools, ro: roTools, de: deTools } as const;

function buildLocaleBundle(locale: LocaleCode) {
  return {
    common: getCommonLocale(locale),
    home: deepMergeLocale(homeByLocale.en, homeByLocale[locale]),
    services: deepMergeLocale(servicesByLocale.en, servicesByLocale[locale]),
    faq: deepMergeLocale(faqByLocale.en, faqByLocale[locale]),
    legal: deepMergeLocale(legalByLocale.en, legalByLocale[locale]),
    forms: deepMergeLocale(formsByLocale.en, formsByLocale[locale]),
    about: deepMergeLocale(aboutByLocale.en, aboutByLocale[locale]),
    contact: deepMergeLocale(contactByLocale.en, contactByLocale[locale]),
    auth: deepMergeLocale(authByLocale.en, authByLocale[locale]),
    account: deepMergeLocale(accountByLocale.en, accountByLocale[locale]),
    subscription: deepMergeLocale(subscriptionByLocale.en, subscriptionByLocale[locale]),
    // en doctor.json is the schema source of truth; the translation
    // workflow keeps the other locales key-complete, so type against en.
    doctor: deepMergeLocale(enDoctor, doctorByLocale[locale] ?? doctorByLocale.en) as typeof enDoctor,
    // en corporate.json is the schema source of truth, same pattern as doctor.
    corporate: deepMergeLocale(enCorporate, corporateByLocale[locale] ?? corporateByLocale.en) as typeof enCorporate,
    // en tools.json is the schema source of truth — the free health tools ship
    // in every market, so an untranslated key must fall back rather than blank.
    tools: deepMergeLocale(enTools, toolsByLocale[locale] ?? toolsByLocale.en) as typeof enTools,
  };
}

// Module-level cache: each locale's merged bundle is computed once, not per
// request/render (missing keys in a non-en JSON fall back to English).
const bundleCache = new Map<LocaleCode, ReturnType<typeof buildLocaleBundle>>();

export function loadLocaleBundle(locale: LocaleCode) {
  const cached = bundleCache.get(locale);
  if (cached) return cached;
  const bundle = buildLocaleBundle(locale);
  bundleCache.set(locale, bundle);
  return bundle;
}
