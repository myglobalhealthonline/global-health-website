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
    <Suspense fallback={<div className="flex min-h-[calc(100dvh-var(--header-height))] items-center justify-center bg-[var(--color-background-soft)] px-5 py-16" aria-busy="true" />}>
      <LegacyCheckoutCancelledRedirectClient
        title={common.flow.checkoutCancelledTitle}
        body={common.flow.checkoutCancelledBody}
      />
    </Suspense>
  );
}
