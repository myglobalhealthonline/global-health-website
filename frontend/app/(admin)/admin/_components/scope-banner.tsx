import Link from "next/link";
import type { ActiveAdminCountry } from "@/lib/admin/admin-scope";
import { FlagBadge } from "./flag-badge";

/**
 * Small banner shown on country-scoped admin pages. Tells the admin whether
 * the page is filtered to a specific country (cookie scope) and provides a
 * link to clear the scope back to "All countries".
 *
 * If no country is active, renders a soft "Pick a country" prompt instead so
 * admins know why a country-section page is empty.
 */
export function ScopeBanner({
  activeCountry,
  clearHref,
  emptyStateHref,
}: {
  activeCountry: ActiveAdminCountry;
  /** URL that strips countryId and any related query params, e.g. /admin/general-consultations */
  clearHref: string;
  /** Where to link to choose a country (defaults to the dashboard). */
  emptyStateHref?: string;
}) {
  if (activeCountry) {
    return (
      <div
        className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] px-4 py-3 text-[13px]"
        style={{
          background: "rgba(27,77,62,0.08)",
          border: "1px solid rgba(27,77,62,0.18)",
          color: "var(--color-text-primary)",
        }}
      >
        <span className="inline-flex items-center gap-2">
          <FlagBadge code={activeCountry.slug} size={14} />
          <span>
            <span className="font-bold">Scope:</span>{" "}
            <span className="font-semibold">{activeCountry.name}</span>{" "}
            <span className="text-[var(--color-text-muted)]">
              · only items for this country are shown
            </span>
          </span>
        </span>
        <Link
          href={clearHref}
          className="font-semibold text-[var(--color-brand-primary)] hover:underline"
        >
          Show all countries
        </Link>
      </div>
    );
  }
  return (
    <div
      className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] px-4 py-3 text-[13px]"
      style={{
        background: "var(--color-background-soft)",
        border: "1px dashed var(--color-border-strong)",
        color: "var(--color-text-muted)",
      }}
    >
      <span>
        <span className="font-semibold text-[var(--color-text-primary)]">
          No country selected
        </span>{" "}
        · pick a country in the top-right to scope this page.
      </span>
      <Link
        href={emptyStateHref ?? "/admin"}
        className="font-semibold text-[var(--color-brand-primary)] hover:underline"
      >
        Pick a country
      </Link>
    </div>
  );
}
