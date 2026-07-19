import type { Metadata } from "next";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { AccessRequestPageClient } from "./AccessRequestPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  return buildPublicMetadata({ path: "/access-request", title: "Medical file access request", description: "Review and respond to a secure Global Health medical file access request.", locale, kind: "page", subtitle: "Secure patient authorization", noindex: true });
}

export default async function AccessRequestPage() {
  return <AccessRequestPageClient />;
}
