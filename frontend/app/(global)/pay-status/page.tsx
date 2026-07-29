import type { Metadata } from "next";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { PayStatusPageClient } from "./PayStatusPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  return buildPublicMetadata({
    path: "/pay-status",
    title: "Payment status",
    description: "The status of your payment link.",
    locale,
    kind: "page",
    subtitle: "Payment",
    noindex: true,
  });
}

export default async function PayStatusPage() {
  return <PayStatusPageClient />;
}
