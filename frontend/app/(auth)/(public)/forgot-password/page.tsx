import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { GH2AuthShell } from "@/components/sections/GH2PagePrimitives";
import { ForgotPasswordForm } from "./ui";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a password reset for your Global Health account.",
};

export default async function Page() {
  const locale = await getPageLocale();
  const { auth } = loadLocaleBundle(locale);
  const forgotI18n = auth.forgotPassword;

  return (
    <GH2AuthShell
      eyebrow="Account recovery"
      title="Reset access"
      accent="securely."
      body="We accept the reset request without revealing whether an email is registered."
    >
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-primary)] underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to login
      </Link>
      <h1 className="mt-5 text-[clamp(1.6rem,2.5vw,2rem)] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
        Reset your password
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
        Enter your email and we will accept the reset request. If the account exists, instructions will be sent when email delivery is enabled.
      </p>
      <ForgotPasswordForm i18n={forgotI18n} />
    </GH2AuthShell>
  );
}
