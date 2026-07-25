import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { GH2AuthShell } from "@/components/sections/GH2PagePrimitives";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { ForgotPasswordForm } from "./ui";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const { auth } = loadLocaleBundle(locale);
  return buildPublicMetadata({
    path: "/forgot-password",
    title: auth.forgotPassword.metaTitle,
    description: auth.forgotPassword.metaDescription,
    locale,
    kind: "page",
    noindex: true,
  });
}

export default async function Page() {
  const locale = await getPageLocale();
  const { auth } = loadLocaleBundle(locale);
  const forgotI18n = auth.forgotPassword;

  return (
    <GH2AuthShell
      shell={auth.shell}
      eyebrow={forgotI18n.heroEyebrow}
      title={forgotI18n.heroTitle}
      accent={forgotI18n.heroAccent}
      body={forgotI18n.heroBody}
    >
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-accent)] underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {forgotI18n.backToLogin}
      </Link>
      <h1 className="mt-5 text-[clamp(1.6rem,2.5vw,2rem)] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
        {forgotI18n.pageHeading}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
        {forgotI18n.pageSubheading}
      </p>
      <ForgotPasswordForm i18n={forgotI18n} />
    </GH2AuthShell>
  );
}
