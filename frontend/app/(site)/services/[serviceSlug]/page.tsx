import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ServiceDetailTemplate } from "@/components/templates/ServiceDetailTemplate";
import { buildServiceDetailCopyAsync } from "@/lib/content/template-page-data";
import { getPublicServicesNormalized } from "@/lib/content/get-public-services";

type Params = { serviceSlug: string };

export const metadata: Metadata = {
  title: "Service Details",
  description: "Service details for Global Health consultations.",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function ServicesDetailPage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  const services = await getPublicServicesNormalized();

  const exact = services.find((item) => item.slug === serviceSlug);
  const prefixed = services.find((item) => `${item.countryCode}-${item.slug}` === serviceSlug);
  const service = prefixed ?? exact;
  if (!service) notFound();
  if (service.countryCode === "ie" && service.kind === "SPECIALIST") {
    redirect(`/ireland-specialist-consultations/${service.slug}`);
  }
  if (service.countryCode === "ie" && service.kind === "HEALTH_TEST") {
    redirect(`/home-health-tests/${service.slug}`);
  }
  if (service.countryCode === "ie" && service.kind === "HOME_DELIVERY") {
    redirect("/home-delivery");
  }
  if (service.countryCode === "ie") {
    redirect(`/ireland/${service.slug}`);
  }
  if (exact) {
    redirect(`/services/${service.countryCode}-${service.slug}`);
  }

  const mode = service.kind === "SPECIALIST" ? "specialist" : "general";
  const copy = await buildServiceDetailCopyAsync(service.slug, mode, service.countryCode);
  return (
    <ServiceDetailTemplate
      title={copy.title}
      description={copy.description}
      body={copy.body}
      bodyHtml={copy.bodyHtml ?? null}
      keyFacts={copy.keyFacts}
      bookingHref="/book-online"
      bookingLabel={copy.bookingLabel ?? "Book Online"}
      imageSrc={copy.imageSrc}
    />
  );
}
