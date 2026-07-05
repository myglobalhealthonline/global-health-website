import type { CommonLocale } from "@/lib/i18n/types";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import type { CountryConfig } from "./countries";
import { countries as seedCountries } from "./countries";

export type NavLink = { label: string; href: string };

export type FooterColumn = { heading: string; links: NavLink[] };

export type SiteNavigationData = {
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
  navHome: string;
  navDoctors: string;
  navServices: string;
  navPlans: string;
  navBlog: string;
  navAbout: string;
  navFaq: string;
  navContact: string;
  navBookAppointment: string;
  navBookShort: string;
  navBookGp: string;
  navBookGpDesc: string;
  navSeeSpecialist: string;
  navSeeSpecialistDesc: string;
  navRepeatPrescription: string;
  navRepeatPrescriptionDesc: string;
  navLabTests: string;
  navLabTestsDesc: string;
  navHowItWorks: string;
  navChooseCountry: string;
  navLanguage: string;
  navCloseMenu: string;
  navAdminPortal: string;
  navAccountPortal: string;
  navBookNow: string;
  footerCareHeading: string;
  footerClinicsHeading: string;
  footerAccountHeading: string;
  footerCompanyHeading: string;
  footerOurDoctors: string;
  footerSignIn: string;
  footerCreateAccount: string;
  footerForgotPassword: string;
  footerMyAccount: string;
  footerContactUs: string;
  footerPrivacyPolicy: string;
  footerTermsOfService: string;
  footerTagline: string;
  footerStayInformed: string;
  footerNewsletterDesc: string;
  footerSubscribe: string;
  footerNewsletterSuccess: string;
  footerDisclaimer: string;
  footerCopyrightSuffix: string;
  footerPrivacyLink: string;
  footerEuCompliant: string;
};

export function buildSiteNavigationData(
  copy: CommonLocale,
  countries: CountryConfig[],
): SiteNavigationData {
  // Phase 1: nav is country-first. Country/team links live in the Clinics
  // dropdown; About menu is intentionally light. Wix legacy items (gift card,
  // careers detail pages, etc.) are deferred for Phase 2+.
  const aboutMenuLinks: NavLink[] = [
    { label: copy.footer.aboutUs, href: "/about" },
  ];

  const headerUtilityLinks: NavLink[] = [];

  const headerAuthLink: NavLink = { label: copy.navigation.login, href: "/login" };
  const headerPrimaryCta: NavLink = {
    label: copy.navigation.bookOnline,
    href: "/ireland/en/book",
  };

  const footerColumns: FooterColumn[] = [
    {
      heading: copy.footer.company,
      links: [
        { label: copy.footer.contactUs, href: "/contact" },
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
        { label: copy.footer.howItWorks, href: "/#how-it-works" },
      ],
    },
  ];

  return {
    clinicsOverviewLink: { label: copy.navigation.viewAllClinics, href: "/#countries" },
    aboutMenuLinks,
    headerUtilityLinks,
    headerAuthLink,
    headerPrimaryCta,
    footerColumns,
    footerCta: { label: copy.footer.cta, href: "/ireland/en/book" },
    siteContactEmail: "info@myglobalhealth.online",
    trustLine: copy.footer.trustLine,
    clinicsLabel: copy.navigation.clinics,
    aboutLabel: copy.navigation.about,
    searchCountryOrServiceLabel: copy.navigation.searchCountryOrService,
    viewAllClinicsLabel: copy.navigation.viewAllClinics,
    trustedCareAcrossEuropeLabel: copy.navigation.trustedCareAcrossEurope,
    navHome: copy.navigation.home,
    navDoctors: copy.navigation.doctors,
    navServices: copy.navigation.services,
    navPlans: copy.navigation.plansPricing,
    navBlog: copy.navigation.blog,
    navAbout: copy.navigation.about,
    navFaq: copy.navigation.faq,
    navContact: copy.navigation.contact,
    navBookAppointment: copy.navigation.bookAppointment,
    navBookShort: copy.navigation.bookShort,
    navBookGp: copy.navigation.bookGp,
    navBookGpDesc: copy.navigation.bookGpDesc,
    navSeeSpecialist: copy.navigation.seeSpecialist,
    navSeeSpecialistDesc: copy.navigation.seeSpecialistDesc,
    navRepeatPrescription: copy.navigation.repeatPrescription,
    navRepeatPrescriptionDesc: copy.navigation.repeatPrescriptionDesc,
    navLabTests: copy.navigation.labTests,
    navLabTestsDesc: copy.navigation.labTestsDesc,
    navHowItWorks: copy.navigation.howItWorks,
    navChooseCountry: copy.navigation.chooseCountry,
    navLanguage: copy.navigation.language,
    navCloseMenu: copy.navigation.closeMenu,
    navAdminPortal: copy.navigation.adminPortal,
    navAccountPortal: copy.navigation.accountPortal,
    navBookNow: copy.navigation.bookNow,
    footerCareHeading: copy.footer.careHeading,
    footerClinicsHeading: copy.footer.clinicsHeading,
    footerAccountHeading: copy.footer.accountHeading,
    footerCompanyHeading: copy.footer.companyHeading,
    footerOurDoctors: copy.footer.ourDoctors,
    footerSignIn: copy.footer.signIn,
    footerCreateAccount: copy.footer.createAccount,
    footerForgotPassword: copy.footer.forgotPassword,
    footerMyAccount: copy.footer.myAccount,
    footerContactUs: copy.footer.contactUs,
    footerPrivacyPolicy: copy.footer.privacyPolicy,
    footerTermsOfService: copy.footer.termsOfService,
    footerTagline: copy.footer.tagline,
    footerStayInformed: copy.footer.stayInformed,
    footerNewsletterDesc: copy.footer.newsletterDesc,
    footerSubscribe: copy.footer.subscribe,
    footerNewsletterSuccess: copy.footer.newsletterSuccess,
    footerDisclaimer: copy.footer.disclaimer,
    footerCopyrightSuffix: copy.footer.copyrightSuffix,
    footerPrivacyLink: copy.footer.privacyLink,
    footerEuCompliant: copy.footer.euCompliant,
  };
}

const defaultCopy = getCommonLocale("en");
export const defaultSiteNavigation = buildSiteNavigationData(defaultCopy, seedCountries);
