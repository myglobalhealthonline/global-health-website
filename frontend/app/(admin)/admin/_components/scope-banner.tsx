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
      <div className="gh-admin-scope-banner gh-admin-scope-banner--active mb-5">
        <span className="inline-flex min-w-0 items-center gap-2">
          <FlagBadge code={activeCountry.slug} size={14} />
          <span className="min-w-0">
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
    <div className="gh-admin-scope-banner gh-admin-scope-banner--empty mb-5">
      <span className="min-w-0">
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
