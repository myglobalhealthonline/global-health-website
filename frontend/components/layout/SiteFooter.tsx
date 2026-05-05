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
    <footer className="border-border bg-muted/40 border-t">
      <CTAFooter cta={navigation.footerCta} trustLine={navigation.trustLine} />
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {navigation.footerColumns.map((column) => (
            <div key={column.heading}>
              <p className="text-foreground mb-4 font-semibold">{column.heading}</p>
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
                          className="text-muted-foreground hover:text-primary text-sm transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-muted-foreground hover:text-primary text-sm transition-colors"
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

        <div className="border-border mt-12 flex flex-col gap-4 border-t pt-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <a
            href={`mailto:${navigation.siteContactEmail}`}
            className="text-muted-foreground hover:text-primary font-medium transition-colors"
          >
            {navigation.siteContactEmail}
          </a>
        </div>
      </Container>
    </footer>
  );
}
