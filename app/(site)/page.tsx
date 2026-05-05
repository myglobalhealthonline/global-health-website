import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { CountrySelector } from "@/components/sections/CountrySelector";
import { headerPrimaryCta } from "@/data/navigation";

export const metadata: Metadata = {
  title: "Home",
  description: "Global Health homepage foundation.",
};

export default function HomePage() {
  return (
    <>
      <Section className="scroll-mt-24 bg-gradient-to-b from-teal-50/80 to-white pb-8 sm:pb-12">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal-700">Online medical clinic · Europe-wide</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem] lg:leading-tight">
              Licensed online consultations tailored to where you live
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Foundation build complete. Core navigation and route inventory are now wired for iterative page delivery.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href={headerPrimaryCta.href} className="inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-8 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-teal-800">
                {headerPrimaryCta.label}
              </Link>
              <a href="#countries" className="inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3 text-base font-semibold text-slate-900 underline-offset-4 transition-colors hover:text-teal-700 hover:underline">
                Select your country
              </a>
            </div>
          </div>
        </Container>
      </Section>

      <CountrySelector />

      <PageShell
        title="Homepage shell status"
        message="TODO: Compose final hero/trust/services/FAQ/testimonial sections using CMS-backed content and route-level metadata."
      />
    </>
  );
}

