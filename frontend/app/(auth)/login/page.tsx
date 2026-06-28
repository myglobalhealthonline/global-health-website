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
      activeTab="login"
      eyebrow="Secure access"
      title="Your care, always"
      accent="available."
      body="Consult doctors, review your history, and manage appointments — all in one place."
    >
      <div>
        <h1
          className="font-extrabold tracking-[-0.03em]"
          style={{ fontSize: "clamp(1.5rem,2.5vw,1.875rem)", color: "var(--color-text-primary)" }}
        >
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          Sign in to continue to your account.
        </p>
      </div>

      <div className="mt-7">
        <Suspense fallback={<LoginFormFallback i18n={loginI18n} />}>
          <LoginForm i18n={loginI18n} />
        </Suspense>
      </div>

      <p className="mt-7 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        No account yet?{" "}
        <a
          href="/register"
          className="font-semibold underline-offset-4 hover:underline"
          style={{ color: "var(--color-brand-primary)" }}
        >
          Create one free
        </a>
      </p>
    </GH2AuthShell>
  );
}
