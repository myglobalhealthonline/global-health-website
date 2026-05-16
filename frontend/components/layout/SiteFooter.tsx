"use client";

/**
 * Public site footer. Country/lang aware via `usePathname()` — Care links
 * resolve to the active country/lang scope when the user is inside a country,
 * else they fall through to the entry gate at `/`.
 *
 * Deferred features (online prescriptions, home tests, partner clinics,
 * pricing plans, blog, careers, gift cards) are intentionally NOT linked
 * here — those routes don't exist yet and rendering not-found 200s would
 * mislead users. Re-add them as their pages ship.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { countries } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";
import { parseSitePath } from "@/lib/routing/path-rewrites";

export function SiteFooter({ siteName }: { siteName: string }) {
  const pathname = usePathname() || "/";
  const parsed = parseSitePath(pathname);
  const year = new Date().getFullYear();

  const careBase =
    parsed.country && parsed.lang ? `/${parsed.country}/${parsed.lang}` : null;
  const careLinks = [
    { label: "Book consultation", href: careBase ? `${careBase}/book-online` : "/" },
    { label: "General consultation", href: careBase ? `${careBase}/general-consultation` : "/" },
    { label: "Specialist consultation", href: careBase ? `${careBase}/specialist-consultation` : "/" },
    { label: "Our doctors", href: careBase ? `${careBase}/doctors` : "/" },
  ];

  const clinicsLinks = countries.map((c) => ({
    label: c.name,
    href: `/${COUNTRY_CODE_TO_SLUG[c.code]}`,
  }));

  const accountLinks = [
    { label: "Sign in", href: "/login" },
    { label: "Create account", href: "/register" },
    { label: "Forgot password?", href: "/forgot-password" },
    { label: "My account", href: "/account" },
  ];

  const groups = [
    { h: "Care", items: careLinks },
    { h: "Clinics", items: clinicsLinks },
    { h: "Account", items: accountLinks },
  ];

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
        style={{ maxWidth: 1320, padding: "0 clamp(20px, 4vw, 40px)" }}
      >
        <div className="gh-footer-grid grid gap-10">
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
              style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 320 }}
            >
              Medicine without borders. Online medical consultations with
              locally-registered doctors across Europe.
            </p>
            <p
              className="mt-4"
              style={{ fontSize: 13, color: "rgba(255,255,255,0.50)" }}
            >
              <a
                href="mailto:info@myglobalhealth.online"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                info@myglobalhealth.online
              </a>
            </p>
          </div>

          {groups.map((group) => (
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
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
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
          <span>
            © {year} {siteName || "Global Health"} · Medicine without borders
          </span>
          <span>EU-registered telemedicine provider · GDPR compliant</span>
        </div>
      </div>

      <style>{`
        .gh-footer-grid {
          grid-template-columns: 1.5fr repeat(3, 1fr);
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
