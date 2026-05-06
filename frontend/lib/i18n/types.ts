export const supportedLocaleCodes = ["en", "pt", "es", "cs", "ro", "de"] as const;

export type LocaleCode = (typeof supportedLocaleCodes)[number];

export type CommonLocale = {
  site: { name: string };
  navigation: {
    clinics: string;
    about: string;
    blog: string;
    faq: string;
    egiftCard: string;
    login: string;
    bookOnline: string;
    generalConsultation: string;
    specialistConsultation: string;
    onlinePrescription: string;
    homeDelivery: string;
    plansPricing: string;
    healthTests: string;
    partnerClinics: string;
    searchCountryOrService: string;
    viewAllClinics: string;
    trustedCareAcrossEurope: string;
  };
  footer: {
    company: string;
    clinics: string;
    legal: string;
    information: string;
    careers: string;
    contactUs: string;
    aboutUs: string;
    howItWorks: string;
    legalNotices: string;
    terms: string;
    cookies: string;
    refund: string;
    privacy: string;
    copyright: string;
    cta: string;
    trustLine: string;
  };
  countrySelector: {
    title: string;
    description: string;
    enterClinic: string;
  };
  cta: {
    primaryBooking: string;
  };
};
