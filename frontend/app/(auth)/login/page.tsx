import type { Metadata } from "next";
import { Suspense } from "react";
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
      eyebrow="Secure access"
      title="Manage care with"
      accent="confidence."
      body="Sign in to continue booking, reviewing consultations, or managing the clinical network."
    >
      <h1 className="text-[clamp(1.6rem,2.5vw,2rem)] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
        {loginI18n.title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
        Sessions are secured with httpOnly cookies and role-aware redirects.
      </p>
      <div className="mt-7">
        <Suspense fallback={<LoginFormFallback i18n={loginI18n} />}>
          <LoginForm i18n={loginI18n} />
        </Suspense>
      </div>
    </GH2AuthShell>
  );
}
