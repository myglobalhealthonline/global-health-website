import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { LegacyCheckoutRedirectClient } from "./LegacyCheckoutRedirectClient";

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
