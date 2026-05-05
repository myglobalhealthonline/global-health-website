import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import Link from "next/link";

type PageShellProps = {
  title: string;
  message: string;
  ctaHref?: string;
  ctaLabel?: string;
  children?: ReactNode;
};

export function PageShell({
  title,
  message,
  ctaHref = "/book-online",
  ctaLabel = "Book Online",
  children,
}: PageShellProps) {
  return (
    <Section className="scroll-mt-24">
      <Container>
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-4 text-base text-slate-600">{message}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={ctaHref}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-6 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              {ctaLabel}
            </Link>
          </div>
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
      </Container>
    </Section>
  );
}


