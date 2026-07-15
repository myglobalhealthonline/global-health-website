import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { ReviewRatePageClient } from "./ReviewRatePageClient";

export default async function ReviewRatePage() {
  const locale = await getPageLocale();
  const common = getCommonLocale(locale);

  return <ReviewRatePageClient flow={common.flow} />;
}
