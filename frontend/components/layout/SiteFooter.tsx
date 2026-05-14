/**
 * Site footer.
 *
 * Mirrors `ui_kits/website/Sections.jsx Footer()`:
 *   • Forest-night background, 70% white text
 *   • 1.5fr / 4×1fr columns (mobile collapses to 2-col, then 1-col)
 *   • Mint "g" mark + Global Health wordmark + tagline + email
 *   • 4 link groups: Care · Clinics · Company · Legal
 *   • Bottom bar: copyright + EU-registered note, 10% white top border
 */

import Link from "next/link";
import { countries } from "@/data/countries";
import { countrySlug } from "@/lib/routing/country-slug";

const LINK_GROUPS = [
  {
    h: "Care",
    items: [
      { label: "General", href: "/book-online?type=general" },
      { label: "Specialist", href: "/book-online?type=specialist" },
      { label: "Prescriptions", href: "/online-prescription" },
      { label: "Home tests", href: "/home-health-tests" },
    ],
  },
  {
    h: "Clinics",
    // Populated dynamically from countries data below.
    items: [] as { label: string; href: string }[],
  },
  {
    h: "Company",
    items: [
      { label: "About", href: "/about" },
      { label: "Doctors", href: "/ireland-doctors" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    h: "Legal",
    items: [
      { label: "Privacy", href: "/privacy" },
      { label: "Cookies", href: "/cookies" },
      { label: "GDPR", href: "/privacy#gdpr" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

// Build clinics column from countries data.
LINK_GROUPS[1].items = countries.map((c) => ({
  label: c.name,
  href: `/${countrySlug(c.code)}`,
}));

export function SiteFooter({ siteName }: { siteName: string }) {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "var(--color-background-dark)",
        color: "rgba(255,255,255,0.70)",
        padding: "64px 0 28px",
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: 1320,
          padding: "0 clamp(20px, 4vw, 40px)",
        }}
      >
        <div className="gh-footer-grid grid gap-10">
          {/* Brand column */}
          <div>
            <div className="inline-flex items-center gap-2.5">
              <span
                className="inline-flex items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--color-accent)",
                  color: "var(--color-background-dark)",
                  fontFamily: "var(--font-display)",
                  fontSize: 17,
                  fontWeight: 800,
                }}
              >
                g
              </span>
              <span
                className="text-white"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 19,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                {siteName || "Global Health"}
              </span>
            </div>
            <p
              className="mt-4"
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                maxWidth: 320,
              }}
            >
              Medicine without borders. Online medical consultations with
              locally-registered doctors across Europe.
            </p>
            <p
              className="mt-4"
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.50)",
              }}
            >
              info@myglobalhealth.online
            </p>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.h}>
              <p
                className="m-0 uppercase text-white"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  marginBottom: 14,
                }}
              >
                {group.h}
              </p>
              <ul
                className="m-0 flex list-none flex-col gap-2.5 p-0"
              >
                {group.items.map((item) => (
                  <li key={item.label + item.href}>
                    <Link
                      href={item.href}
                      className="text-[rgba(255,255,255,0.70)] transition-colors hover:text-white"
                      style={{ fontSize: 14, textDecoration: "none" }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-wrap justify-between gap-3"
          style={{
            marginTop: 56,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.10)",
            fontSize: 12,
            color: "rgba(255,255,255,0.45)",
          }}
        >
          <span>© {year} {siteName || "Global Health"} · Medicine without borders</span>
          <span>EU-registered telemedicine provider · GDPR compliant</span>
        </div>
      </div>

      <style>{`
        .gh-footer-grid {
          grid-template-columns: 1.5fr repeat(4, 1fr);
        }
        @media (max-width: 900px) {
          .gh-footer-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .gh-footer-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </footer>
  );
}
