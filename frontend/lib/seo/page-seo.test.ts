import type { Metadata } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPublicMetadata, noindexFollow } from "./page-seo";

type OpenGraphMetadata = NonNullable<Metadata["openGraph"]>;
type TwitterMetadata = NonNullable<Metadata["twitter"]>;

function firstImage(images: OpenGraphMetadata["images"]) {
  expect(Array.isArray(images)).toBe(true);
  return (images as Array<{ url: string | URL }>)[0] as {
    url: string | URL;
    width?: number | string;
    height?: number | string;
    alt?: string;
  };
}

function renderedDocumentTitle(title: Metadata["title"]): string {
  if (typeof title === "string") return `${title} · Global Health`;
  if (title && typeof title === "object" && "absolute" in title) return title.absolute;
  throw new Error("Expected metadata to provide a renderable document title");
}

function rawDocumentTitle(title: Metadata["title"]): string {
  if (typeof title === "string") return title;
  if (title && typeof title === "object" && "absolute" in title) return title.absolute;
  throw new Error("Expected metadata to provide a renderable document title");
}

function expectWordSafeTruncation(value: string, source: string): void {
  const finalWord = value.match(/[\p{L}\p{N}]+(?=[^\p{L}\p{N}]*$)/u)?.[0];
  const sourceWords = new Set(source.match(/[\p{L}\p{N}]+/gu) ?? []);

  expect(finalWord).toBeTruthy();
  expect(sourceWords.has(finalWord ?? "")).toBe(true);
}

describe("buildPublicMetadata", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://myglobalhealth.online/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("emits complete canonical, Open Graph, and Twitter metadata", () => {
    const metadata = buildPublicMetadata({
      path: "/ireland/en/services/general-practice",
      title: "Online GP Consultation in Ireland",
      description: "Book an appointment with an Ireland-registered general practitioner.",
      locale: "en_IE",
    });
    const openGraph = metadata.openGraph as OpenGraphMetadata;
    const twitter = metadata.twitter as TwitterMetadata;
    const image = firstImage(openGraph.images);

    // `buildPublicMetadata` now always returns `{ absolute }`, because the root
    // layout's `%s · Global Health` template would otherwise append 16 chars
    // AFTER the 60-char search budget had been enforced. 32 + 16 = 48, so the
    // brand still fits here and is added deliberately rather than by template.
    expect(rawDocumentTitle(metadata.title)).toBe(
      "Online GP Consultation in Ireland · Global Health",
    );
    expect(metadata.description).toBe(
      "Book an appointment with an Ireland-registered general practitioner.",
    );
    expect(metadata.alternates?.canonical?.toString()).toBe(
      "https://myglobalhealth.online/ireland/en/services/general-practice",
    );
    expect(openGraph).toMatchObject({
      type: "website",
      title: "Online GP Consultation in Ireland",
      description: "Book an appointment with an Ireland-registered general practitioner.",
      url: "https://myglobalhealth.online/ireland/en/services/general-practice",
      locale: "en_IE",
    });
    expect(image).toMatchObject({
      width: 1200,
      height: 630,
      alt: "Online GP Consultation in Ireland",
    });
    expect(new URL(image.url.toString()).protocol).toBe("https:");
    expect(twitter).toMatchObject({
      card: "summary_large_image",
      title: "Online GP Consultation in Ireland",
      description: "Book an appointment with an Ireland-registered general practitioner.",
    });
    expect(twitter.images).toEqual([image.url.toString()]);
  });

  it("uses a branded dynamic fallback instead of an empty or relative image", () => {
    const metadata = buildPublicMetadata({
      path: "/about",
      title: "About Global Health",
      description: "Learn about our licensed clinician network.",
    });
    const image = firstImage((metadata.openGraph as OpenGraphMetadata).images);
    const imageUrl = new URL(image.url.toString());

    expect(imageUrl.origin).toBe("https://myglobalhealth.online");
    expect(imageUrl.pathname).toBe("/api/og");
    expect(imageUrl.searchParams.get("title")).toBe("About Global Health");
    expect(image.alt).toBe("About Global Health");
  });

  it("normalizes a custom image and alt text across Open Graph and Twitter", () => {
    const metadata = buildPublicMetadata({
      path: "/ireland/en/doctors/aoife-murphy",
      title: "Dr Aoife Murphy",
      description: "General practitioner registered in Ireland.",
      type: "profile",
      image: {
        url: "/images/doctors/aoife-murphy-og.webp",
        alt: "Dr Aoife Murphy, general practitioner",
      },
    });
    const openGraph = metadata.openGraph as OpenGraphMetadata;
    const twitter = metadata.twitter as TwitterMetadata;
    const image = firstImage(openGraph.images);

    expect((openGraph as { type?: string }).type).toBe("profile");
    expect(image).toEqual({
      url: "https://myglobalhealth.online/images/doctors/aoife-murphy-og.webp",
      width: 1200,
      height: 630,
      alt: "Dr Aoife Murphy, general practitioner",
    });
    expect(twitter.images).toEqual([
      "https://myglobalhealth.online/images/doctors/aoife-murphy-og.webp",
    ]);
  });

  it("keeps localized metadata and image identity isolated by locale", () => {
    const english = buildPublicMetadata({
      path: "/portugal/en/pricing",
      title: "Healthcare plans in Portugal",
      description: "Compare plans for care in Portugal.",
      locale: "en_PT",
    });
    const portuguese = buildPublicMetadata({
      path: "/portugal/pt/pricing",
      title: "Planos de sa\u00fade em Portugal",
      description: "Compare planos de cuidados de sa\u00fade em Portugal.",
      locale: "pt_PT",
    });
    const englishOg = english.openGraph as OpenGraphMetadata;
    const portugueseOg = portuguese.openGraph as OpenGraphMetadata;

    expect(english.alternates?.canonical?.toString()).toContain("/portugal/en/pricing");
    expect(portuguese.alternates?.canonical?.toString()).toContain("/portugal/pt/pricing");
    expect(englishOg.locale).toBe("en_PT");
    expect(portugueseOg.locale).toBe("pt_PT");
    expect(firstImage(englishOg.images).url.toString()).not.toBe(
      firstImage(portugueseOg.images).url.toString(),
    );
  });

  it("preserves complete social metadata on noindex informational routes", () => {
    const metadata = buildPublicMetadata({
      path: "/verify/certificate/example",
      title: "Verify a certificate",
      description: "Check the authenticity of a Global Health certificate.",
      noindex: true,
    });

    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    expect(metadata.openGraph).toBeTruthy();
    expect(metadata.twitter).toBeTruthy();
    expect(firstImage((metadata.openGraph as OpenGraphMetadata).images).alt).toBe(
      "Verify a certificate",
    );
  });

  it("fits the search title to its budget by dropping trailing segments, never with an ellipsis", () => {
    const title =
      "Online Doctor Ireland | IMC-Registered General Practitioners and Specialists | Global Health";
    const metadata = buildPublicMetadata({
      path: "/ireland/en/online-doctor",
      title,
      description: "Meet licensed doctors serving patients throughout Ireland.",
      locale: "en_IE",
      kind: "service",
    });
    const documentTitle = rawDocumentTitle(metadata.title);
    const openGraph = metadata.openGraph as OpenGraphMetadata;
    const ogTitle = openGraph.title as string;

    // 2026-09-15 budget batch: brand dropped first, then the trailing
    // " | …" segments, so the served title fits 60 chars on a whole phrase.
    expect(documentTitle).toBe("Online Doctor Ireland");
    expect(documentTitle).not.toContain("…");
    expect(documentTitle.toLowerCase()).not.toContain("global health");

    expect(ogTitle.length).toBeLessThanOrEqual(74);
    expectWordSafeTruncation(ogTitle, title);
  });

  it("fits the search description to 160 chars while social descriptions keep their own limits", () => {
    const description =
      "Book an online consultation with Irish Medical Council registered general practitioners and specialists, with multilingual support, transparent pricing, secure records, and convenient appointments throughout Ireland.";
    const metadata = buildPublicMetadata({
      path: "/ireland/en/online-doctor",
      title: "Online Doctor Ireland",
      description,
      locale: "en_IE",
      kind: "service",
    });
    const openGraph = metadata.openGraph as OpenGraphMetadata;
    const twitter = metadata.twitter as TwitterMetadata;
    const metaDescription = metadata.description as string;
    const ogDescription = openGraph.description as string;
    const twitterDescription = twitter.description as string;

    // 2026-09-15 budget batch: one long sentence, so the cut falls on the
    // last clause that fits and ends with a full stop — never "…".
    expect(metaDescription).toBe(
      "Book an online consultation with Irish Medical Council registered general practitioners and specialists, with multilingual support, transparent pricing.",
    );
    expect(Array.from(metaDescription).length).toBeLessThanOrEqual(160);
    expect(metaDescription).not.toContain("…");

    expect(ogDescription.length).toBeLessThanOrEqual(125);
    expect(twitterDescription.length).toBeLessThanOrEqual(125);

    expectWordSafeTruncation(ogDescription, description);
    expectWordSafeTruncation(twitterDescription, description);
  });

  it("never duplicates the Global Health brand in document or social titles", () => {
    const metadata = buildPublicMetadata({
      path: "/ireland/en/online-doctor",
      title: "Online Doctor Ireland | Global Health",
      description: "Meet licensed doctors serving patients throughout Ireland.",
    });
    const openGraph = metadata.openGraph as OpenGraphMetadata;
    const twitter = metadata.twitter as TwitterMetadata;

    for (const title of [
      renderedDocumentTitle(metadata.title),
      openGraph.title as string,
      twitter.title as string,
    ]) {
      expect(title.match(/global health/giu)).toHaveLength(1);
    }
  });

  it("cuts a long, unbranded document title at a word boundary", () => {
    const source =
      "A very detailed specialist consultation service for patients throughout Ireland";
    const metadata = buildPublicMetadata({
      path: "/ireland/en/services/a-long-service",
      title: source,
      description: "Licensed medical care in Ireland.",
    });

    const title = rawDocumentTitle(metadata.title);
    // 80 chars, no separators: last whole word that fits the 60-char budget.
    expect(title).toBe("A very detailed specialist consultation service for patients");
    expect(title).not.toContain("…");
  });

  it("drops the brand rather than the copy when adding it would exceed the budget", () => {
    const metadata = buildPublicMetadata({
      path: "/",
      title: "Licensed online consultations tailored to where you live",
      description: "Meet licensed doctors and specialists online, in your country.",
    });

    // 55 chars of copy + 16 for " · Global Health" = 71, over the 60-char
    // search budget. The copy is what earns the click, and Google appends the
    // site name itself from `WebSite` schema, so the brand is what gives way —
    // never a mid-word ellipsis through the copy.
    const title = rawDocumentTitle(metadata.title);
    expect(title).toBe("Licensed online consultations tailored to where you live");
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).not.toContain("…");
  });

  it("omits the brand suffix on routes that opt out, and still respects the search budget", () => {
    const source = "Consulta Pediátrica de Medicina Geral na Irlanda | Médico Online para Crianças";
    const metadata = buildPublicMetadata({
      path: "/ireland/pt/services/paediatric-consultation",
      title: source,
      description: "Consultas pediátricas no mesmo dia com médicos registados na Irlanda.",
      kind: "service",
      brandSuffix: false,
    });
    const openGraph = metadata.openGraph as OpenGraphMetadata;
    const documentTitle = rawDocumentTitle(metadata.title);

    // Document title: no brand added (source carries none); the 78-char
    // source loses its trailing " | …" segment (2026-09-15 budget batch).
    expect(documentTitle).toBe("Consulta Pediátrica de Medicina Geral na Irlanda");
    expect(documentTitle).not.toContain("Global Health");
    expect(documentTitle).not.toContain("…");

    // Social cards keep their own word-safe budget and carry the brand via
    // `siteName`, so dropping the document-title suffix costs them nothing.
    expect((openGraph.title as string).length).toBeLessThanOrEqual(74);
    expect(openGraph.siteName).toBe("Global Health");
  });

  it("keeps doctor OG metadata on the branded endpoint when the source image is untrusted", () => {
    const metadata = buildPublicMetadata({
      path: "/ireland/en/doctors/aoife-murphy",
      title: "Dr Aoife Murphy",
      description: "Irish Medical Council registered general practitioner.",
      type: "profile",
      kind: "doctor",
      sourceImage: "http://localhost:8000/private/doctor.jpg",
    });

    const image = firstImage((metadata.openGraph as OpenGraphMetadata).images);
    const imageUrl = new URL(image.url.toString());

    expect(imageUrl.origin).toBe("https://myglobalhealth.online");
    expect(imageUrl.pathname).toBe("/api/og");
    expect(image).toMatchObject({ width: 1200, height: 630, alt: "Dr Aoife Murphy" });
  });
});

// 2026-08-03 SEO audit (2.1): compactSearchTitle isn't exported, so these
// exercise it the same way real callers do — through buildPublicMetadata's
// document title. Fixtures are real over-length titles from the audit.
describe("compactSearchTitle", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://myglobalhealth.online/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("passes an under-limit title through untouched", () => {
    // 77 chars including brand, but the audit's own worst-case example —
    // used here to prove the untouched path still works right at the edge
    // once the brand is counted in.
    const title = "Online Doctors Ireland | IMC-Registered GPs & Specialists";
    expect(Array.from(title).length).toBeLessThanOrEqual(60);

    const metadata = buildPublicMetadata({ path: "/ireland/en/doctors", title, description: "d" });
    expect(rawDocumentTitle(metadata.title)).toBe(title);
  });

  it("drops the trailing brand when that alone brings it under the limit", () => {
    const title = "Online Doctors Ireland | IMC-Registered GPs & Specialists · Global Health";
    const metadata = buildPublicMetadata({ path: "/ireland/en/doctors", title, description: "d" });
    const result = rawDocumentTitle(metadata.title);

    expect(result).toBe("Online Doctors Ireland | IMC-Registered GPs & Specialists");
    expect(Array.from(result).length).toBeLessThanOrEqual(60);
    expect(result).not.toContain("…");
  });

  it("drops the brand, then the trailing segment, when still over the limit", () => {
    const title =
      "Online Specialist Consultation Ireland | Cardiology, Neurology, Paediatrics | Global Health";
    const metadata = buildPublicMetadata({
      path: "/ireland/en/specialist-consultation",
      title,
      description: "d",
    });
    const result = rawDocumentTitle(metadata.title);

    expect(result).toBe("Online Specialist Consultation Ireland");
    expect(result).not.toContain("…");
    expect(result.toLowerCase()).not.toContain("global health");
  });

  it("fits a long title that carries no brand suffix at all", () => {
    // Audit fixture minus its trailing brand, isolating the no-brand-present branch.
    const title = "Médico Online España | Médicos de Cabecera y Especialistas Colegiados";
    expect(Array.from(title).length).toBeGreaterThan(60);

    const metadata = buildPublicMetadata({ path: "/spain/es/x", title, description: "d" });
    const result = rawDocumentTitle(metadata.title);

    expect(result).toBe("Médico Online España");
    expect(result).not.toContain("…");
  });
});

// 2026-09-15 OpenSEO audit: real over-budget strings served on production.
describe("search metadata budget (2026-09-15 audit fixtures)", () => {
  const TITLES = [
    "Avaliação de Risco de Osteoporose Irlanda | Preciso de uma Densitometria Óssea?",
    "Online GP or In-Person? A Symptom Guide to Telemedicine and Urgent Care in Ireland",
    "Consultație pentru afecțiuni ale pielii și dermatologie online în Irlanda",
    "Online-Beratung zur psychischen Gesundheit in Irland mit registrierten Ärzten",
    "Ondansetron, Omeprazol a další: jak funguje online opakovaný recept v Irsku",
  ];
  const DESCRIPTIONS = [
    "Faça um teste gratuito de dor de garganta: responda a perguntas sobre sintomas como febre, tosse e gânglios inchados e veja o Centor/McIsaac. Não substitui uma consulta médica; se tiver dificuldade em respirar ou engolir, procure ajuda urgente.",
    "Calculați-vă aportul caloric zilnic (TDEE) cu formula Mifflin-St Jeor, în funcție de vârstă, sex, înălțime, greutate și nivel de activitate fizică — apoi vedeți cât să mâncați pentru a slăbi, a vă menține sau a lua în greutate",
    "Termine a Global Health e as condições de utilização da plataforma para pacientes, médicos e parceiros em todos os mercados onde operamos, incluindo pagamentos, reembolsos e responsabilidades",
  ];

  it.each(TITLES)("title fits 60 chars on a whole word: %s", (title) => {
    const result = rawDocumentTitle(buildPublicMetadata({ path: "/x", title, description: "d" }).title);
    expect(Array.from(result).length).toBeLessThanOrEqual(60);
    expect(result).not.toContain("…");
    expect(result).not.toMatch(/[\s,;:|·—–-]$/u);
    expect(title.startsWith(result.replace(/\s+$/u, ""))).toBe(true);
  });

  it.each(DESCRIPTIONS)("description fits 70-160 chars and ends on punctuation: %s", (description) => {
    const result = buildPublicMetadata({ path: "/x", title: "t", description }).description as string;
    const length = Array.from(result).length;
    expect(length).toBeLessThanOrEqual(160);
    expect(length).toBeGreaterThanOrEqual(70);
    expect(result).toMatch(/[.!?]$/u);
    expect(result).not.toContain("…");
  });

  it("cuts a separator-free title at its leading question", () => {
    const title = "Online GP or In Person? When to See a Doctor Online vs In Person (2026)";
    const result = rawDocumentTitle(buildPublicMetadata({ path: "/x", title, description: "d" }).title);
    expect(result).toBe("Online GP or In Person?");
  });

  it("drops a thin trailing segment rather than cutting a phrase mid-way", () => {
    const title = "Saúde de Viagem Online Brasil | Consulta Médica Antes de Viajar";
    const result = rawDocumentTitle(buildPublicMetadata({ path: "/x", title, description: "d" }).title);
    expect(result).toBe("Saúde de Viagem Online Brasil");
  });

  it("leaves in-budget copy untouched", () => {
    const description = "Meet licensed doctors and specialists online, in your country. Same-day appointments.";
    const metadata = buildPublicMetadata({ path: "/x", title: "Online Doctor Ireland", description });
    expect(metadata.description).toBe(description);
  });
});

describe("hreflang reciprocity on non-indexable pages", () => {
  // GSC "missing return links": a noindexed variant that still lists alternates
  // points at a cluster whose members never name it back. Ireland only publishes
  // English, so /ireland/es/faq must advertise no alternates at all.
  const languages = {
    "en-IE": "/ireland/en/faq",
    "x-default": "/ireland/en/faq",
  };
  const base = {
    path: "/ireland/es/faq",
    title: "Preguntas frecuentes",
    description: "d",
    languages,
  };

  it("keeps the cluster on an indexable page", () => {
    const metadata = buildPublicMetadata(base);
    expect(metadata.alternates?.languages).toEqual(languages);
  });

  it("drops the cluster when the builder is told the page is noindex", () => {
    const metadata = buildPublicMetadata({ ...base, noindex: true });
    expect(metadata.alternates?.languages).toBeUndefined();
    expect(metadata.alternates?.canonical).toBeTruthy();
  });

  it("drops the cluster when a caller demotes the page afterwards", () => {
    const metadata = noindexFollow(buildPublicMetadata(base));
    expect(metadata.alternates?.languages).toBeUndefined();
    // The page stays crawlable and keeps its own canonical — only the
    // reciprocal claim goes.
    expect(metadata.alternates?.canonical).toBe(
      "https://www.myglobalhealth.online/ireland/es/faq",
    );
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
