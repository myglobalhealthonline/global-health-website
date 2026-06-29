import type { Metadata } from "next";
import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { GH2AuthShell } from "@/components/sections/GH2PagePrimitives";
import { LoginForm, LoginFormFallback } from "./ui";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Global Health.",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const [user, locale] = await Promise.all([getServerAuthUser(), getPageLocale()]);
  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : user.role === "DOCTOR" ? "/doctor" : "/account");
  }
  const { auth } = loadLocaleBundle(locale);
  const loginI18n = auth.login;

  return (
    <GH2AuthShell
      activeTab="login"
      eyebrow="Secure access"
      title="Manage care with"
      accent="confidence."
      body="Sign in to continue booking, reviewing consultations, and managing the clinical network."
    >
      <div className="mb-6 text-center">
        <h1
          className="font-extrabold tracking-[-0.04em]"
          style={{ fontSize: "clamp(1.75rem,3vw,2.25rem)", lineHeight: 1.1, color: "#0D3A28" } as React.CSSProperties}
        >
          Welcome back
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "#7A9A83" }}>
          Sign in to your Global Health account
        </p>
      </div>

      <Suspense fallback={<LoginFormFallback i18n={loginI18n} />}>
        <LoginForm i18n={loginI18n} />
      </Suspense>
    </GH2AuthShell>
  );
}
