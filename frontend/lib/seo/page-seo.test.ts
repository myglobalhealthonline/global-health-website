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
});
