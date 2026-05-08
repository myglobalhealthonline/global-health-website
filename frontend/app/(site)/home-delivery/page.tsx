import type { Metadata } from "next";
import { ConsultationListingTemplate } from "@/components/templates/ConsultationListingTemplate";
import { formatOptionalPrice, getPublicServicesForCountry } from "@/lib/content/get-public-services";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Home Delivery - Ireland",
  description: "Home delivery support after clinical review in Ireland.",
};

export default async function Page() {
  const [services, templateData] = await Promise.all([
    getPublicServicesForCountry("ie"),
    getTemplatePageData("/home-delivery", "ie"),
  ]);

  const listing = services
    .filter((service) => service.kind === "HOME_DELIVERY")
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((service) => {
      const href =
        service.legacyPath && service.legacyPath !== "/home-delivery"
          ? service.legacyPath
          : `/services/ie-${service.slug}`;
      return {
        title: service.name,
        description: service.summary ?? "",
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
      title="Home Delivery - Ireland"
      description="Browse delivery-related services with pricing, timing, coverage, and service details."
      mode="general"
      listing={listing}
      howItWorks={{
        title: "How home delivery works",
        subtitle: "Simple delivery flow after consultation",
        steps: [
          { title: "Choose delivery service", description: "Select the delivery option that fits your route." },
          { title: "Confirm details", description: "Provide required delivery and contact details." },
          { title: "Receive delivery update", description: "Get delivery status and follow-up guidance." },
        ],
      }}
      trust={{
        title: "Delivery support you can trust",
        subtitle: "Reliable process with secure handling",
        items: [
          { title: "Clear delivery details", description: "Service records include delivery-specific guidance." },
          { title: "Secure workflow", description: "Patient and delivery details are handled safely." },
          { title: "Availability shown before booking", description: "Only currently available delivery services appear on this page." },
        ],
      }}
      faq={{ title: "Home delivery FAQs", items: templateData.faqItems }}
      bookingHref={templateData.paths.general}
      bookingLabel="Book consultation"
    />
  );
}
