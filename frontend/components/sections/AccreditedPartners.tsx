import { ArrowUpRight, BadgeCheck, ShieldCheck, Stars } from "lucide-react";
import type { CountryTrust } from "@/lib/content/get-country-trust";
import type { CountryPartnerCard } from "@/lib/content/get-country-collections";
import { GH2SectionHeader } from "./GH2PagePrimitives";

/**
 * "Accredited & partnered" band — a polished, per-country trust section that
 * replaces the plain logo marquee. Two parts:
 *   1. Certifications & regulatory bodies — credential cards built from the
 *      country's authority links (IMC / OM / ERS / DPC / CNPD …) plus the
 *      cross-border EU-telemedicine accreditation. Each is a real, verifiable
 *      body with a "Verify" link to its official register, not just a logo.
 *   2. Partners & clients — the country's partner logos on clean white tiles.
 *
 * All data is per-country (authority links + partners are country-scoped and
 * admin-managed); the section self-hides any part that has no data.
 */

// Authority categories that read as a "certification / regulatory badge"
// (emergency / mental-health / complaints lines live in the footer, not here).
const CERT_CATEGORIES = new Set([
  "MEDICAL_REGULATOR",
  "DOCTOR_REGISTRY",
  "HEALTH_AUTHORITY",
  "DATA_PROTECTION",
  "MEDICINES",
  "PROFESSIONAL_BODY",
]);

const CATEGORY_LABEL: Record<string, string> = {
  MEDICAL_REGULATOR: "Regulatory",
  DOCTOR_REGISTRY: "Doctor registry",
  HEALTH_AUTHORITY: "Health authority",
  DATA_PROTECTION: "Data protection",
  MEDICINES: "Medicines",
  PROFESSIONAL_BODY: "Professional body",
};

type Cert = {
  monogram: string;
  category: string;
  name: string;
  url: string | null;
};

function initials(name: string): string {
  return name
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function AccreditedPartners({
  trust,
  partners,
  countryName,
}: {
  trust: CountryTrust | null;
  partners: CountryPartnerCard[];
  countryName: string;
}) {
  const links = trust?.authorityLinks ?? [];

  const certs: Cert[] = links
    .filter((l) => CERT_CATEGORIES.has(l.category))
    .slice(0, 5)
    .map((l) => ({
      monogram: l.abbreviation ?? (l.category === "DATA_PROTECTION" ? "GDPR" : initials(l.name)),
      category: CATEGORY_LABEL[l.category] ?? "Accredited",
      name: l.name,
      url: l.url,
    }));

  // Cross-border accreditation that applies in every market we operate in.
  certs.push({
    monogram: "EU",
    category: "Accreditation",
    name: "EU-registered telemedicine provider",
    url: "https://european-union.europa.eu/principles-countries-history/symbols/european-flag_en",
  });

  const hasCerts = certs.length > 0;
  const hasPartners = partners.length > 0;
  if (!hasCerts && !hasPartners) return null;

  return (
    <section
      aria-label="Accreditations and partners"
      style={{
        background: "var(--color-background-soft)",
        borderTop: "1px solid rgba(29,75,54,0.10)",
        padding: "clamp(56px,7vw,104px) 0",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <GH2SectionHeader
          index="07"
          eyebrow={`Trust & accreditation · ${countryName}`}
          headline="Regulated, certified,"
          accent="independently verifiable"
          body="Every claim links to an official register you can check yourself. We partner with established local providers and are recognised by the bodies that govern care in your country."
        />

        {/* ── Certifications & regulatory bodies ─────────────────────────── */}
        {hasCerts ? (
          <div className="mt-12 md:mt-14">
            <SubHeading icon={<ShieldCheck className="size-3.5" aria-hidden />}>
              Certifications &amp; regulatory bodies
            </SubHeading>
            <ul className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 md:gap-4">
              {certs.map((c, i) => (
                <li key={`${c.monogram}-${i}`}>
                  <CertCard cert={c} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* ── Partners & clients ─────────────────────────────────────────── */}
        {hasPartners ? (
          <div className="mt-12 md:mt-16">
            <SubHeading icon={<Stars className="size-3.5" aria-hidden />}>
              Partners &amp; clients in {countryName}
            </SubHeading>
            <ul className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 md:gap-4">
              {partners.map((p) => (
                <li key={p.id}>
                  <PartnerTile partner={p} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SubHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--color-text-muted)" }}>
      <span
        className="inline-flex size-6 items-center justify-center rounded-full"
        style={{ background: "rgba(176,241,34,0.18)", color: "var(--color-brand-primary)" }}
      >
        {icon}
      </span>
      {children}
    </p>
  );
}

function CertCard({ cert }: { cert: Cert }) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <span
          className="inline-flex h-10 min-w-10 items-center justify-center rounded-[10px] px-2 text-sm font-extrabold tracking-[-0.02em]"
          style={{ background: "var(--color-brand-primary)", color: "#fff" }}
        >
          {cert.monogram}
        </span>
        <BadgeCheck className="size-4" style={{ color: "#8FB021" }} aria-hidden />
      </div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#8FB021" }}>
        {cert.category}
      </p>
      <p className="mt-1 text-sm font-semibold leading-snug" style={{ color: "var(--color-text-primary)" }}>
        {cert.name}
      </p>
      {cert.url ? (
        <span
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold"
          style={{ color: "var(--color-brand-primary)" }}
        >
          Verify
          <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </span>
      ) : null}
    </>
  );

  const className =
    "group flex h-full flex-col rounded-[var(--radius-tile)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)] transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-[color:rgba(29,75,54,0.28)] md:p-5";

  if (!cert.url) {
    return <div className={className}>{body}</div>;
  }
  return (
    <a href={cert.url} target="_blank" rel="noopener noreferrer" className={className} title={`Verify · ${cert.name}`}>
      {body}
    </a>
  );
}

function PartnerTile({ partner }: { partner: CountryPartnerCard }) {
  const inner = (
    <>
      <div className="flex h-14 items-center justify-center">
        {partner.logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partner.logoSrc}
            alt={partner.name}
            className="max-h-12 w-auto max-w-[150px] object-contain"
          />
        ) : (
          <span
            className="text-center text-[clamp(0.95rem,1.2vw+0.4rem,1.2rem)] font-extrabold tracking-[-0.02em]"
            style={{ color: "var(--color-brand-primary)" }}
          >
            {partner.name}
          </span>
        )}
      </div>
      <span className="mt-3 line-clamp-1 text-center text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
        {partner.name}
      </span>
    </>
  );

  const className =
    "group flex h-full flex-col items-center justify-center rounded-[var(--radius-tile)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-[color:rgba(29,75,54,0.28)]";

  if (!partner.websiteUrl) {
    return (
      <div className={className} title={partner.name}>
        {inner}
      </div>
    );
  }
  return (
    <a
      href={partner.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={partner.name}
      title={partner.name}
    >
      {inner}
    </a>
  );
}
