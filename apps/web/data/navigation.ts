import type { CommonLocale } from "@/lib/i18n/types";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import type { CountryConfig } from "./countries";
import { countries as seedCountries } from "./countries";

export type NavLink = { label: string; href: string };

export type CountryClinicLinks = {
  country: CountryConfig;
  links: NavLink[];
};

export type FooterColumn = { heading: string; links: NavLink[] };

export type SiteNavigationData = {
  clinicsMenuByCountry: CountryClinicLinks[];
  clinicsOverviewLink: NavLink;
  aboutMenuLinks: NavLink[];
  headerUtilityLinks: NavLink[];
  headerAuthLink: NavLink;
  headerPrimaryCta: NavLink;
  footerColumns: FooterColumn[];
  footerCta: NavLink;
  siteContactEmail: string;
  trustLine: string;
  clinicsLabel: string;
  aboutLabel: string;
  searchCountryOrServiceLabel: string;
  viewAllClinicsLabel: string;
  trustedCareAcrossEuropeLabel: string;
};

function clinicLinksForCountry(c: CountryConfig, copy: CommonLocale): NavLink[] {
  const base: NavLink[] = [
    { label: `${c.name} Home`, href: c.legacyHomePath },
    { label: `${c.name} Team`, href: c.teamPath },
    { label: copy.navigation.generalConsultation, href: c.generalConsultationPath },
    { label: copy.navigation.specialistConsultation, href: c.specialistPath },
  ];

  if (c.code === "ie") {
    return [
      ...base,
      { label: copy.navigation.onlinePrescription, href: "/online-prescription" },
      { label: copy.navigation.homeDelivery, href: "/home-delivery" },
      { label: copy.navigation.plansPricing, href: "/plans-pricing" },
      { label: copy.navigation.healthTests, href: "/home-health-test" },
      { label: copy.navigation.partnerClinics, href: "/partner-clinics" },
    ];
  }

  return base;
}

export function buildSiteNavigationData(
  copy: CommonLocale,
  countries: CountryConfig[],
): SiteNavigationData {
  const clinicsMenuByCountry: CountryClinicLinks[] = countries.map((country) => ({
    country,
    links: clinicLinksForCountry(country, copy),
  }));

  const aboutMenuLinks: NavLink[] = [
    { label: "Ireland Team", href: "/ireland-team" },
    { label: "Portugal Team", href: "/portugal-team" },
    { label: "Romania Team", href: "/romania-team" },
    { label: "Czechia Team", href: "/czechia-team" },
    { label: "Spain Team", href: "/spain-team" },
    { label: copy.footer.careers, href: "/careers" },
  ];

  const headerUtilityLinks: NavLink[] = [
    { label: copy.navigation.blog, href: "/blog" },
    { label: copy.navigation.faq, href: "/frequent-asked-questions" },
    { label: copy.navigation.egiftCard, href: "/gift-card" },
  ];

  const headerAuthLink: NavLink = { label: copy.navigation.login, href: "/login" };
  const headerPrimaryCta: NavLink = {
    label: copy.navigation.bookOnline,
    href: "/book-online",
  };

  const footerColumns: FooterColumn[] = [
    {
      heading: copy.footer.company,
      links: [
        { label: copy.footer.careers, href: "/careers" },
        { label: copy.footer.contactUs, href: "/book-online" },
        { label: copy.footer.clinics, href: "/#countries" },
        { label: copy.footer.aboutUs, href: "/about" },
      ],
    },
    {
      heading: copy.footer.clinics,
      links: countries.map((c) => ({ label: c.name, href: c.legacyHomePath })),
    },
    {
      heading: copy.footer.legal,
      links: [
        { label: copy.navigation.blog, href: "/blog" },
        { label: copy.navigation.faq, href: "/frequent-asked-questions" },
        { label: copy.footer.howItWorks, href: "/#how-it-works" },
      ],
    },
    {
      heading: copy.footer.information,
      links: [
        { label: copy.footer.legalNotices, href: "/legal-notices" },
        { label: copy.footer.terms, href: "/term-and-conditions" },
        { label: copy.footer.cookies, href: "/cookies-policy" },
        { label: copy.footer.refund, href: "/return-and-refund-policy" },
        { label: copy.footer.privacy, href: "/privacy" },
      ],
    },
  ];

  return {
    clinicsMenuByCountry,
    clinicsOverviewLink: { label: copy.navigation.viewAllClinics, href: "/#countries" },
    aboutMenuLinks,
    headerUtilityLinks,
    headerAuthLink,
    headerPrimaryCta,
    footerColumns,
    footerCta: { label: copy.footer.cta, href: "/book-online" },
    siteContactEmail: "info@myglobalhealth.online",
    trustLine: copy.footer.trustLine,
    clinicsLabel: copy.navigation.clinics,
    aboutLabel: copy.navigation.about,
    searchCountryOrServiceLabel: copy.navigation.searchCountryOrService,
    viewAllClinicsLabel: copy.navigation.viewAllClinics,
    trustedCareAcrossEuropeLabel: copy.navigation.trustedCareAcrossEurope,
  };
}

const defaultCopy = getCommonLocale("en");
export const defaultSiteNavigation = buildSiteNavigationData(defaultCopy, seedCountries);
