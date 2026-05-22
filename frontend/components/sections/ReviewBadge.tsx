import { Star } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  fetchPublicReviewConfig,
  type ReviewConfig,
  type AggregateSnapshot,
} from "@/lib/api/reviews-config";

/**
 * Public review badge — light luxury version.
 * White/soft surface, amber stars, brand-primary rating, muted count.
 */
export async function ReviewBadge({
  countryName,
}: {
  countryName?: string;
}) {
  const res = await fetchPublicReviewConfig();
  const cfg: ReviewConfig | null = res.ok ? res.data : null;
  if (!cfg) return null;

  const providers = pickProvidersWithData(cfg);
  if (providers.length === 0) return null;

  const primary =
    cfg.primaryProvider && providers.find((p) => p.key === cfg.primaryProvider)
      ? providers.find((p) => p.key === cfg.primaryProvider)!
      : providers[0];

  return (
    <section
      aria-label="Patient reviews"
      style={{
        background: "var(--color-background-soft)",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        padding: "32px 0",
      }}
    >
      <div
        className="mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-6"
        style={{ maxWidth: 1320, padding: "0 clamp(20px, 4vw, 40px)" }}
      >
        {providers.map((p) => (
          <ProviderBlock key={p.key} provider={p} />
        ))}
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: countryName ? `Global Health · ${countryName}` : "Global Health",
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: primary.aggregate.rating.toFixed(2),
            reviewCount: primary.aggregate.count,
            bestRating: 5,
            worstRating: 1,
          },
        }}
      />

      {cfg.trustpilot.businessUnitId ? (
        <script
          async
          src="https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"
        />
      ) : null}
    </section>
  );
}

type ProviderEntry = {
  key: "TRUSTPILOT" | "GOOGLE" | "DOCTIFY";
  label: string;
  href: string | null;
  aggregate: AggregateSnapshot;
  trustpilotBusinessUnitId?: string;
  doctifyClinicId?: string;
};

function pickProvidersWithData(cfg: ReviewConfig): ProviderEntry[] {
  const out: ProviderEntry[] = [];
  if (cfg.trustpilot.aggregate) {
    out.push({
      key: "TRUSTPILOT",
      label: "Trustpilot",
      href: cfg.trustpilot.businessUnitId
        ? `https://www.trustpilot.com/review/${cfg.trustpilot.businessUnitId}`
        : null,
      aggregate: cfg.trustpilot.aggregate,
      trustpilotBusinessUnitId: cfg.trustpilot.businessUnitId ?? undefined,
    });
  }
  if (cfg.google.aggregate) {
    out.push({
      key: "GOOGLE",
      label: "Google",
      href: cfg.google.placeId
        ? `https://search.google.com/local/reviews?placeid=${cfg.google.placeId}`
        : null,
      aggregate: cfg.google.aggregate,
    });
  }
  if (cfg.doctify.aggregate) {
    out.push({
      key: "DOCTIFY",
      label: "Doctify",
      href: cfg.doctify.clinicId
        ? `https://www.doctify.com/uk/specialist/${cfg.doctify.clinicId}`
        : null,
      aggregate: cfg.doctify.aggregate,
      doctifyClinicId: cfg.doctify.clinicId ?? undefined,
    });
  }
  return out;
}

function ProviderBlock({ provider }: { provider: ProviderEntry }) {
  if (provider.key === "DOCTIFY" && provider.doctifyClinicId) {
    return (
      <div style={{ minWidth: 260 }}>
        <iframe
          title="Doctify reviews"
          src={`https://www.doctify.com/embed/clinic/${provider.doctifyClinicId}/widget`}
          style={{ width: 260, height: 88, border: "none", background: "transparent" }}
          loading="lazy"
        />
        <a
          href={provider.href ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            marginTop: 4,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-text-muted)",
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          {provider.aggregate.rating.toFixed(2)} · {provider.aggregate.count.toLocaleString()} Doctify reviews
        </a>
      </div>
    );
  }
  if (provider.key === "TRUSTPILOT" && provider.trustpilotBusinessUnitId) {
    return (
      <div
        className="trustpilot-widget"
        data-locale="en-US"
        data-template-id="5419b6ffb0d04a076446a9af"
        data-businessunit-id={provider.trustpilotBusinessUnitId}
        data-style-height="24px"
        data-style-width="100%"
        style={{ minWidth: 240, minHeight: 28 }}
      >
        <a
          href={provider.href ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", textDecoration: "none" }}
        >
          {provider.aggregate.rating.toFixed(2)} · {provider.aggregate.count.toLocaleString()} Trustpilot reviews
        </a>
      </div>
    );
  }
  return <StaticBadge provider={provider} />;
}

function StaticBadge({ provider }: { provider: ProviderEntry }) {
  const rounded = provider.aggregate.rating.toFixed(2);
  const inner = (
    <div className="inline-flex items-center gap-3">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={
              star <= Math.round(provider.aggregate.rating)
                ? "size-4 fill-amber-400 text-amber-400"
                : "size-4 fill-slate-200 text-slate-200"
            }
            aria-hidden
          />
        ))}
      </div>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 800,
          color: "var(--color-text-primary)",
          letterSpacing: "-0.02em",
        }}
      >
        {rounded}
      </span>
      <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>
        {provider.aggregate.count.toLocaleString()} reviews · {provider.label}
      </span>
    </div>
  );
  return provider.href ? (
    <a
      href={provider.href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none" }}
      aria-label={`${provider.aggregate.count} reviews on ${provider.label}, average ${rounded} out of 5`}
    >
      {inner}
    </a>
  ) : (
    inner
  );
}
