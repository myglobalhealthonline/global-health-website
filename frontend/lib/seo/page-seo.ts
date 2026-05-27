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
import { getSiteUrl } from "@/lib/seo/site-url";

export type RouteSeo = {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  noindex?: boolean;
};

const DEFAULT_OG_IMAGE = "/images/og-default.jpg";

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
    title: "Global Health · Licensed clinicians across Europe",
    description:
      "Meet licensed doctors and specialists practising in Ireland, Portugal, Spain, Czechia and Romania. Multilingual care, in-country registration, transparent profiles.",
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
    title: "About Global Health · Medicine anytime anywhere",
    description:
      "A network of licensed clinicians practising across Ireland, Portugal, Spain, Czechia and Romania. Verified credentials, multilingual care, in-country registration.",
    keywords: ["about Global Health", "European clinician network", "registered doctors"],
  },
  "/careers": {
    title: "Careers at Global Health",
    description:
      "Open clinician, engineering and operations roles supporting our network of licensed doctors across Europe. Remote and on-site teams.",
    keywords: ["healthcare careers", "clinician jobs", "remote medical jobs"],
  },
  "/book-online": {
    title: "Meet our clinicians · Global Health",
    description:
      "Browse licensed doctors and specialists by country, specialty and language. Profiles list credentials, registration councils and patient languages.",
    keywords: ["meet doctors", "clinician profiles", "specialist directory Europe"],
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

  // ── Consultation listings ─────────────────────────────────────────────────
  "/general-consultation-ie": {
    title: "GP consultation · Ireland",
    description: "GP video consultations with Irish-registered clinicians — same-day slots, prescriptions and sick notes.",
  },
  "/general-consultation-pt": {
    title: "Consulta médica geral · Portugal",
    description: "Consultas com clínicos gerais portugueses por videochamada — receitas, atestados e encaminhamentos.",
  },
  "/general-consultation-sp": {
    title: "Consulta médica general · España",
    description: "Consultas con médicos de cabecera colegiados en España — recetas, bajas y derivaciones.",
  },
  "/general-consultation-cz": {
    title: "Praktická konzultace · Česko",
    description: "Online konzultace s praktickými lékaři v Česku — recepty, neschopenky a doporučení.",
  },
  "/general-consultation-rm": {
    title: "Consultație generală · România",
    description: "Consultații cu medici de familie autorizați în România — rețete, concedii și trimiteri.",
  },
  "/specialty-ie": {
    title: "Specialist consultations · Ireland",
    description: "Cardiology, dermatology, mental health and more — Irish-registered consultants on video.",
  },
  "/specialty-pt": {
    title: "Consultas de especialidade · Portugal",
    description: "Cardiologia, dermatologia, saúde mental — especialistas portugueses por videoconsulta.",
  },
  "/specialty-sp": {
    title: "Consultas de especialista · España",
    description: "Cardiología, dermatología, salud mental — especialistas españoles por videollamada.",
  },
  "/specialty-cz": {
    title: "Specialistické konzultace · Česko",
    description: "Kardiologie, dermatologie, duševní zdraví — čeští specialisté online.",
  },
  "/specialty-rm": {
    title: "Consultații de specialitate · România",
    description: "Cardiologie, dermatologie, sănătate mintală — specialiști români prin video.",
  },
};

/** Resolve SEO row by exact pathname, returning sane fallbacks if absent. */
export function getRouteSeo(pathname: string): RouteSeo {
  return (
    ROUTE_SEO[pathname] ?? {
      title: "Global Health",
      description:
        "Online consultations with licensed clinicians across Ireland, Portugal, Spain, Czechia and Romania.",
    }
  );
}

/** Build a Next.js `Metadata` object for a known pathname. */
export function pageMetadata(pathname: string, overrides?: Partial<Metadata>): Metadata {
  const seo = getRouteSeo(pathname);
  const url = `${getSiteUrl()}${pathname === "/" ? "" : pathname}`;
  const image = seo.ogImage ?? DEFAULT_OG_IMAGE;

  const base: Metadata = {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: seo.title,
      description: seo.description,
      url,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [image],
    },
    robots: seo.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    ...overrides,
  };

  return base;
}
