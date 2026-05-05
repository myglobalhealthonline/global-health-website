import type { Metadata } from "next";
import { ConsultationListingTemplate } from "@/components/templates/ConsultationListingTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Specialist Consultation - Ireland",
  description: "Consultation listing template.",
};

export default async function Page() {
  const data = await getTemplatePageData("specialty-ie", "ie");
  return (
    <ConsultationListingTemplate
      title="Specialist Consultation - Ireland"
      description="Find specialist consultation options and choose the service that best matches your needs."
      mode="specialist"
      primaryCtaLabel="Start specialist consultation"
      secondaryCta={{ label: "Meet doctors", href: data.paths.team }}
      explanation={{
        title: "How specialist consultations work",
        body: "Specialist consultations are suitable when you need focused medical expertise, follow-up review, or guidance on complex concerns.",
      }}
      listing={data.specialistListing}
      howItWorks={{
        title: "Book in three steps",
        subtitle: "Simple specialist booking flow",
        steps: [
          { title: "Choose specialty", description: "Review available specialist categories." },
          { title: "Pick appointment time", description: "Choose a convenient slot and complete booking." },
          { title: "Join consultation", description: "Attend securely and receive your next-step guidance." },
        ],
      }}
      trust={{
        title: "Specialist care you can trust",
        subtitle: "Secure, structured, and patient-focused",
        items: [
          { title: "Licensed specialists", description: "Consultations are delivered by qualified medical professionals." },
          { title: "Secure consultations", description: "Privacy-first online consultation flow from booking to follow-up." },
          { title: "Clear next steps", description: "Each consultation ends with actionable guidance." },
        ],
      }}
      bookingHref={data.paths.specialist}
      bookingLabel="Start specialist consultation"
    />
  );
}
