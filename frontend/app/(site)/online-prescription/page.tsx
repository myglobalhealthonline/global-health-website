import type { Metadata } from "next";
import { ConsultationListingTemplate } from "@/components/templates/ConsultationListingTemplate";
import { formatOptionalPrice, getPublicServicesForCountry } from "@/lib/content/get-public-services";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Online Prescriptions - Ireland",
  description: "Admin-managed online prescription services for Ireland.",
};

export default async function Page() {
  const [services, templateData] = await Promise.all([
    getPublicServicesForCountry("ie"),
    getTemplatePageData("/online-prescription", "ie"),
  ]);

  const listing = services
    .filter((service) => service.kind === "PRESCRIPTION")
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((service) => {
      const href =
        service.legacyPath && service.legacyPath !== "/online-prescription"
          ? service.legacyPath
          : `/services/ie-${service.slug}`;
      return {
        title: service.name,
        description:
          service.summary ??
          "Prescription request support with secure review and follow-up instructions.",
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
      title="Online Prescriptions - Ireland"
      description="Request prescription-related services online with transparent pricing, duration, and secure follow-up."
      mode="general"
      listing={listing}
      howItWorks={{
        title: "How prescription requests work",
        subtitle: "Simple online flow for safe prescription support",
        steps: [
          { title: "Choose prescription service", description: "Select the service that matches your need." },
          { title: "Complete request", description: "Submit details and preferred consultation time." },
          { title: "Receive next steps", description: "Get clinician guidance and prescription outcome securely." },
        ],
      }}
      trust={{
        title: "Prescription support you can trust",
        subtitle: "Licensed clinicians, secure booking, clear follow-up",
        items: [
          { title: "Clinician-reviewed", description: "All requests are reviewed by qualified medical professionals." },
          { title: "Secure handling", description: "Personal and medical details are processed through secure flows." },
          { title: "Transparent pricing", description: "Price and duration come from admin-managed service records." },
        ],
      }}
      faq={{ title: "Online prescription FAQs", items: templateData.faqItems }}
      bookingHref={templateData.paths.general}
      bookingLabel="Book consultation"
    />
  );
}
