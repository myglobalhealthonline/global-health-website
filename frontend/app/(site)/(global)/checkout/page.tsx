import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { LegacyCheckoutRedirectClient } from "./LegacyCheckoutRedirectClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale(); const common = getCommonLocale(locale);
  return buildPublicMetadata({ path: "/checkout", title: common.flow.checkoutOpeningTitle, description: common.flow.checkoutOpeningBody, locale, kind: "page", subtitle: common.cartPage.stepPayment, noindex: true });
}

export default async function LegacyCheckoutRedirect() {
  const locale = await getPageLocale();
  const common = getCommonLocale(locale);

  return (
    <LegacyCheckoutRedirectClient
      title={common.flow.checkoutOpeningTitle}
      stepCart={common.cartPage.stepCart}
      stepCheckout={common.cartPage.stepCheckout}
      stepPayment={common.cartPage.stepPayment}
      body={common.flow.checkoutOpeningBody}
    />
  );
}
