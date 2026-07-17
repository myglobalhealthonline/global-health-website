import { Suspense } from "react";
import type { Metadata } from "next";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { LegacyCheckoutCancelledRedirectClient } from "./LegacyCheckoutCancelledRedirectClient";

export const metadata: Metadata = { title: "Payment cancelled" };

export default async function LegacyCheckoutCancelledRedirect() {
  const locale = await getPageLocale();
  const common = getCommonLocale(locale);

  return (
    <Suspense fallback={null}>
      <LegacyCheckoutCancelledRedirectClient
        title={common.flow.checkoutCancelledTitle}
        body={common.flow.checkoutCancelledBody}
      />
    </Suspense>
  );
}
