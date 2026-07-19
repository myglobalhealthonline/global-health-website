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
};

const DOCUMENT_TITLE_LIMIT = 60;
const SEARCH_DESCRIPTION_LIMIT = 155;
const SOCIAL_DESCRIPTION_LIMIT = 125;
const BRAND_SEPARATOR = " | ";

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

function compactTitle(value: string): string {
  const normalized = normalizeCopy(value);
  if (Array.from(normalized).length <= DOCUMENT_TITLE_LIMIT) return normalized;

  const brandPattern = /\s*(?:[|·—-]\s*)?global health\s*$/iu;
  if (!brandPattern.test(normalized)) return wordSafeLimit(normalized, DOCUMENT_TITLE_LIMIT);

  const unbranded = normalized.replace(brandPattern, "").trim();
  const suffix = `${BRAND_SEPARATOR}${SITE_NAME}`;
  const body = wordSafeLimit(unbranded, DOCUMENT_TITLE_LIMIT - suffix.length);
  return `${body}${suffix}`;
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
  const title = compactTitle(input.title);
  const socialTitle = compactTitle(input.socialTitle ?? input.title);
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
      title: compactTitle(input.imageTitle ?? socialTitle),
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
    title: resolveBrandTitle(title),
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
  if (normalized.toLowerCase().includes(SITE_NAME.toLowerCase())) {
    return { absolute: compactTitle(normalized) };
  }

  const suffix = ` · ${SITE_NAME}`;
  if (Array.from(normalized + suffix).length > DOCUMENT_TITLE_LIMIT) {
    return {
      absolute: `${wordSafeLimit(normalized, DOCUMENT_TITLE_LIMIT - suffix.length)}${suffix}`,
    };
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
