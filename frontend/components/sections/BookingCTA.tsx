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
        <div className="rounded-2xl bg-teal-900 p-8 text-white sm:p-10">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="mt-3 text-sm text-teal-50">{description}</p>
          <Link href={ctaHref} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-6 text-sm font-semibold text-teal-900">
            {ctaLabel}
          </Link>
        </div>
      </Container>
    </Section>
  );
}
