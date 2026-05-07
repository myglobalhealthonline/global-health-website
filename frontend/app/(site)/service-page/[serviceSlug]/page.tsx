import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPublicServicesNormalized } from "@/lib/content/get-public-services";

type Params = { serviceSlug: string };

export const metadata: Metadata = {
  title: "Service redirect",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function ServicePage({ params }: { params: Promise<Params> }) {
  const { serviceSlug } = await params;
  const services = await getPublicServicesNormalized();
  const service = services.find((item) => item.slug === serviceSlug);
  if (!service) notFound();

  if (service.countryCode === "ie" && service.kind === "SPECIALIST") {
    redirect(`/ireland-specialist-consultations/${service.slug}`);
  }
  if (service.countryCode === "ie") {
    redirect(`/ireland/${service.slug}`);
  }
  redirect(`/services/${service.countryCode}-${service.slug}`);
}
