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
  "/": {
    title: "Global Health · Online consultations across Europe",
    description:
      "Speak to a licensed clinician from Ireland, Portugal, Spain, Czechia or Romania — same-day video visits, prescriptions and home tests, in your language.",
    keywords: [
      "online doctor",
      "telemedicine Europe",
      "video GP consultation",
      "online prescription",
      "private GP Ireland",
      "telehealth Portugal",
    ],
  },

  // ── Country homes ─────────────────────────────────────────────────────────
  "/ireland": {
    title: "Ireland online clinic · See a GP today",
    description:
      "Book a same-day video consultation with an Irish-registered GP or specialist. Prescriptions, sick notes, referrals and lab orders delivered to your file.",
    keywords: ["online GP Ireland", "private GP Dublin", "telemedicine Ireland", "online prescription Ireland"],
  },
  "/portugal": {
    title: "Portugal online clinic · Consulta médica online",
    description:
      "Médicos licenciados em Portugal disponíveis por vídeo. Receitas eletrónicas, atestados e exames ao domicílio numa única plataforma segura.",
    keywords: ["consulta médica online", "médico online Portugal", "receita médica online"],
  },
  "/spain": {
    title: "Spain online clinic · Consulta médica online",
    description:
      "Habla con un médico colegiado en España por videollamada. Recetas, bajas médicas y análisis a domicilio en minutos, en tu idioma.",
    keywords: ["médico online España", "consulta online", "receta electrónica España"],
  },
  "/czechia": {
    title: "Czechia online clinic · Online lékař",
    description:
      "Konzultace s licencovaným lékařem v České republice. Recepty, neschopenky a domácí testy přes jednu zabezpečenou platformu.",
    keywords: ["online lékař", "telemedicína Česko", "elektronický recept"],
  },
  "/romania": {
    title: "Romania online clinic · Consultații medicale online",
    description:
      "Discută cu un medic autorizat în România prin video. Rețete electronice, concedii medicale și teste la domiciliu pe o singură platformă.",
    keywords: ["medic online România", "consultație online", "rețetă electronică"],
  },

  // ── Service-family static pages ───────────────────────────────────────────
  "/about": {
    title: "About Global Health · Medicine without borders",
    description:
      "Built to make European healthcare borderless: licensed clinicians, country-aware booking, and one secure patient file no matter where you are.",
    keywords: ["about Global Health", "European telemedicine", "borderless healthcare"],
  },
  "/careers": {
    title: "Careers at Global Health",
    description:
      "Help us bring premium online healthcare to five countries. Open clinician, engineering and operations roles across remote and on-site teams.",
    keywords: ["healthcare careers", "telemedicine jobs", "remote medical jobs"],
  },
  "/book-online": {
    title: "Book a consultation · Online doctor in minutes",
    description:
      "Pick a service, choose a clinician, confirm a time — most patients are seen on the same day. GP, specialist, prescription or home test.",
    keywords: ["book doctor online", "online consultation booking", "video GP appointment"],
  },
  "/plans-pricing": {
    title: "Plans & pricing · Transparent online care",
    description:
      "Pay-as-you-go consultations from €35 or unlock unlimited GP visits with a monthly plan. No hidden fees, no commitments, refundable if unused.",
    keywords: ["telemedicine pricing", "online GP cost", "private GP plan"],
  },
  "/pricing-plans/list": {
    title: "All consultation prices · Global Health",
    description:
      "Side-by-side pricing for every consultation type across Ireland, Portugal, Spain, Czechia and Romania. Insurance receipts included.",
    keywords: ["consultation price list", "online doctor price", "telemedicine fees"],
  },
  "/online-prescription": {
    title: "Online prescription · Renew meds in minutes",
    description:
      "Renew chronic medications or get a short-course prescription after a video review. Issued electronically to your pharmacy of choice.",
    keywords: ["online prescription", "repeat prescription online", "electronic prescription Europe"],
  },
  "/home-delivery": {
    title: "Pharmacy home delivery · Doorstep meds",
    description:
      "Get prescribed medication delivered to your door in 24–48 hours. Cold-chain packaging, tracked dispatch and discreet labels.",
    keywords: ["pharmacy home delivery", "medication delivery Europe", "online pharmacy"],
  },
  "/home-health-test": {
    title: "Home health tests · Blood panels & rapid kits",
    description:
      "Order a clinician-reviewed home test — blood panels, hormones, vitamins, STI and rapid kits. Results land in your file with a written summary.",
    keywords: ["home blood test", "at-home health test", "online lab test"],
  },
  "/partner-clinics": {
    title: "Partner clinics · In-person care across Europe",
    description:
      "When you need hands-on care, we route you to vetted local clinics. Pre-booked slots, shared notes and direct billing where available.",
    keywords: ["partner clinics Europe", "in-person follow-up", "clinic network"],
  },
  "/corporate-plans": {
    title: "Corporate plans · Employee healthcare without borders",
    description:
      "Offer your team 24/7 access to multilingual clinicians across five countries. Transparent per-seat pricing, full reporting, no minimum size.",
    keywords: ["corporate health plan", "employee telemedicine", "company health benefit"],
  },
  "/gift-card": {
    title: "Gift a consultation · Care for someone you love",
    description:
      "Send the gift of immediate access to a doctor. Digital gift cards from €50, redeemable across every Global Health country and service.",
    keywords: ["healthcare gift card", "doctor consultation gift", "wellness gift Europe"],
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
    title: "General consultation · Ireland",
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
