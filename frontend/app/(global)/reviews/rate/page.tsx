import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { ReviewRatePageClient } from "./ReviewRatePageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale(); const common = getCommonLocale(locale);
  return buildPublicMetadata({ path: "/reviews/rate", title: common.flow.reviewRateTitle, description: common.flow.reviewRateSubtitle, locale, kind: "page", subtitle: common.flow.reviewRateStepRatings, noindex: true });
}

export default async function ReviewRatePage() {
  const locale = await getPageLocale();
  const common = getCommonLocale(locale);

  return <ReviewRatePageClient flow={common.flow} />;
}
