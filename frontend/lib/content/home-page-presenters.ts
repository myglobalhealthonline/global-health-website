import type { CountryCode } from "@/data/countries";
import type { CountryHomeTemplateProps } from "@/components/templates/CountryHomeTemplate";
import type { getTemplatePageData } from "@/lib/content/template-page-data";

type TemplateData = Awaited<ReturnType<typeof getTemplatePageData>>;

export function toCountryHomeTemplateProps(
  data: TemplateData,
  options?: { includeDoctors?: boolean; includeFaqs?: boolean },
): CountryHomeTemplateProps {
  const includeDoctors = options?.includeDoctors ?? true;
  const includeFaqs = options?.includeFaqs ?? true;

  return {
    countryName: data.country.name,
    hero: data.countryHome.hero,
    primaryBooking: {
      href: data.paths.general,
      label: data.countryHome.booking.ctaLabel,
    },
    quickActions: data.countryHome.quickActions,
    availability: data.countryHome.availability,
    about: data.countryHome.about,
    servicesTitle: data.countryHome.specialties.title,
    servicesIntro: data.countryHome.specialties.subtitle,
    servicesCta: data.countryHome.specialties.cta,
    services:
      data.country.code === "ie"
        ? data.specialistListing.slice(0, 6)
        : data.countryHome.serviceCards,
    steps: data.countryHome.steps,
    homeDelivery: data.countryHome.homeDelivery,
    doctorsTitle: `${data.country.name} medical team`,
    doctorSpotlight: data.countryHome.doctorSpotlight,
    doctors: includeDoctors ? data.doctors : [],
    trustTitle: data.countryHome.trust.title,
    trustSubtitle: data.countryHome.trust.subtitle,
    trustItems: data.countryHome.trust.items,
    faqTitle: data.countryHome.faqTitle,
    faqs: includeFaqs ? data.faqItems : [],
    bookingCta: data.countryHome.booking,
  };
}

export function getCountryCodeFromPath(pathname: string): CountryCode {
  if (pathname === "/home-pt") return "pt";
  if (pathname === "/home-sp") return "sp";
  if (pathname === "/home-cz") return "cz";
  if (pathname === "/home-rm") return "rm";
  return "ie";
}
