import type { Metadata } from "next";
import React, { Suspense } from "react";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { GH2AuthShell } from "@/components/sections/GH2PagePrimitives";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { RegisterForm, RegisterFormFallback } from "./ui";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const { auth } = loadLocaleBundle(locale);
  return buildPublicMetadata({
    path: "/register",
    title: auth.register.metaTitle,
    description: auth.register.metaDescription,
    locale,
    kind: "page",
    noindex: true,
  });
}

export default async function Page() {
  const locale = await getPageLocale();
  const { auth } = loadLocaleBundle(locale);
  const registerI18n = auth.register;

  return (
    <GH2AuthShell
      activeTab="register"
      shell={auth.shell}
      eyebrow={registerI18n.heroEyebrow}
      title={registerI18n.heroTitle}
      accent={registerI18n.heroAccent}
      body={registerI18n.heroBody}
    >
      <div className="mb-5">
        <h1
          className="font-extrabold tracking-[-0.04em]"
          style={{ fontSize: "clamp(1.55rem,2.2vw,1.9rem)", lineHeight: 1.05, color: "var(--color-text-primary)", textWrap: "balance" } as React.CSSProperties}
        >
          {registerI18n.pageHeading}
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          {registerI18n.pageSubheading}
        </p>
      </div>
      <Suspense fallback={<RegisterFormFallback i18n={registerI18n} />}>
        <RegisterForm i18n={registerI18n} />
      </Suspense>
    </GH2AuthShell>
  );
}
