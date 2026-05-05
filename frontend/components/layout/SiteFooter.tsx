import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { CTAFooter } from "@/components/layout/CTAFooter";
import type { SiteNavigationData } from "@/data/navigation";

export function SiteFooter({
  siteName,
  navigation,
}: {
  siteName: string;
  navigation: SiteNavigationData;
}) {
  return (
    <footer className="mt-auto">
      <div className="border-t border-[var(--color-border)] bg-[var(--color-brand-secondary)]">
        <Container className="py-14">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr]">
            <div>
              <Image
                src="/logos/global-health-logo-placeholder.svg"
                alt={`${siteName} logo placeholder`}
                width={220}
                height={54}
                className="h-12 w-auto"
              />
              <p className="mt-5 max-w-xs text-sm leading-6 text-[var(--color-text-muted)]">
                Online medical consultations with licensed clinicians across Ireland, Portugal, Spain, Czechia, and Romania.
              </p>
              <a
                href={`mailto:${navigation.siteContactEmail}`}
                className="mt-5 inline-flex text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-brand-primary-hover)]"
              >
                {navigation.siteContactEmail}
              </a>
            </div>

            {navigation.footerColumns.map((column) => (
              <div key={column.heading}>
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-text-primary)]">
                  {column.heading}
                </p>
                <ul className="flex flex-col gap-3">
                  {column.links.map((link) => {
                    const isMail =
                      link.label.toLowerCase().includes("contact") ||
                      link.href.startsWith("mailto:");
                    return (
                      <li key={link.label + link.href}>
                        {isMail ? (
                          <a
                            href={`mailto:${navigation.siteContactEmail}`}
                            className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                          >
                            {link.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-[var(--color-border)] pt-8 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[var(--color-text-muted)]">
              © {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
            <p className="text-[var(--color-text-muted)]">
              Global Health is a brand of Global Guest s.r.o
            </p>
          </div>
        </Container>
      </div>
      <CTAFooter cta={navigation.footerCta} trustLine={navigation.trustLine} />
    </footer>
  );
}
