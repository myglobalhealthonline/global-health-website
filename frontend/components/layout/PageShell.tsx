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
        <div className="gh-card mx-auto max-w-3xl p-6 sm:p-10">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">
            {title}
          </h1>
          <p className="gh-body mt-4 text-[var(--color-text-muted)]">{message}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={ctaHref}
              className="gh-btn gh-btn-primary"
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


