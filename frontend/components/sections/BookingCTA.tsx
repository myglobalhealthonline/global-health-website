import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type BookingCTAProps = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

export function BookingCTA({ title, description, ctaLabel, ctaHref }: BookingCTAProps) {
  return (
    <Section className="pb-20">
      <Container>
        <div className="rounded-3xl bg-gradient-to-r from-cyan-700 to-sky-700 p-8 text-white shadow-xl sm:p-10 lg:p-12">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-base text-cyan-50">{description}</p>
          <Link
            href={ctaHref}
            className="mt-7 inline-flex min-h-12 items-center rounded-full bg-white px-7 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-50"
          >
            {ctaLabel}
          </Link>
        </div>
      </Container>
    </Section>
  );
}