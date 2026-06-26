import type { CountryPartnerCard } from "@/lib/content/get-country-collections";
import { GH2SectionHeader } from "./GH2PagePrimitives";

/**
 * "Partners & clients" — per-country partner / client logos on clean white
 * tiles, each with its relationship type (e.g. "Healthcare Partner",
 * "Diagnostic Partner", "Client"). Logos are admin-uploaded. Self-hides when
 * the country has no partners.
 */
export function PartnersClients({
  partners,
  countryName,
}: {
  partners: CountryPartnerCard[];
  countryName: string;
}) {
  if (!partners || partners.length === 0) return null;

  return (
    <section
      aria-label="Partners and clients"
      style={{
        background: "var(--color-background-page)",
        borderTop: "1px solid rgba(29,75,54,0.10)",
        padding: "clamp(56px,7vw,96px) 0",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <GH2SectionHeader
          index="08"
          eyebrow={`Our network · ${countryName}`}
          headline="Partners &"
          accent="clients"
          body="We work with established clinics, labs and pharmacies on the ground so your care connects to real local services."
        />
        <ul className="mt-11 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {partners.map((p) => (
            <li key={p.id}>
              <PartnerTile partner={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PartnerTile({ partner }: { partner: CountryPartnerCard }) {
  const inner = (
    <>
      <div className="flex h-14 items-center justify-center">
        {partner.logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={partner.logoSrc} alt={partner.name} className="max-h-12 w-auto max-w-[160px] object-contain" />
        ) : (
          <span
            className="text-center text-[clamp(0.95rem,1.2vw+0.4rem,1.2rem)] font-extrabold tracking-[-0.02em]"
            style={{ color: "var(--color-brand-primary)" }}
          >
            {partner.name}
          </span>
        )}
      </div>
      <span className="mt-3 line-clamp-1 text-center text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {partner.name}
      </span>
      {partner.type ? (
        <span
          className="mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ background: "rgba(176,241,34,0.18)", color: "var(--color-brand-primary)" }}
        >
          {partner.type}
        </span>
      ) : null}
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
    <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer" className={className} aria-label={partner.name} title={partner.name}>
      {inner}
    </a>
  );
}
