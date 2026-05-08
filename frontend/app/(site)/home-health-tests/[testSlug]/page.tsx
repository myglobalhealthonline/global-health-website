import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HealthTestDetailTemplate } from "@/components/templates/HealthTestDetailTemplate";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import {
  formatHealthTestPrice,
  getPublicHealthTestBySlug,
} from "@/lib/content/get-public-health-tests";

type Params = { testSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { testSlug } = await params;
  const test = await getPublicHealthTestBySlug("ie", testSlug);
  if (!test) {
    return {
      title: "Home Health Test",
      robots: { index: false, follow: true },
    };
  }
  return {
    title: test.seoTitle ?? test.title,
    description: test.seoDescription ?? test.shortDescription ?? "Home health test detail page.",
    robots: { index: false, follow: true },
  };
}

export default async function HomeHealthTestPage({ params }: { params: Promise<Params> }) {
  const { testSlug } = await params;
  const test = await getPublicHealthTestBySlug("ie", testSlug);
  if (!test) notFound();

  return (
    <HealthTestDetailTemplate
      title={test.title}
      price={formatHealthTestPrice(test)}
      imageSrc={resolveTrustedAssetUrl(test.productImagePath) ?? test.productImagePath}
      shortDescription={test.shortDescription}
      detailIntro={test.detailIntro}
      sampleType={test.sampleType}
      resultsTimeline={test.resultsTimeline}
      whatThisTestCovers={test.whatThisTestCovers}
      whyGetTested={test.whyGetTested}
      extraSections={test.extraSections}
      galleryImagePaths={test.galleryImagePaths.map((path) => resolveTrustedAssetUrl(path) ?? path)}
      ctaLabel={test.heroButtonLabel ?? "Buy Now"}
    />
  );
}
