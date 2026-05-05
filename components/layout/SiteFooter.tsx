import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { CTAFooter } from "@/components/layout/CTAFooter";
import { footerColumns, siteContactEmail } from "@/data/navigation";
import { SITE_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-border bg-muted/40 border-t">
      <CTAFooter />
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.heading}>
              <p className="text-foreground mb-4 font-semibold">{column.heading}</p>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => {
                  const isMail = link.label === "Contact us" || link.href.startsWith("mailto:");
                  return (
                    <li key={link.label + link.href}>
                      {isMail ? (
                        <a href={`mailto:${siteContactEmail}`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className="text-muted-foreground hover:text-primary text-sm transition-colors">
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
          <p className="text-muted-foreground">© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
          <a href={`mailto:${siteContactEmail}`} className="text-muted-foreground hover:text-primary font-medium transition-colors">
            {siteContactEmail}
          </a>
        </div>
      </Container>
    </footer>
  );
}

