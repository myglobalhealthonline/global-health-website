import type { Metadata } from "next";
import { ConsultationListingTemplate } from "@/components/templates/ConsultationListingTemplate";
import { formatOptionalPrice, getPublicServicesForCountry } from "@/lib/content/get-public-services";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Home Health Tests - Ireland",
  description: "Admin-managed home health test services for Ireland.",
};

export default async function Page() {
  const [services, templateData] = await Promise.all([
    getPublicServicesForCountry("ie"),
    getTemplatePageData("/home-health-test", "ie"),
  ]);

  const listing = services
    .filter((service) => service.kind === "HEALTH_TEST")
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((service) => {
      const href =
        service.legacyPath && service.legacyPath !== "/home-health-test"
          ? service.legacyPath
          : `/services/ie-${service.slug}`;
      return {
        title: service.name,
        description:
          service.summary ??
          "Home test service with sample guidance, timing details, and secure clinical follow-up.",
        href,
        serviceType: "general" as const,
        duration: service.durationMinutes != null ? `${service.durationMinutes} min` : undefined,
        startingPrice: formatOptionalPrice(service),
        imageSrc: service.imagePath ? (resolveTrustedAssetUrl(service.imagePath) ?? service.imagePath) : undefined,
        stats: [
          service.durationMinutes != null ? `${service.durationMinutes} min` : null,
          formatOptionalPrice(service) ?? null,
        ]
          .filter(Boolean)
          .join(" • "),
      };
    });

  return (
    <ConsultationListingTemplate
      title="Home Health Tests - Ireland"
      description="Browse admin-managed health tests with pricing, timing, and clear next-step guidance."
      mode="general"
      listing={listing}
      howItWorks={{
        title: "How home health tests work",
        subtitle: "Book, sample, and receive guidance in a few steps",
        steps: [
          { title: "Choose test", description: "Select the health test that matches your concern." },
          { title: "Book and prepare", description: "Complete booking and follow sample preparation instructions." },
          { title: "Receive results guidance", description: "Get follow-up advice from the clinical team." },
        ],
      }}
      trust={{
        title: "Health test support you can trust",
        subtitle: "Clear process, secure handling, clinician-backed follow-up",
        items: [
          { title: "Structured testing flow", description: "Service details and instructions are managed in admin." },
          { title: "Secure records", description: "Sensitive details are handled through secure channels." },
          { title: "Practical follow-up", description: "Results include next-step care guidance when needed." },
        ],
      }}
      faq={{ title: "Home health test FAQs", items: templateData.faqItems }}
      bookingHref={templateData.paths.general}
      bookingLabel="Book consultation"
    />
  );
}
