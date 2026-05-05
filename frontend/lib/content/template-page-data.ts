import type { CountryCode } from "@/data/countries";
import { countries, getCountryByCode } from "@/data/countries";
import { routeInventory } from "@/data/routes";
import { getSiteContext } from "@/lib/content/get-site-context";

type CountryHint = CountryCode | "auto";

const pathByCountry: Record<CountryCode, { home: string; team: string; general: string; specialist: string }> = {
  ie: { home: "/home", team: "/ireland-team", general: "/general-consultation-ie", specialist: "/specialty-ie" },
  pt: { home: "/home-pt", team: "/portugal-team", general: "/general-consultation-pt", specialist: "/specialty-pt" },
  sp: { home: "/home-sp", team: "/spain-team", general: "/general-consultation-sp", specialist: "/specialty-sp" },
  cz: { home: "/home-cz", team: "/czechia-team", general: "/general-consultation-cz", specialist: "/specialty-cz" },
  rm: { home: "/home-rm", team: "/romania-team", general: "/general-consultation-rm", specialist: "/specialty-rm" },
};

function fallbackByPath(pathname: string): CountryCode {
  const exact = countries.find((country) => pathByCountry[country.code].home === pathname || pathByCountry[country.code].team === pathname || pathByCountry[country.code].general === pathname || pathByCountry[country.code].specialist === pathname);
  if (exact) return exact.code;
  return "ie";
}

function slugToLabel(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getTemplatePageData(pathname: string, countryHint: CountryHint = "auto") {
  const site = await getSiteContext({ pathname });
  const countryCode = countryHint === "auto" ? fallbackByPath(pathname) : countryHint;
  const country = getCountryByCode(countryCode) ?? site.country;

  const generalListing = routeInventory.irelandGeneralConsultation.map((route) => {
    const slug = route.replace("/ireland/", "");
    return {
      title: slugToLabel(slug),
      description: "TODO: Replace with verified service summary from CMS/backend content.",
      href: route,
    };
  });

  const specialistListing = routeInventory.irelandSpecialistConsultation.map((route) => {
    const slug = route.replace("/ireland-specialist-consultations/", "");
    return {
      title: slugToLabel(slug),
      description: "TODO: Replace with verified specialty summary from CMS/backend content.",
      href: route,
    };
  });

  const doctors = [
    {
      name: `${country.name} Clinic Team`,
      title: "Licensed clinicians",
      bio: "TODO: Replace with doctor records from backend-admin managed profiles.",
    },
  ];

  const faqItems = [
    {
      question: "How do online consultations work?",
      answer: "Book online, complete intake, and connect securely with a licensed clinician.",
    },
    {
      question: "Can I choose my clinician?",
      answer: "Availability depends on clinic schedule and service type.",
    },
  ];

  const blogPosts = routeInventory.blogPosts.slice(0, 9).map((route) => {
    const slug = route.replace("/post/", "");
    return {
      title: slugToLabel(slug),
      excerpt: "TODO: Replace with article excerpt from content system.",
      href: route,
    };
  });

  return {
    site,
    country,
    paths: pathByCountry[country.code],
    generalListing,
    specialistListing,
    doctors,
    faqItems,
    blogPosts,
  };
}

export function buildServiceDetailCopy(slug: string) {
  const title = slugToLabel(slug);
  return {
    title,
    description: "Informational placeholder while clinical copy is being migrated.",
    body: [
      "TODO: Replace this section with reviewed service copy from backend content administration.",
      "This template intentionally avoids medical claims until verified source content is integrated.",
    ],
  };
}

export function buildLegalCopy(title: string) {
  return {
    description: "Policy placeholder content pending legal copy migration and compliance review.",
    sections: [
      {
        heading: "Status",
        body: `TODO: Add reviewed legal text for ${title} from approved source documents.`,
      },
      {
        heading: "Scope",
        body: "This page template is wired and production-safe, but legal body copy remains pending migration.",
      },
    ],
  };
}
