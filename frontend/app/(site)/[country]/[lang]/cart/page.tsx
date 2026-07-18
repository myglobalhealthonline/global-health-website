import { Suspense } from "react";
import type { Metadata } from "next";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { CartPageClient } from "./_components/CartPageClient";

type Params = { country: string; lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  return { title: loadLocaleBundle((lang || "en") as LocaleCode).common.cartPage.title };
}

// Server wrapper: resolve the locale slices here (server-only) and pass just
// the strings the client needs, so the all-locale bundle never ships to the
// browser (P-001). Same fallback semantics as loadLocaleBundle's `?? .en`.
export default async function CartPage({
  params,
}: {
  params: Promise<{ country: string; lang: string }>;
}) {
  const { lang } = await params;
  const bundle = loadLocaleBundle((lang || "en") as LocaleCode);
  return (
    <Suspense fallback={<div className="mx-auto max-w-[var(--container-width)] min-h-[70vh] px-5 md:px-10" aria-busy="true" />}>
      <CartPageClient
        t={bundle.common.cartPage}
        coverageT={bundle.subscription.coverage}
      />
    </Suspense>
  );
}
