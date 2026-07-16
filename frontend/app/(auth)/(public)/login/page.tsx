import type { Metadata } from "next";
import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { GH2AuthShell } from "@/components/sections/GH2PagePrimitives";
import { LoginForm, LoginFormFallback } from "./ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const { auth } = loadLocaleBundle(locale);
  return {
    title: auth.login.metaTitle,
    description: auth.login.metaDescription,
  };
}

export default async function Page() {
  const [user, locale] = await Promise.all([getServerAuthUser(), getPageLocale()]);
  if (user) {
    redirect(
      user.role === "ADMIN"
        ? "/admin"
        : user.role === "DOCTOR"
          ? "/doctor"
          : user.role === "CORPORATE_ADMIN"
            ? "/corporate"
            : "/account",
    );
  }
  const { auth } = loadLocaleBundle(locale);
  const loginI18n = auth.login;

  return (
    <GH2AuthShell
      activeTab="login"
      shell={auth.shell}
      eyebrow={loginI18n.heroEyebrow}
      title={loginI18n.heroTitle}
      accent={loginI18n.heroAccent}
      body={loginI18n.heroBody}
    >
      <div className="mb-5">
        <h1
          className="font-extrabold tracking-[-0.04em]"
          style={{ fontSize: "clamp(1.55rem,2.2vw,1.9rem)", lineHeight: 1.1, color: "var(--color-text-primary)", textWrap: "balance" } as React.CSSProperties}
        >
          {loginI18n.pageHeading}
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          {loginI18n.pageSubheading}
        </p>
      </div>

      <Suspense fallback={<LoginFormFallback i18n={loginI18n} />}>
        <LoginForm i18n={loginI18n} />
      </Suspense>
    </GH2AuthShell>
  );
}
