import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { GH2AuthShell } from "@/components/sections/GH2PagePrimitives";
import { RegisterForm, RegisterFormFallback } from "./ui";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a patient account for Global Health.",
};

export default async function Page() {
  const locale = await getPageLocale();
  const { auth } = loadLocaleBundle(locale);
  const registerI18n = auth.register;

  return (
    <GH2AuthShell
      activeTab="register"
      eyebrow="Patient access"
      title="Healthcare made"
      accent="effortless."
      body="Book consultations, receive prescriptions, and manage your family's health — all in one place."
    >
      <div>
        <h1
          className="font-extrabold tracking-[-0.03em]"
          style={{ fontSize: "clamp(1.5rem,2.5vw,1.875rem)", color: "var(--color-text-primary)" }}
        >
          Create your account
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          Free to join. Confirmations and receipts go to your email.
        </p>
      </div>
      <Suspense fallback={<RegisterFormFallback i18n={registerI18n} />}>
        <RegisterForm i18n={registerI18n} />
      </Suspense>
      <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--color-brand-primary)] underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </GH2AuthShell>
  );
}
