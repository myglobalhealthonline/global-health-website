import type { CountryCode, CountryConfig } from "@/data/countries";
import { getPublicServicesForCountry } from "@/lib/content/get-public-services";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import type { BmiBandKey } from "@/lib/tools/calc";

/**
 * Which of our consultations to put in front of someone reading a BMI result.
 *
 * Resolved from the LIVE per-country service list rather than a hardcoded map,
 * because every market names the same service differently — Ireland sells
 * `weight-management-consultation`, Portugal `perda-de-peso`, Spain
 * `control-peso-online`, Brazil `controle-peso-online`, and Czechia and
 * Romania have no weight service at all today. A static table would be wrong
 * the first time an admin adds or renames one.
 *
 * Kinds are restricted to GENERAL and SPECIALIST: PRESCRIPTION and
 * HOME_DELIVERY are deliberately hidden from the public site for Ads
 * compliance, and a BMI page must not become the back door to them.
 */

export type SuggestionSlot = "weight" | "nutrition" | "gp";

export type ServiceSuggestion = {
  slot: SuggestionSlot;
  title: string;
  summary?: string;
  href: string;
  /** Service hero image, resolved to a servable URL. Absent for the GP hub. */
  imageSrc?: string | null;
};

/** Substrings, matched case-insensitively against slug + name, per language. */
const WEIGHT_TERMS = [
  "weight",
  "peso",
  "obes",
  "vaha",
  "váha",
  "hmotnost",
  "greutate",
  "slabire",
  "slăbire",
  "gewicht",
  "abnehm",
];

const NUTRITION_TERMS = [
  "nutri",
  "diet",
  "dietet",
  "vyziva",
  "výživa",
  "ernahrung",
  "ernährung",
  "alimenta",
];

const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const matches = (haystack: string, terms: string[]) => {
  const flat = norm(haystack);
  return terms.some((term) => flat.includes(norm(term)));
};

/**
 * Look up this market's weight / nutrition consultations plus its GP entry
 * point. Never throws: a backend hiccup degrades to the GP link, which is a
 * static route.
 */
export async function getBmiServiceSuggestions(input: {
  code: CountryCode;
  config: CountryConfig;
  country: string;
  lang: string;
  locale: string;
}): Promise<ServiceSuggestion[]> {
  const { code, config, country, lang, locale } = input;
  const base = `/${country}/${lang}`;
  const out: ServiceSuggestion[] = [];

  try {
    const services = (await getPublicServicesForCountry(code, locale)).filter(
      (service) => service.kind === "GENERAL" || service.kind === "SPECIALIST",
    );

    const pick = (terms: string[], exclude: string[] = []) =>
      services.find((service) => {
        const haystack = `${service.slug} ${service.name}`;
        return matches(haystack, terms) && !matches(haystack, exclude);
      });

    // Nutrition first, so a service named "Nutrition & Weight" is not claimed
    // by the weight slot and then missing from the nutrition one.
    const nutrition = pick(NUTRITION_TERMS);
    const weight = pick(WEIGHT_TERMS, nutrition ? [nutrition.slug] : []);

    const toSuggestion = (
      service: (typeof services)[number],
      slot: SuggestionSlot,
    ): ServiceSuggestion => ({
      slot,
      title: service.name,
      summary: service.summary ?? undefined,
      href: `${base}/services/${service.slug}`,
      imageSrc: service.imagePath ? (resolveTrustedAssetUrl(service.imagePath) ?? null) : null,
    });

    if (weight) out.push(toSuggestion(weight, "weight"));
    if (nutrition) out.push(toSuggestion(nutrition, "nutrition"));
  } catch {
    // Service list unavailable — the GP entry below still renders.
  }

  // GP consultation hub. Gated by the same per-country feature flag the header
  // and footer use, so a market with GP consultations switched off does not get
  // a link to a 404.
  if (isCountryFeatureEnabled(config, "general-consultations")) {
    out.push({
      slot: "gp",
      title: "",
      href: `${base}/gp-consultation-online`,
      // The GP entry is a hub route, not a Service row, so it has no CMS image.
      // Without one `ServiceCard` renders its no-image layout and the card
      // would sit shorter than the two beside it — the shared stock GP photo
      // keeps the row consistent.
      imageSrc: "/images/stock/gp.jpg",
    });
  }

  return out;
}

/**
 * Which slot to nudge for a given BMI band, best first.
 *
 * "healthy" deliberately routes to nutrition rather than weight management —
 * pitching weight loss at someone whose result just said healthy is both bad
 * advice and bad conversion. "underweight" routes to a doctor, never to a
 * weight or nutrition upsell.
 */
const BAND_PREFERENCE: Record<BmiBandKey, SuggestionSlot[]> = {
  underweight: ["gp"],
  healthy: ["nutrition", "gp"],
  overweight: ["weight", "nutrition", "gp"],
  "obese-1": ["weight", "gp"],
  "obese-2": ["weight", "gp"],
  "obese-3": ["weight", "gp"],
};

/**
 * The single suggestion to surface inline beside a result, or null.
 *
 * Defensive on both arguments: this runs inside the page render, so an
 * unexpected band key or a missing list would otherwise 500 the whole
 * calculator rather than just drop the upsell.
 */
export function suggestionForBand(
  band: BmiBandKey,
  suggestions: ServiceSuggestion[] | undefined,
): ServiceSuggestion | null {
  const preference = BAND_PREFERENCE[band];
  if (!preference || !suggestions) return null;
  for (const slot of preference) {
    const found = suggestions.find((suggestion) => suggestion.slot === slot);
    if (found) return found;
  }
  return null;
}
