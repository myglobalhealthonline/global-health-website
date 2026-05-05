import { routeInventory } from "@/data/routes";
import type { LocaleCode } from "@/lib/i18n/types";

export type PublicTemplateType =
  | "CountryHomeTemplate"
  | "ConsultationListingTemplate"
  | "ServiceDetailTemplate"
  | "DoctorTeamTemplate"
  | "DoctorProfileTemplate"
  | "BlogIndexTemplate"
  | "BlogArticleTemplate"
  | "LegalPageTemplate"
  | "BookingFormTemplate"
  | "StaticMarketingTemplate";

export type PublicRouteRegistryEntry = {
  routeKey: string;
  path: string;
  canonicalPath: string;
  template: PublicTemplateType;
  countryCode?: "ie" | "pt" | "sp" | "cz" | "rm";
  showInNavigation: boolean;
  showInLanguageSwitcher: boolean;
  legacy: boolean;
  availableLocales: LocaleCode[];
  fallbackLocale: LocaleCode;
  labels: {
    pageLabel: string;
    navigationLabel: string;
    pageTitle: string;
    shortDescription: string;
  };
};

const allLocales: LocaleCode[] = ["en", "pt", "es", "cs", "ro", "de"];
const countryLocales: Record<NonNullable<PublicRouteRegistryEntry["countryCode"]>, LocaleCode[]> = {
  ie: ["en", "pt", "es"],
  pt: ["pt", "en"],
  sp: ["es", "en"],
  cz: ["cs", "en"],
  rm: ["ro", "en"],
};

function toSlugLabel(value: string) {
  return value
    .replace(/^\//, "")
    .replace(/\[|\]/g, "")
    .split("/")
    .pop()
    ?.split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") ?? value;
}

function toRouteKey(path: string) {
  return path
    .replace(/^\//, "")
    .replace(/\[|\]/g, "")
    .replace(/\//g, ".")
    .replace(/-/g, "_")
    .replace(/\./g, ".")
    .replace(/__+/g, "_") || "root";
}

function baseEntry(
  path: string,
  template: PublicTemplateType,
  labels: PublicRouteRegistryEntry["labels"],
  overrides: Partial<Omit<PublicRouteRegistryEntry, "path" | "template" | "labels" | "routeKey">> = {},
): PublicRouteRegistryEntry {
  return {
    routeKey: `route.${toRouteKey(path)}`,
    path,
    canonicalPath: overrides.canonicalPath ?? path,
    template,
    showInNavigation: overrides.showInNavigation ?? false,
    showInLanguageSwitcher: overrides.showInLanguageSwitcher ?? true,
    legacy: overrides.legacy ?? false,
    availableLocales:
      overrides.availableLocales ??
      (overrides.countryCode ? countryLocales[overrides.countryCode] : allLocales),
    fallbackLocale: overrides.fallbackLocale ?? "en",
    labels,
    ...(overrides.countryCode ? { countryCode: overrides.countryCode } : {}),
  };
}

export const publicRouteRegistry: PublicRouteRegistryEntry[] = [
  baseEntry("/", "CountryHomeTemplate", {
    pageLabel: "Global home",
    navigationLabel: "Home",
    pageTitle: "Global Health",
    shortDescription: "Global entry page with country selector.",
  }, { showInNavigation: true }),
  baseEntry("/home", "CountryHomeTemplate", {
    pageLabel: "Ireland home",
    navigationLabel: "Ireland",
    pageTitle: "Ireland Clinic Home",
    shortDescription: "Ireland clinic homepage.",
  }, { showInNavigation: true, countryCode: "ie", legacy: true }),
  baseEntry("/home-pt", "CountryHomeTemplate", {
    pageLabel: "Portugal home",
    navigationLabel: "Portugal",
    pageTitle: "Portugal Clinic Home",
    shortDescription: "Portugal clinic homepage.",
  }, { showInNavigation: true, countryCode: "pt", legacy: true }),
  baseEntry("/home-sp", "CountryHomeTemplate", {
    pageLabel: "Spain home",
    navigationLabel: "Spain",
    pageTitle: "Spain Clinic Home",
    shortDescription: "Spain clinic homepage.",
  }, { showInNavigation: true, countryCode: "sp", legacy: true }),
  baseEntry("/home-cz", "CountryHomeTemplate", {
    pageLabel: "Czechia home",
    navigationLabel: "Czechia",
    pageTitle: "Czechia Clinic Home",
    shortDescription: "Czechia clinic homepage.",
  }, { showInNavigation: true, countryCode: "cz", legacy: true }),
  baseEntry("/home-rm", "CountryHomeTemplate", {
    pageLabel: "Romania home",
    navigationLabel: "Romania",
    pageTitle: "Romania Clinic Home",
    shortDescription: "Romania clinic homepage.",
  }, { showInNavigation: true, countryCode: "rm", legacy: true }),
  baseEntry("/book-online", "BookingFormTemplate", {
    pageLabel: "Book online",
    navigationLabel: "Book online",
    pageTitle: "Book Online Consultation",
    shortDescription: "Booking form and intake placeholder.",
  }, { showInNavigation: true }),
  ...[
    "/about",
    "/careers",
    "/frequent-asked-questions",
    "/gift-card",
    "/plans-pricing",
    "/pricing-plans/list",
    "/online-prescription",
    "/home-delivery",
    "/home-health-test",
    "/partner-clinics",
    "/corporate-plans",
  ].map((path) =>
    baseEntry(path, "StaticMarketingTemplate", {
      pageLabel: toSlugLabel(path),
      navigationLabel: toSlugLabel(path),
      pageTitle: toSlugLabel(path),
      shortDescription: "Static marketing page driven by adapter data.",
    }, { showInNavigation: ["/about", "/careers"].includes(path) }),
  ),
  ...[
    "/ireland-team",
    "/portugal-team",
    "/spain-team",
    "/czechia-team",
    "/romania-team",
  ].map((path) =>
    baseEntry(path, "DoctorTeamTemplate", {
      pageLabel: toSlugLabel(path),
      navigationLabel: toSlugLabel(path),
      pageTitle: toSlugLabel(path),
      shortDescription: "Country medical team listing page.",
    }, { countryCode: path.includes("portugal") ? "pt" : path.includes("spain") ? "sp" : path.includes("czechia") ? "cz" : path.includes("romania") ? "rm" : "ie" }),
  ),
  ...[
    "/general-consultation-ie",
    "/general-consultation-pt",
    "/general-consultation-sp",
    "/general-consultation-cz",
    "/general-consultation-rm",
    "/specialty-ie",
    "/specialty-pt",
    "/specialty-sp",
    "/specialty-cz",
    "/specialty-rm",
  ].map((path) =>
    baseEntry(path, "ConsultationListingTemplate", {
      pageLabel: toSlugLabel(path),
      navigationLabel: toSlugLabel(path),
      pageTitle: toSlugLabel(path),
      shortDescription: "Country consultation listing page.",
    }, { countryCode: path.endsWith("-pt") ? "pt" : path.endsWith("-sp") ? "sp" : path.endsWith("-cz") ? "cz" : path.endsWith("-rm") ? "rm" : "ie" }),
  ),
  baseEntry("/blog", "BlogIndexTemplate", {
    pageLabel: "Blog",
    navigationLabel: "Blog",
    pageTitle: "Health Blog",
    shortDescription: "Blog listing page.",
  }, { showInNavigation: true }),
  ...routeInventory.blogPosts.map((path) =>
    baseEntry(path, "BlogArticleTemplate", {
      pageLabel: toSlugLabel(path),
      navigationLabel: "Blog",
      pageTitle: toSlugLabel(path),
      shortDescription: "Blog article page.",
    }, { showInNavigation: false }),
  ),
  ...[
    "/legal-notices",
    "/term-and-conditions",
    "/privacy",
    "/return-and-refund-policy",
    "/cookies-policy",
  ].map((path) =>
    baseEntry(path, "LegalPageTemplate", {
      pageLabel: toSlugLabel(path),
      navigationLabel: toSlugLabel(path),
      pageTitle: toSlugLabel(path),
      shortDescription: "Legal policy page.",
    }, { showInNavigation: false }),
  ),
  ...[
    ["/terms-and-conditions", "/term-and-conditions"],
    ["/privacy-policy", "/privacy"],
    ["/copy-of-privacy-policy", "/privacy"],
    ["/refund-policy", "/return-and-refund-policy"],
    ["/gdpr-compliance", "/privacy"],
  ].map(([path, canonicalPath]) =>
    baseEntry(path, "StaticMarketingTemplate", {
      pageLabel: toSlugLabel(path),
      navigationLabel: toSlugLabel(canonicalPath),
      pageTitle: toSlugLabel(path),
      shortDescription: "Legacy alias route preserved for compatibility.",
    }, { showInNavigation: false, legacy: true, canonicalPath }),
  ),
  ...routeInventory.categories.map((path) =>
    baseEntry(path, "StaticMarketingTemplate", {
      pageLabel: toSlugLabel(path),
      navigationLabel: "Categories",
      pageTitle: toSlugLabel(path),
      shortDescription: "Category page placeholder mapped to shared template.",
    }),
  ),
  ...routeInventory.irelandGeneralConsultation.map((path) =>
    baseEntry(path, "ServiceDetailTemplate", {
      pageLabel: toSlugLabel(path),
      navigationLabel: "General consultation",
      pageTitle: toSlugLabel(path),
      shortDescription: "Ireland general consultation service detail.",
    }, { countryCode: "ie" }),
  ),
  ...routeInventory.irelandSpecialistConsultation.map((path) =>
    baseEntry(path, "ServiceDetailTemplate", {
      pageLabel: toSlugLabel(path),
      navigationLabel: "Specialist consultation",
      pageTitle: toSlugLabel(path),
      shortDescription: "Ireland specialist consultation service detail.",
    }, { countryCode: "ie" }),
  ),
  ...[
    "/service-page/[serviceSlug]",
    "/services/[serviceSlug]",
    "/home-health-tests/[testSlug]",
    "/ireland-doctors/[doctorSlug]",
    "/post/[slug]",
    "/category/[slug]",
    "/ireland/[serviceSlug]",
    "/ireland-specialist-consultations/[serviceSlug]",
  ].map((path) =>
    baseEntry(path, path.includes("doctor") ? "DoctorProfileTemplate" : path.includes("post") ? "BlogArticleTemplate" : path.includes("category") ? "StaticMarketingTemplate" : "ServiceDetailTemplate", {
      pageLabel: toSlugLabel(path),
      navigationLabel: toSlugLabel(path),
      pageTitle: toSlugLabel(path),
      shortDescription: "Dynamic route family definition.",
    }, { showInNavigation: false, countryCode: path.includes("/ireland") || path.includes("doctor") ? "ie" : undefined }),
  ),
];

export function getPublicRouteByPath(path: string) {
  return publicRouteRegistry.find((route) => route.path === path);
}
