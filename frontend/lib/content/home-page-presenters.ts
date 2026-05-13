import type { CountryCode } from "@/data/countries";
import type { CountryHomeTemplateProps } from "@/components/templates/CountryHomeTemplate";
import type { getTemplatePageData } from "@/lib/content/template-page-data";

type TemplateData = Awaited<ReturnType<typeof getTemplatePageData>>;

export function toCountryHomeTemplateProps(
  data: TemplateData,
): CountryHomeTemplateProps {
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
    specialties: data.countryHome.specialties,
    serviceCards: data.countryHome.serviceCards,
    steps: data.countryHome.steps,
    homeDelivery: data.countryHome.homeDelivery,
    doctorSpotlight: data.countryHome.doctorSpotlight,
    trustTitle: data.countryHome.trust.title,
    trustSubtitle: data.countryHome.trust.subtitle,
    trustItems: data.countryHome.trust.items,
    bookingCta: data.countryHome.booking,
    partnerLogos: data.countryHome.partnerLogos ?? [],
    partnerTrustLine: data.countryHome.partnerTrustLine,
  };
}

export function getCountryCodeFromPath(pathname: string): CountryCode {
  if (pathname === "/home-pt") return "pt";
  if (pathname === "/home-sp") return "sp";
  if (pathname === "/home-cz") return "cz";
  if (pathname === "/home-rm") return "rm";
  return "ie";
}
