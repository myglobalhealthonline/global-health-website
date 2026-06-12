import type { CountryPartnerCard } from "@/lib/content/get-country-collections";

/**
 * "Our partners" marquee — a continuously scrolling band of partner logos on
 * the country home page. Reuses the site marquee animation (.gh-marquee).
 * Logos sit in greyscale and colour-up on hover; each links to the partner's
 * site when set. Renders nothing when the country has no active partners.
 */
export function PartnersMarquee({
  partners,
  title = "Our partners",
}: {
  partners: CountryPartnerCard[];
  title?: string;
}) {
  if (!partners || partners.length === 0) return null;
  // Duplicate the list so the CSS marquee loops seamlessly.
  const items = [...partners, ...partners];

  return (
    <section
      aria-label={title}
      style={{
        background: "var(--color-background-soft)",
        borderTop: "1px solid rgba(29,75,54,0.10)",
        borderBottom: "1px solid rgba(29,75,54,0.10)",
        padding: "clamp(40px,5vw,64px) 0",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.22em]"
          style={{ color: "var(--color-brand-primary)" }}
        >
          {title}
        </p>
      </div>

      <div className="relative mt-7 overflow-hidden">
        {/* Edge fade masks */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 md:w-24"
          style={{ background: "linear-gradient(90deg, var(--color-background-soft) 0%, transparent 100%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 md:w-24"
          style={{ background: "linear-gradient(270deg, var(--color-background-soft) 0%, transparent 100%)" }}
        />

        <div className="gh-marquee">
          <ul className="gh-marquee-track flex shrink-0 items-center gap-12 whitespace-nowrap pr-12 md:gap-16 md:pr-16">
            {items.map((p, i) => (
              <li key={`${p.id}-${i}`} className="inline-flex shrink-0 items-center">
                <PartnerLogo partner={p} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function PartnerLogo({ partner }: { partner: CountryPartnerCard }) {
  const inner = partner.logoSrc ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={partner.logoSrc}
      alt={partner.name}
      className="h-9 w-auto object-contain opacity-70 grayscale transition-[opacity,filter] duration-300 hover:opacity-100 hover:grayscale-0 md:h-11"
      style={{ maxWidth: 180 }}
    />
  ) : (
    <span
      className="text-[clamp(1rem,1.4vw+0.5rem,1.4rem)] font-extrabold tracking-[-0.02em]"
      style={{ color: "rgba(29,75,54,0.55)" }}
    >
      {partner.name}
    </span>
  );

  if (!partner.websiteUrl) {
    return (
      <span className="inline-flex items-center" title={partner.name}>
        {inner}
      </span>
    );
  }
  return (
    <a
      href={partner.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center"
      aria-label={partner.name}
      title={partner.name}
    >
      {inner}
    </a>
  );
}
