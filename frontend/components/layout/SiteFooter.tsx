import Image from "next/image";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { CTAFooter } from "@/components/layout/CTAFooter";
import type { SiteNavigationData } from "@/data/navigation";

function isRealLogo(src?: string): boolean {
  if (!src) return false;
  if (src.includes("temp") || src.includes("placeholder")) return false;
  return true;
}

export function SiteFooter({
  siteName,
  navigation,
  brandLogo,
  footerDecorImage,
}: {
  siteName: string;
  navigation: SiteNavigationData;
  brandLogo?: { src: string; alt: string };
  /** Optional editorial visual for the primary footer CTA strip (e.g. footer-cta asset). */
  footerDecorImage?: { src: string; alt: string };
}) {
  const hasRealLogo = isRealLogo(brandLogo?.src);

  return (
    <footer className="mt-auto">
      <div className="border-t border-[var(--color-border)] bg-[var(--color-background-panel)]">
        <Container className="py-[var(--section-padding-y-sm)]">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr]">
            <div>
              {hasRealLogo ? (
                <Image
                  src={brandLogo!.src}
                  alt={brandLogo!.alt}
                  width={220}
                  height={54}
                  className="h-11 w-auto sm:h-12"
                />
              ) : (
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-primary)] text-white">
                    <Stethoscope className="size-5" aria-hidden />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-base font-bold leading-tight tracking-tight text-[var(--color-text-primary)]">
                      Global Health
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-brand-primary)]">
                      Online Clinic
                    </span>
                  </div>
                </div>
              )}
              <p className="gh-body mt-5 max-w-sm text-[var(--color-text-muted)]">
                Online medical consultations with licensed clinicians across Ireland, Portugal, Spain, Czechia, and Romania.
              </p>
              <a
                href={`mailto:${navigation.siteContactEmail}`}
                className="mt-5 inline-flex text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-brand-primary)]"
              >
                {navigation.siteContactEmail}
              </a>
            </div>

            {navigation.footerColumns.map((column) => (
              <div key={column.heading}>
                <p className="gh-heading-eyebrow mb-4 text-[var(--color-text-primary)]">
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

          <div className="mt-12 flex flex-col gap-3 border-t border-[var(--color-border)] pt-8 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[var(--color-text-muted)]">
              © {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
            <p className="text-[var(--color-text-muted)]">
              Global Health is a brand of Global Guest s.r.o
            </p>
          </div>
        </Container>
      </div>
      <CTAFooter cta={navigation.footerCta} trustLine={navigation.trustLine} decorImage={footerDecorImage} />
    </footer>
  );
}
