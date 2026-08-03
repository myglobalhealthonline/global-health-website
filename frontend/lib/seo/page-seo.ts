/**
 * Per-route SEO catalogue.
 *
 * Acts as the project's "SEO plugin" — every public page pulls its metadata
 * (title, description, OG, canonical, keywords) from this single source so we
 * stay consistent across the site and avoid drift between the page content
 * and what crawlers see.
 *
 * Pattern: import `pageMetadata("/about")` in any `page.tsx` and assign the
 * result to `export const metadata`.
 */
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { buildOgImageUrl, type OgImageKind, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "@/lib/seo/og-image";
import { getPublicUrl } from "@/lib/seo/site-url";

export type PublicMetadataInput = {
  path: string;
  title: string;
  description: string;
  socialTitle?: string;
  socialDescription?: string;
  imageTitle?: string;
  locale?: string;
  type?: "website" | "article" | "profile";
  kind?: OgImageKind | string;
  subtitle?: string;
  sourceImage?: string;
  imageAlt?: string;
  image?: { url: string; alt?: string };
  languages?: Record<string, string | URL>;
  keywords?: string[];
  noindex?: boolean;
  /**
   * Set false on routes whose CMS titles already carry the service AND country
   * keywords and run long in the translated locales — the root layout's
   * ` · Global Health` suffix then only pushes them further past Google's
   * ~60-char display budget, and the brand is the one part Google rewrites or
   * re-appends itself. Defaults to true (append the brand once).
   */
  brandSuffix?: boolean;
};

// Social cards clip hard at render time and never rank, so an OG/Twitter title
// is worth shortening ourselves — a card is better ending on a whole word than
// mid-syllable.
//
// UPDATE (2026-08-03 SEO audit, 2.1): the DOCUMENT title used to pass through
// untouched on the theory that Google indexes the whole string regardless of
// display truncation. That held titles that carried ONLY a brand suffix, but
// most titles here carry a trust-signal qualifier ("IMC-Registered",
// "Colegiados", "ČLK Registered") AFTER the brand suffix — 232/500 crawled
// titles ran past 60 chars and the qualifier, not the brand, was what SERP
// truncation ate. The brand itself is redundant in the raw title anyway:
// Google appends the site name from `WebSite` schema (present on all 500
// pages), so dropping our own trailing brand before truncating is free —
// compactSearchTitle below does that, then only word-safe-truncates if the
// title is still over budget without it.
const SOCIAL_TITLE_LIMIT = 74;
const SEARCH_TITLE_LIMIT = 60;
const SEARCH_DESCRIPTION_LIMIT = 155;
const SOCIAL_DESCRIPTION_LIMIT = 125;
const BRAND_SEPARATOR = " | ";

// Shared by compactSocialTitle and compactSearchTitle — matches a trailing
// " | Global Health", " · Global Health", " — Global Health" (and locale
// suffixes like "Global Health España") so it can be dropped before the
// title is truncated.
const BRAND_PATTERN = /\s*(?:[|·—-]\s*)?global health\s*[\p{L}]*\s*$/iu;

function normalizeCopy(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function wordSafeLimit(value: string, maximum: number): string {
  const normalized = normalizeCopy(value);
  if (Array.from(normalized).length <= maximum) return normalized;

  const available = Math.max(1, maximum - 1);
  const prefix = Array.from(normalized).slice(0, available).join("");
  const boundary = prefix.lastIndexOf(" ");
  const safePrefix = boundary >= Math.floor(available * 0.6) ? prefix.slice(0, boundary) : prefix;
  return `${safePrefix.replace(/[\s,;:|·—-]+$/u, "")}…`;
}

/** Shorten a SOCIAL card title, keeping any trailing brand intact. */
function compactSocialTitle(value: string): string {
  const normalized = normalizeCopy(value);
  if (Array.from(normalized).length <= SOCIAL_TITLE_LIMIT) return normalized;

  if (!BRAND_PATTERN.test(normalized)) return wordSafeLimit(normalized, SOCIAL_TITLE_LIMIT);

  const unbranded = normalized.replace(BRAND_PATTERN, "").trim();
  const suffix = `${BRAND_SEPARATOR}${SITE_NAME}`;
  const body = wordSafeLimit(unbranded, SOCIAL_TITLE_LIMIT - suffix.length);
  return `${body}${suffix}`;
}

/** What the root layout's `title.template` appends (lib/seo/root-metadata.ts). */
const TITLE_TEMPLATE_SUFFIX = ` · ${SITE_NAME}`;

/**
 * Shorten a SEARCH (document <title>) title to Google's ~60-char display
 * budget, and return the EXACT string that should be emitted — brand included
 * or deliberately omitted.
 *
 * The caller must pass the result through as `{ absolute }`. That is
 * load-bearing, not stylistic: the root layout sets
 * `title.template = "%s · Global Health"`, so any non-absolute title gets 16
 * characters bolted on AFTER this function has finished budgeting. Before this
 * was accounted for, dropping the brand to save space accomplished nothing —
 * the template put it straight back and the title ended up longer than it
 * started, with an ellipsis stranded mid-string:
 *
 *   in   "Online Doctors Ireland | IMC-Registered GPs & Specialists · Global Health"  (72)
 *   out  "Online Doctors Ireland | IMC-Registered GPs & Specialists"                  (56)
 *   emitted, after the template re-appended the brand                                 (72)
 *
 * Order of preference:
 *   1. Fits as-is, brand already present  → emit unchanged.
 *   2. Fits once the brand suffix is added → add it, so short titles stay branded.
 *   3. Over budget → drop the trailing brand. Google appends the site name
 *      itself from `WebSite` schema, so that space is better spent on the
 *      trust-signal qualifier ("IMC-Registered", "Colegiados", …).
 *   4. Still over budget unbranded → word-safe truncate.
 */
function compactSearchTitle(value: string): string {
  const normalized = normalizeCopy(value);
  const len = (s: string) => Array.from(s).length;
  const hasBrand = BRAND_PATTERN.test(normalized);

  if (len(normalized) <= SEARCH_TITLE_LIMIT) {
    if (hasBrand) return normalized;
    const branded = `${normalized}${TITLE_TEMPLATE_SUFFIX}`;
    return len(branded) <= SEARCH_TITLE_LIMIT ? branded : normalized;
  }

  const unbranded = hasBrand ? normalized.replace(BRAND_PATTERN, "").trim() : normalized;
  if (len(unbranded) <= SEARCH_TITLE_LIMIT) return unbranded;

  return wordSafeLimit(unbranded, SEARCH_TITLE_LIMIT);
}

function normalizeCustomImage(url: string): string | undefined {
  const value = url.trim();
  if (value.startsWith("/") && !value.startsWith("//")) return getPublicUrl(value);
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password
      ? parsed.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/** Build one complete, conflict-free metadata object for any public route. */
export function buildPublicMetadata(input: PublicMetadataInput): Metadata {
  const canonical = getPublicUrl(input.path);
  const title = compactSearchTitle(input.title);
  const socialTitle = compactSocialTitle(input.socialTitle ?? input.title);
  const description = wordSafeLimit(input.description, SEARCH_DESCRIPTION_LIMIT);
  const socialDescription = wordSafeLimit(
    input.socialDescription ?? input.description,
    SOCIAL_DESCRIPTION_LIMIT,
  );
  const customImage = input.image ? normalizeCustomImage(input.image.url) : undefined;
  const imageUrl =
    customImage ??
    buildOgImageUrl({
      kind:
        input.kind ??
        (input.type === "article" ? "article" : input.type === "profile" ? "doctor" : "page"),
      title: compactSocialTitle(input.imageTitle ?? socialTitle),
      subtitle: input.subtitle,
      locale: input.locale,
      image: input.sourceImage,
    });
  const imageAlt = input.image?.alt?.trim() || input.imageAlt?.trim() || socialTitle;
  const image = {
    url: imageUrl,
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: imageAlt,
  };

  return {
    // Always absolute: `compactSearchTitle` has already decided whether the
    // brand belongs in this title and budgeted the 60-char limit around that
    // decision. Letting the root layout's `%s · Global Health` template append
    // afterwards would blow the budget it just enforced — see the comment on
    // compactSearchTitle.
    title: { absolute: title },
    description,
    keywords: input.keywords,
    alternates: {
      canonical,
      ...(input.languages ? { languages: input.languages } : {}),
    },
    openGraph: {
      type: input.type ?? "website",
      siteName: SITE_NAME,
      title: socialTitle,
      description: socialDescription,
      url: canonical,
      ...(input.locale ? { locale: input.locale } : {}),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: socialDescription,
      images: [imageUrl],
    },
    robots: input.noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
          },
        },
  };
}

export type RouteSeo = {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  noindex?: boolean;
};


/**
 * SEO copy for every static + dynamic route family. Written tight,
 * keyword-aware, and patient-first. Descriptions cap at ~155 chars.
 */
export const ROUTE_SEO: Record<string, RouteSeo> = {
  // NOTE — copy here surfaces in Google Search snippets AND Google Ads
  // preview cards. Per Google Ads "restricted services" guidance, we
  // intentionally anchor on the PROVIDERS (licensed clinicians, names,
  // registration councils, locations, languages) rather than the
  // CONSULTATION PROCESS (video call, prescription, telemedicine).
  // Keep that bias when editing.
  "/": {
    title: "Global Health · Licensed physicians in your country",
    description:
      "Meet licensed doctors and specialists online, in your country. Same-day appointments, multilingual care, transparent registration profiles. GDPR compliant.",
    keywords: [
      "licensed doctors Europe",
      "medical specialists",
      "healthcare providers Ireland",
      "registered clinicians",
    ],
  },

  // ── Country homes ─────────────────────────────────────────────────────────
  "/ireland": {
    title: "Ireland — IMC-registered doctors and specialists",
    description:
      "Meet doctors and specialists registered with the Irish Medical Council. Profiles list credentials, specialties, languages and clinic affiliations.",
    keywords: ["Irish Medical Council doctors", "GPs Ireland", "specialists Ireland"],
  },
  "/portugal": {
    title: "Portugal — médicos registados na Ordem dos Médicos",
    description:
      "Conheça médicos e especialistas inscritos na Ordem dos Médicos em Portugal. Perfis com credenciais, especialidades, idiomas e clínicas associadas.",
    keywords: ["médicos Ordem dos Médicos", "médicos Portugal", "especialistas Portugal"],
  },
  "/spain": {
    title: "Spain — médicos colegiados y especialistas",
    description:
      "Conoce a médicos y especialistas colegiados en España. Perfiles con credenciales, especialidades, idiomas y clínicas asociadas.",
    keywords: ["médicos colegiados España", "especialistas España", "médicos España"],
  },
  "/czechia": {
    title: "Czechia — lékaři registrovaní u ČLK",
    description:
      "Seznamte se s lékaři a specialisty registrovanými u České lékařské komory. Profily uvádějí kvalifikaci, specializace, jazyky a kliniky.",
    keywords: ["ČLK lékaři", "specialisté Česko", "lékaři Praha"],
  },
  "/romania": {
    title: "Romania — medici autorizați și specialiști",
    description:
      "Cunoaște medici și specialiști autorizați în România. Profilurile prezintă acreditările, specializările, limbile vorbite și clinicile asociate.",
    keywords: ["medici autorizați România", "specialiști România", "medici București"],
  },

  // ── Service-family static pages ───────────────────────────────────────────
  "/about": {
    title: "About Global Health — Online Doctor Platform | 6 Markets | Medicine Anytime Anywhere",
    description:
      "Global Health connects patients with locally-licensed doctors in the markets where we operate. No waiting rooms, no call centres, no surprise fees. Founded 2023. GDPR compliant.",
    keywords: ["about Global Health", "online doctor platform", "telemedicine 6 markets", "registered doctors"],
  },
  "/careers": {
    title: "Careers at Global Health",
    description:
      "Open clinician, engineering and operations roles supporting our network of licensed doctors across Europe. Remote and on-site teams.",
    keywords: ["healthcare careers", "clinician jobs", "remote medical jobs"],
  },
  "/book": {
    title: "Book an online consultation · Global Health",
    description:
      "Medicine Anytime Anywhere. Choose a service, clinician, and open appointment time through Global Health's guided booking flow.",
    keywords: ["book online consultation", "licensed doctor booking", "telemedicine appointment Europe"],
  },
  "/plans-pricing": {
    title: "Plans & pricing · Global Health",
    description:
      "Transparent, all-inclusive pricing across our network of licensed doctors. Pay-as-you-go from €35 or a monthly plan. No hidden fees.",
    keywords: ["healthcare pricing", "doctor plan", "transparent pricing"],
  },
  "/pricing-plans/list": {
    title: "Price list · Global Health",
    description:
      "Side-by-side pricing across Ireland, Portugal, Spain, Czechia and Romania. Insurance-ready receipts.",
    keywords: ["healthcare price list", "doctor pricing", "clinician fees"],
  },
  "/online-prescription": {
    title: "Repeat prescription requests · Licensed doctors",
    description:
      "Submit a repeat prescription request to a doctor licensed in your country. Reviewed and routed to your registered pharmacy.",
    keywords: ["repeat prescription", "licensed doctor prescription", "pharmacy routing"],
  },
  "/home-delivery": {
    title: "Pharmacy home delivery · Global Health",
    description:
      "Prescribed medication delivered to your door in 24–48 hours via partner pharmacies. Cold-chain packaging, tracked dispatch, discreet labels.",
    keywords: ["pharmacy home delivery", "medication delivery Europe", "partner pharmacy"],
  },
  "/home-health-test": {
    title: "Lab test bookings · Global Health",
    description:
      "Lab-quality testing kits routed to your home and reviewed by a licensed doctor. Blood panels, hormones, vitamins, STI and rapid kits.",
    keywords: ["lab test booking", "home test kit", "doctor-reviewed labs"],
  },
  "/partner-clinics": {
    title: "Partner clinics · Global Health",
    description:
      "Vetted local clinics across Europe partnered with our network of doctors. Shared notes and direct billing where available.",
    keywords: ["partner clinics Europe", "clinic network", "in-person care"],
  },
  "/corporate-plans": {
    title: "Corporate plans · Employee healthcare",
    description:
      "Give your team access to our network of multilingual licensed doctors across five countries. Per-seat pricing, full reporting, no minimum size.",
    keywords: ["corporate health plan", "employee healthcare", "company benefit"],
  },
  "/gift-card": {
    title: "Gift card · Global Health",
    description:
      "Digital gift cards from €50, redeemable across our network of licensed doctors and specialists in five countries.",
    keywords: ["healthcare gift card", "doctor gift card", "wellness gift Europe"],
  },

  // ── Team listing pages ────────────────────────────────────────────────────
  "/ireland-team": {
    title: "Meet our Ireland clinicians",
    description: "Irish Medical Council-registered GPs and specialists available for online consultations.",
    keywords: ["Ireland doctors", "Irish GP online", "IMC registered"],
  },
  "/portugal-team": {
    title: "Conheça os médicos em Portugal",
    description: "Médicos inscritos na Ordem dos Médicos disponíveis para consultas online em Portugal.",
  },
  "/spain-team": {
    title: "Conoce a los médicos en España",
    description: "Médicos colegiados en España disponibles para consultas online en tu idioma.",
  },
  "/czechia-team": {
    title: "Naši lékaři v Česku",
    description: "Licencovaní lékaři v České republice dostupní pro online konzultace.",
  },
  "/romania-team": {
    title: "Echipa noastră medicală din România",
    description: "Medici autorizați în România disponibili pentru consultații online.",
  },

  // ── Service listings ──────────────────────────────────────────────────────
  // Provider-first labels per Google Ads "restricted services" guidance.
  "/general-consultation-ie": {
    title: "Book a GP Appointment · Ireland",
    description: "Irish Medical Council-registered general practitioners available for patient appointments.",
  },
  "/general-consultation-pt": {
    title: "Marcar consulta com clínico geral · Portugal",
    description: "Médicos de clínica geral inscritos na Ordem dos Médicos em Portugal.",
  },
  "/general-consultation-sp": {
    title: "Reservar cita con médico de cabecera · España",
    description: "Médicos de cabecera colegiados en España.",
  },
  "/general-consultation-cz": {
    title: "Objednat se k praktickému lékaři · Česko",
    description: "Praktičtí lékaři registrovaní u České lékařské komory.",
  },
  "/general-consultation-rm": {
    title: "Programare la medicul de familie · România",
    description: "Medici de familie autorizați în România.",
  },
  "/specialty-ie": {
    title: "See a Specialist · Ireland",
    description: "Cardiology, dermatology, mental health and more — Irish Medical Council-registered specialists.",
  },
  "/specialty-pt": {
    title: "Marcar consulta de especialidade · Portugal",
    description: "Cardiologia, dermatologia, saúde mental — especialistas inscritos na Ordem dos Médicos em Portugal.",
  },
  "/specialty-sp": {
    title: "Ver a un especialista · España",
    description: "Cardiología, dermatología, salud mental — especialistas colegiados en España.",
  },
  "/specialty-cz": {
    title: "Objednat se ke specialistovi · Česko",
    description: "Kardiologie, dermatologie, duševní zdraví — specialisté registrovaní u ČLK.",
  },
  "/specialty-rm": {
    title: "Vezi un specialist · România",
    description: "Cardiologie, dermatologie, sănătate mintală — specialiști autorizați în România.",
  },
};

/**
 * Avoid doubling the brand in the document title. The root layout applies a
 * `%s · Global Health` title template, so a CMS-authored title that ALREADY
 * contains the site name (e.g. "Ireland Online Clinic | Global Health") would
 * render as "Ireland Online Clinic | Global Health · Global Health". When the
 * brand is already present we return an absolute title to bypass the template;
 * otherwise we pass the string through so the template appends the brand once.
 */
export function resolveBrandTitle(raw: string): string | { absolute: string } {
  const normalized = normalizeCopy(raw);
  // Brand already present → bypass the layout template so it appears once.
  // Length is deliberately not capped here; see SOCIAL_TITLE_LIMIT.
  if (normalized.toLowerCase().includes(SITE_NAME.toLowerCase())) {
    return { absolute: normalized };
  }
  return normalized;
}

/** Resolve SEO row by exact pathname, returning sane fallbacks if absent. */
export function getRouteSeo(pathname: string): RouteSeo {
  return (
    ROUTE_SEO[pathname] ?? {
      title: "Global Health",
      description:
        "Licensed clinicians registered with national medical councils across Ireland, Portugal, Spain, Czechia and Romania.",
    }
  );
}

/** Build a Next.js `Metadata` object for a known pathname. */
export function pageMetadata(pathname: string, overrides?: Partial<Metadata>): Metadata {
  const seo = getRouteSeo(pathname);
  const base = buildPublicMetadata({
    path: pathname,
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    noindex: seo.noindex,
    ...(seo.ogImage ? { image: { url: seo.ogImage, alt: seo.title } } : {}),
  });

  return { ...base, ...overrides };
}
