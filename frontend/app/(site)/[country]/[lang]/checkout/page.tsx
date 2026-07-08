import { Suspense } from "react";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { CheckoutPageClient } from "./_components/CheckoutPageClient";

// Server wrapper: resolve the locale slices here (server-only) and pass just
// the strings the client needs, so the all-locale bundle never ships to the
// browser (P-001). Same fallback semantics as loadLocaleBundle's `?? .en`.
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ country: string; lang: string }>;
}) {
  const { lang } = await params;
  const bundle = loadLocaleBundle((lang || "en") as LocaleCode);
  return (
    <Suspense>
      <CheckoutPageClient
        t={bundle.common.checkoutPage}
        cartT={bundle.common.cartPage}
        coverageT={bundle.subscription.coverage}
      />
    </Suspense>
  );
}
