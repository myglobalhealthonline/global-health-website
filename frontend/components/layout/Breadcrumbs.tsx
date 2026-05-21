import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
  /** Display label shown to the user. */
  label: string;
  /** Destination URL. Omit to render as the current (non-clickable) page. */
  href?: string;
};

/**
 * Site-wide breadcrumb trail used on deep pages under
 * `/[country]/[lang]/...`. The audit flagged that doctor profiles,
 * consultation pages, and the cart/checkout flow had no spatial cue —
 * a patient mid-flow on a doctor profile couldn't tell which country
 * they were in or how to step back. This component renders a single
 * row of links separated by chevrons, with the final item shown as
 * plain (non-link) text representing the current page.
 *
 * Renders nothing when given fewer than two items so consumers can
 * pass an unconditional list without worrying about visual noise on
 * shallow pages.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length < 2) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="bg-[var(--color-background-page)]"
    >
      <ol className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-1.5 px-4 py-3 text-[12px] text-[var(--color-text-muted)] sm:px-6 lg:px-8">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="inline-flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="font-medium text-[var(--color-text-muted)] underline-offset-4 hover:text-[var(--color-text-primary)] hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="font-semibold text-[var(--color-text-primary)]"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight className="size-3 text-[var(--color-text-muted)]" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
