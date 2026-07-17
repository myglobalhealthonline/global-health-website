import type { Metadata } from "next";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { LegacyCartRedirectClient } from "./LegacyCartRedirectClient";

export const metadata: Metadata = { title: "Cart" };

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
