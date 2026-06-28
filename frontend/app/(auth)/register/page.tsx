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
      title="Create your"
      accent="account."
      body="Register to book consultations, keep receipts together, and manage patient requests securely."
    >
      <h1 className="text-[clamp(1.6rem,2.5vw,2rem)] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
        {registerI18n.title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
        Use an email you can access. Booking confirmations and receipts are sent there.
      </p>
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
