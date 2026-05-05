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
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-cyan-700 via-sky-700 to-sky-800 p-8 text-white shadow-xl sm:p-10 lg:p-12">
          <div className="absolute -right-12 top-0 h-36 w-36 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" aria-hidden />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-cyan-50">{description}</p>
            </div>
            <Link
              href={ctaHref}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-50"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
