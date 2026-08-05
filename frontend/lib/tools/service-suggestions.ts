import type { CountryCode, CountryConfig } from "@/data/countries";
import { getPublicServicesForCountry } from "@/lib/content/get-public-services";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import { formatPriceRounded } from "@/lib/format-currency";
import { buildBookHref } from "@/lib/routing/book-href";
import type { BmiBandKey } from "@/lib/tools/calc";

/**
 * Which of our consultations to put in front of someone reading a BMI result.
 *
 * Resolved from the LIVE per-country service list rather than a hardcoded map,
 * because every market names the same service differently — Ireland sells
 * `weight-management-consultation`, Portugal `perda-de-peso`, Spain
 * `control-peso-online`, Brazil `controle-peso-online`, Czechia
 * `kontrola-vahy-online` and Romania `controlul-greutatii`. A static table
 * would be wrong the first time an admin adds or renames one.
 *
 * (This comment used to say Czechia and Romania had no weight service. They
 * do — the term list carried dictionary forms, not stems, so neither slug
 * matched and both markets' BMI pages fell through to the GP link. Fixed
 * 2026-08-06; `service-suggestions.test.ts` pins the inflected forms.)
 *
 * Kinds are restricted to GENERAL and SPECIALIST: PRESCRIPTION and
 * HOME_DELIVERY are deliberately hidden from the public site for Ads
 * compliance, and a BMI page must not become the back door to them.
 */

export type SuggestionSlot =
  | "weight"
  | "nutrition"
  | "chronic"
  | "cardio"
  | "mental"
  | "women"
  | "gp";

/**
 * Shaped to match what the service pages feed `ServiceCard` — two CTAs plus
 * price and duration meta. A reduced single-CTA card here would have been the
 * same component wearing a different face to the one people see on
 * /services and /gp-consultation-online.
 */
export type ServiceSuggestion = {
  slot: SuggestionSlot;
  title: string;
  summary?: string;
  /** "Learn more" target — the read-only service detail page. */
  detailHref: string;
  /** "Book" target — the cart-first booking flow, pre-selecting this service. */
  bookHref: string;
  /** Service hero image, resolved to a servable URL. */
  imageSrc?: string | null;
  /** e.g. "20 min". Absent when the service has no duration set. */
  duration?: string;
  /** e.g. "From EUR 45". Absent when the service has no price set. */
  startingPrice?: string;
};

/** Substrings, matched case-insensitively against slug + name, per language. */
const WEIGHT_TERMS = [
  "weight",
  "peso",
  "obes",
  // Stems, not dictionary forms. The live Czech service is
  // `kontrola-vahy-online` / "Hubnutí s lékařem online" and the Romanian one is
  // `controlul-greutatii` / "Managementul greutății" — full forms ("vaha",
  // "greutate") matched neither, which is why both markets appeared to have no
  // weight service and their BMI pages fell through to the GP link.
  "vah",
  "hubnut",
  "hmotnost",
  "greut",
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

const CARDIO_TERMS = ["cardio", "coraz", "coraç", "inima", "inimă", "srdc", "herz"];

/**
 * Long-term condition management, which is where a raised blood-pressure
 * reading actually goes. Ireland's `chronic-disease-consultation` was losing
 * to `cardiology-specialist-consultation` on the blood-pressure page: sending
 * everyone with a high reading to a cardiologist is both the wrong first step
 * clinically and the wrong price point. Cardiology stays as the fallback for
 * markets with no chronic-care service.
 */
const CHRONIC_TERMS = ["chronic", "cronic", "chronisch", "dlouhodob", "long-term"];

// ORDER IS PREFERENCE — `pick` walks these in sequence and takes the first
// term that matches anything, so the most specific spelling goes first.
// Ireland sells `mental-health-consultation`, `psychiatry-specialist-` and
// `psychology-specialist-`; the ADHD screener says in its own copy that only a
// psychiatrist or clinical psychologist can diagnose, so it must not land on
// the general mental-health consultation just because the catalogue lists it
// first.
const MENTAL_TERMS = [
  "psychiatr",
  "psiquiatr",
  "psihiatr",
  "psycholog",
  "psicolog",
  "psiholog",
  "duševn",
  "mental",
  // Romanian writes it "mintal" (`sanatate-mintala-online`), and the Iberian
  // psychology services are `psicologo-online` / `consulta-de-psicologia` —
  // "psych" is the English/Czech spelling and matched none of them.
  "mintal",
  "psic",
  "psih",
  "psych",
];

const WOMEN_TERMS = [
  "women",
  "gyn",
  "mulher",
  "mujer",
  "femei",
  "žen",
  "frauen",
  "obstet",
  "pregnan",
  "gravid",
  "fertil",
];

/**
 * Which service categories each tool should point at, best first.
 *
 * Every calculator used to fall through to the same weight/nutrition/GP set,
 * which was right for BMI and wrong for everything else — an ovulation result
 * suggesting weight management, a blood-pressure reading suggesting a
 * dietitian. Markets that do not sell the ideal category fall down the list
 * and land on GP, which every market has.
 */
const TOOL_SLOTS: Record<string, SuggestionSlot[]> = {
  "bmi-calculator": ["weight", "nutrition", "gp"],
  "calorie-calculator": ["nutrition", "weight", "gp"],
  // Chronic care before cardiology: hypertension is managed in long-term
  // condition care, and only referred onwards from there.
  "blood-pressure-chart": ["chronic", "cardio", "gp"],
  "due-date-calculator": ["women", "gp"],
  "ovulation-calculator": ["women", "gp"],
  "adhd-test": ["mental", "gp"],
};

const TERMS_FOR_SLOT: Record<Exclude<SuggestionSlot, "gp">, string[]> = {
  weight: WEIGHT_TERMS,
  nutrition: NUTRITION_TERMS,
  chronic: CHRONIC_TERMS,
  cardio: CARDIO_TERMS,
  mental: MENTAL_TERMS,
  women: WOMEN_TERMS,
};

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
 * The reverse of `TOOL_SLOTS`: which calculators belong on a given SERVICE
 * page. Same term matching as the forward direction and the same table, so a
 * tool's topic never has to be declared in two places — add a calculator to
 * `TOOL_SLOTS` and its service pages start linking it.
 *
 * Matches on ANY of a tool's non-GP slots, ranked by position so the tool whose
 * PRIMARY slot matches sorts above one that matched a fallback slot. It read
 * `slots[0]` only until 2026-08-06, which broke the moment a tool legitimately
 * had two hosts: `blood-pressure-chart` became `["chronic", "cardio", "gp"]`
 * and every cardiology page silently stopped linking it. A blood-pressure
 * chart belongs on both, and this direction has no reason to be pickier than
 * the forward one.
 *
 * Why this exists: the calculators were reachable only from the header
 * dropdown and the footer, which Google discounts as site-wide boilerplate. On
 * 2026-08-06 all 198 tool URLs sat at "Discovered - currently not indexed"
 * with the sitemap as their only referring URL. This is the same fix the 90
 * `/health/*` landing pages needed — see the `fetchLandingSlugs` comment on
 * the service page — a real in-content link from a page Google already crawls.
 *
 * Capped at two so a service page gains a related link, not a link dump.
 */
export function toolSlugsForService(input: { slug: string; name: string }): string[] {
  const haystack = `${input.slug} ${input.name}`;
  const ranked: Array<{ tool: string; rank: number }> = [];
  for (const [tool, slots] of Object.entries(TOOL_SLOTS)) {
    const rank = slots.findIndex(
      (slot) => slot !== "gp" && matches(haystack, TERMS_FOR_SLOT[slot]),
    );
    if (rank !== -1) ranked.push({ tool, rank });
  }
  return ranked
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 2)
    .map((entry) => entry.tool);
}

/**
 * Look up this market's weight / nutrition consultations plus its GP entry
 * point. Never throws: a backend hiccup degrades to the GP link, which is a
 * static route.
 */
export async function getToolServiceSuggestions(input: {
  /** Tool slug — decides which service categories are relevant. */
  slug: string;
  code: CountryCode;
  config: CountryConfig;
  country: string;
  lang: string;
  locale: string;
}): Promise<ServiceSuggestion[]> {
  const { slug, code, config, country, lang, locale } = input;
  const slots = TOOL_SLOTS[slug] ?? ["gp"];
  const base = `/${country}/${lang}`;
  const out: ServiceSuggestion[] = [];

  try {
    const services = (await getPublicServicesForCountry(code, locale)).filter(
      (service) => service.kind === "GENERAL" || service.kind === "SPECIALIST",
    );

    // Walk the TERMS in order and take the first that hits, rather than
    // walking the SERVICES and taking the first that matches any term. The
    // old shape let catalogue order decide: Ireland lists
    // `mental-health-consultation` before `psychiatry-specialist-consultation`,
    // so the ADHD screener pointed at the general mental-health consultation
    // however the term list was sorted. Now the term list is the preference.
    const pick = (terms: string[], exclude: string[] = []) => {
      for (const term of terms) {
        const hit = services.find((service) => {
          const haystack = `${service.slug} ${service.name}`;
          return matches(haystack, [term]) && !matches(haystack, exclude);
        });
        if (hit) return hit;
      }
      return undefined;
    };


    const toSuggestion = (
      service: (typeof services)[number],
      slot: SuggestionSlot,
    ): ServiceSuggestion => ({
      slot,
      title: service.name,
      summary: service.summary ?? undefined,
      detailHref: `${base}/services/${service.slug}`,
      bookHref: buildBookHref({ country, lang, service: service.slug }),
      imageSrc: service.imagePath ? (resolveTrustedAssetUrl(service.imagePath) ?? null) : null,
      duration: service.durationMinutes == null ? undefined : `${service.durationMinutes} min`,
      startingPrice:
        service.basePriceCents == null
          ? undefined
          : formatPriceRounded(service.basePriceCents, service.currencyCode),
    });

    // Claim in the tool's own preference order, and never let one service
    // fill two slots — a "Nutrition & Weight" listing belongs to whichever
    // slot this tool asked for first.
    const claimed: string[] = [];
    for (const slot of slots) {
      if (slot === "gp") continue;
      const match = pick(TERMS_FOR_SLOT[slot], claimed);
      if (!match) continue;
      claimed.push(match.slug);
      out.push(toSuggestion(match, slot));
    }
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
      detailHref: `${base}/gp-consultation-online`,
      bookHref: buildBookHref({ country, lang }),
      // The GP entry is a hub route, not a Service row, so it has no CMS image,
      // price or duration. Without an image `ServiceCard` falls to its no-image
      // layout and the card sits shorter than the two beside it — the shared
      // stock GP photo keeps the row consistent.
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
