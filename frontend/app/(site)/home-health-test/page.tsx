import { HealthTestListingTemplate } from "@/components/templates/HealthTestListingTemplate";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import { formatHealthTestPrice, getPublicHealthTestsForCountry } from "@/lib/content/get-public-health-tests";
import { pageMetadata } from "@/lib/seo/page-seo";

export const metadata = pageMetadata("/home-health-test");

export default async function Page() {
  const tests = await getPublicHealthTestsForCountry("ie");

  const items = tests
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
    .map((test) => ({
      title: test.title,
      shortDescription: test.shortDescription ?? "",
      price: formatHealthTestPrice(test),
      imageSrc: resolveTrustedAssetUrl(test.productImagePath) ?? test.productImagePath,
      sampleType: test.sampleType,
      resultsTimeline: test.resultsTimeline,
      href:
        test.legacyPath && test.legacyPath !== "/home-health-test"
          ? test.legacyPath
          : `/home-health-tests/${test.slug}`,
      ctaLabel: test.heroButtonLabel ?? "Read more",
    }));

  return (
    <HealthTestListingTemplate
      title="Home Health Tests - Ireland"
      description="Browse image-led home health tests with clear pricing, sample method, result timing, and product-style details."
      items={items}
    />
  );
}
