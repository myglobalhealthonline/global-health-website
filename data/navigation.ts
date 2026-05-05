import type { CountryConfig } from "./countries";
import { countries } from "./countries";

export type NavLink = { label: string; href: string };

export type CountryClinicLinks = {
  country: CountryConfig;
  links: NavLink[];
};

const sharedIrelandLinks: NavLink[] = [
  { label: "Online Prescriptions", href: "/online-prescription" },
  { label: "Home Delivery", href: "/home-delivery" },
  { label: "Plans & Pricing", href: "/plans-pricing" },
  { label: "Health Tests", href: "/home-health-test" },
  { label: "Partner Clinics", href: "/partner-clinics" },
];

function clinicLinksForCountry(c: CountryConfig): NavLink[] {
  const base: NavLink[] = [
    { label: `${c.name} Home`, href: c.legacyHomePath },
    { label: `${c.name} Team`, href: c.teamPath },
    { label: "General Consultation", href: c.generalConsultationPath },
    { label: "Specialist Consultation", href: c.specialistPath },
  ];
  if (c.code === "ie") {
    return [...base, ...sharedIrelandLinks];
  }
  return base;
}

/** Clinics mega-menu sections (desktop + mobile accordion). */
export const clinicsMenuByCountry: CountryClinicLinks[] = countries.map(
  (country) => ({
    country,
    links: clinicLinksForCountry(country),
  }),
);

/** About dropdown — team entry points + careers. */
export const aboutMenuLinks: NavLink[] = [
  { label: "Ireland Team", href: "/ireland-team" },
  { label: "Portugal Team", href: "/portugal-team" },
  { label: "Romania Team", href: "/romania-team" },
  { label: "Czechia Team", href: "/czechia-team" },
  { label: "Spain Team", href: "/spain-team" },
  { label: "Careers", href: "/careers" },
];

export const headerUtilityLinks: NavLink[] = [
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/frequent-asked-questions" },
  { label: "eGift Card", href: "/gift-card" },
];

export const headerAuthLink: NavLink = { label: "Log In", href: "/login" };

export const headerPrimaryCta: NavLink = {
  label: "Book Online",
  href: "/book-online",
};

export type FooterColumn = { heading: string; links: NavLink[] };

export const footerColumns: FooterColumn[] = [
  {
    heading: "Company",
    links: [
      { label: "Careers", href: "/careers" },
      { label: "Contact us", href: "/book-online" },
      { label: "Clinics", href: "/#countries" },
      { label: "About us", href: "/about" },
    ],
  },
  {
    heading: "Clinics",
    links: countries.map((c) => ({
      label: c.name,
      href: c.legacyHomePath,
    })),
  },
  {
    heading: "Legal",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "FAQ", href: "/frequent-asked-questions" },
      { label: "How it works", href: "/#how-it-works" },
    ],
  },
  {
    heading: "Information",
    links: [
      { label: "Legal Notices", href: "/legal-notices" },
      { label: "Terms and Conditions", href: "/term-and-conditions" },
      { label: "Cookies Policy", href: "/cookies-policy" },
      { label: "Refund and Return Policy", href: "/return-and-refund-policy" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export const footerCta: NavLink = {
  label: "Start Your Online Consultation",
  href: "/book-online",
};

export const siteContactEmail = "info@myglobalhealth.online";
