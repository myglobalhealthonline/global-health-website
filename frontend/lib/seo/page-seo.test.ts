import type { Metadata } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPublicMetadata } from "./page-seo";

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

    expect(metadata.title).toBe("Online GP Consultation in Ireland");
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

  it("keeps social titles word-safe but never truncates the indexed document title", () => {
    const title =
      "Online Doctor Ireland | IMC-Registered General Practitioners and Specialists | Global Health";
    const metadata = buildPublicMetadata({
      path: "/ireland/en/online-doctor",
      title,
      description: "Meet licensed doctors serving patients throughout Ireland.",
      locale: "en_IE",
      kind: "service",
    });
    const documentTitle = renderedDocumentTitle(metadata.title);
    const openGraph = metadata.openGraph as OpenGraphMetadata;
    const ogTitle = openGraph.title as string;

    // Google indexes the whole document title and clips it only for display,
    // so every keyword survives here — ellipsis truncation would delete them.
    expect(documentTitle).toBe(title);
    expect(documentTitle).not.toContain("…");

    expect(ogTitle.length).toBeLessThanOrEqual(74);
    expectWordSafeTruncation(ogTitle, title);
  });

  it("keeps search and social descriptions within word-safe preview limits", () => {
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

    expect(metaDescription.length).toBeLessThanOrEqual(160);
    expect(ogDescription.length).toBeLessThanOrEqual(125);
    expect(twitterDescription.length).toBeLessThanOrEqual(125);

    expectWordSafeTruncation(metaDescription, description);
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

  it("brands a long document title without dropping any of its keywords", () => {
    const source =
      "A very detailed specialist consultation service for patients throughout Ireland";
    const metadata = buildPublicMetadata({
      path: "/ireland/en/services/a-long-service",
      title: source,
      description: "Licensed medical care in Ireland.",
    });

    const title = renderedDocumentTitle(metadata.title);
    expect(title).toBe(`${source} · Global Health`);
    expect(title).not.toContain("…");
  });

  it("does not truncate a realistic homepage title that fits within the new budget", () => {
    const metadata = buildPublicMetadata({
      path: "/",
      title: "Licensed online consultations tailored to where you live",
      description: "Meet licensed doctors and specialists online, in your country.",
    });

    const title = renderedDocumentTitle(metadata.title);
    expect(title).toBe(
      "Licensed online consultations tailored to where you live · Global Health",
    );
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
