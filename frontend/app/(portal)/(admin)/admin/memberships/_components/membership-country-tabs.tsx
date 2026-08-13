import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Pill } from "../../_components/atoms";

export type CountryTab = {
  countryId: string;
  code: string;
  name: string;
  isPrimary: boolean;
  /** Benefit rows configuring this country, active or not. */
  benefitCount: number;
};

/**
 * The level editor's country strip (§26). Benefits are per country since phase
 * 7, so the editor needs to say *which* country's rules are on screen — without
 * it, rows from every country render in one undifferentiated list.
 *
 * Plain links over a `?country=` param rather than client state: the benefit
 * table, its service picker and the add form all have to be re-fetched per
 * country anyway, so there is nothing for client state to save.
 *
 * **An unconfigured tab is badged loudly**, because coverage without
 * configuration silently gives members nothing (§20) and a quiet empty tab reads
 * as "nothing to do here" rather than "this is broken".
 */
export function MembershipCountryTabs({
  tabs,
  activeCountryId,
  hrefFor,
}: {
  tabs: CountryTab[];
  activeCountryId: string;
  hrefFor: (countryId: string) => string;
}) {
  if (tabs.length <= 1) return null;

  return (
    <nav
      aria-label="Country"
      className="flex flex-wrap gap-2 border-b border-[var(--color-border)] px-6 pb-4"
    >
      {tabs.map((tab) => {
        const active = tab.countryId === activeCountryId;
        return (
          <Link
            key={tab.countryId}
            href={hrefFor(tab.countryId)}
            aria-current={active ? "page" : undefined}
            className={[
              "inline-flex items-center gap-2 rounded-[var(--radius-card-sm)] border px-3 py-2 text-portal-compact font-semibold transition-colors",
              active
                ? "border-[var(--color-brand)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
            ].join(" ")}
          >
            <span>{tab.name}</span>
            {tab.isPrimary ? <Pill tone="brand">Primary</Pill> : null}
            {tab.benefitCount === 0 ? (
              <span
                className="gh-status-warning inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                title="Not configured — members get no benefit here"
              >
                <AlertTriangle className="size-3" aria-hidden />
                Not configured
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
