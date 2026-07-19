import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { LegacyCartRedirectClient } from "./LegacyCartRedirectClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale(); const common = getCommonLocale(locale);
  return buildPublicMetadata({ path: "/cart", title: common.flow.cartOpeningTitle, description: common.flow.cartOpeningBody, locale, kind: "page", subtitle: common.cartPage.title, noindex: true });
}

export default async function LegacyCartRedirect() {
  const locale = await getPageLocale();
  const common = getCommonLocale(locale);

  return (
    <LegacyCartRedirectClient
      title={common.flow.cartOpeningTitle}
      stepCart={common.cartPage.stepCart}
      stepCheckout={common.cartPage.stepCheckout}
      stepPayment={common.cartPage.stepPayment}
      body={common.flow.cartOpeningBody}
    />
  );
}
