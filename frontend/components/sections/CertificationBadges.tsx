import { ArrowUpRight, BadgeCheck } from "lucide-react";
import type { CountryTrust } from "@/lib/content/get-country-trust";
import { GH2SectionHeader } from "./GH2PagePrimitives";

/**
 * "Certifications & regulatory badges" — a polished, per-country trust band.
 * Credential cards built from the country's authority links (IMC / OM / ERS /
 * DPC / CNPD …), each a real body with a "Verify" link to its official register
 * — not a logo dump. For GDPR-region countries it also shows the GDPR + the
 * cross-border EU-telemedicine accreditation. Self-hides when there's nothing.
 */
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

type Cert = { monogram: string; category: string; name: string; url: string | null; eu?: boolean };

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

export function CertificationBadges({
  trust,
  countryName,
}: {
  trust: CountryTrust | null;
  countryName: string;
}) {
  const links = trust?.authorityLinks ?? [];

  const certs: Cert[] = links
    .filter((l) => CERT_CATEGORIES.has(l.category))
    .slice(0, 6)
    .map((l) => ({
      monogram: l.abbreviation ?? (l.category === "DATA_PROTECTION" ? "GDPR" : initials(l.name)),
      category: CATEGORY_LABEL[l.category] ?? "Accredited",
      name: l.name,
      url: l.url,
    }));

  // Bundled badges only for GDPR-region (EU/EEA) markets — never claim EU/GDPR
  // for e.g. Brazil (LGPD). dataProtectionLawName is the per-country signal.
  if (trust && (trust.dataProtectionLawName ?? "GDPR").toUpperCase() === "GDPR") {
    if (!links.some((l) => l.category === "DATA_PROTECTION")) {
      certs.push({ monogram: "GDPR", category: "Data protection", name: "GDPR-compliant", url: null });
    }
    certs.push({
      monogram: "EU",
      category: "Accreditation",
      name: "EU-registered telemedicine provider",
      url: "https://european-union.europa.eu/principles-countries-history/symbols/european-flag_en",
      eu: true,
    });
  }

  if (certs.length === 0) return null;

  return (
    <section
      aria-label="Certifications and regulatory badges"
      style={{
        background: "var(--color-background-soft)",
        borderTop: "1px solid rgba(29,75,54,0.10)",
        padding: "clamp(56px,7vw,96px) 0",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <GH2SectionHeader
          index="07"
          eyebrow={`Regulation & compliance · ${countryName}`}
          headline="Certified, and"
          accent="independently verifiable"
          body="Every badge is a real body that governs care in your country — click through to its official register and check us yourself."
        />
        <ul className="mt-11 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6 md:gap-4">
          {certs.map((c, i) => (
            <li key={`${c.monogram}-${i}`}>
              <CertCard cert={c} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CertCard({ cert }: { cert: Cert }) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <span
          className="inline-flex h-10 min-w-10 items-center justify-center rounded-[10px] px-2 text-sm font-extrabold tracking-[-0.02em]"
          style={
            cert.eu
              ? { background: "#003399", color: "#FFCC00" }
              : { background: "var(--color-brand-primary)", color: "#fff" }
          }
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
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--color-brand-primary)" }}>
          Verify
          <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </span>
      ) : null}
    </>
  );

  const className =
    "group flex h-full flex-col rounded-[var(--radius-tile)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)] transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-[color:rgba(29,75,54,0.28)] md:p-5";

  if (!cert.url) return <div className={className}>{body}</div>;
  return (
    <a href={cert.url} target="_blank" rel="noopener noreferrer" className={className} title={`Verify · ${cert.name}`}>
      {body}
    </a>
  );
}
