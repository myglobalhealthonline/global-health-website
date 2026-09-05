import {
  PageHeaderSkeleton,
  SummaryStripSkeleton,
  TableSkeleton,
} from "@/components/portal-skeletons";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

/**
 * One loading boundary for the whole corporate route group — dashboard,
 * employees, employees/[id], requests and settings all start with a page
 * header, so a single skeleton at the group root covers them without a
 * `loading.tsx` per page.
 *
 * Geometry follows the shared portal kit (a header, then the dashboard's
 * summary strip / the two tables), so the swap to real content doesn't jump.
 *
 * The announcement is a real text node inside the live region, not an
 * `aria-label` on it: a `role="status"` region is announced by its CONTENTS,
 * and every child here is `aria-hidden` (the shimmer bars carry no text, and
 * `TableSkeleton` renders a real table that would otherwise read as a grid of
 * empty cells), so a label alone would announce nothing at all. Marking the
 * skeletons here rather than in the shared primitives keeps every other
 * route's loading state exactly as it is.
 */
export default async function CorporateLoading() {
  const locale = await getPortalLocale();
  const { corporate: t } = loadLocaleBundle(locale);

  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{t.common.loadingAriaLabel}</span>
      <div className="grid gap-6" aria-hidden>
        <PageHeaderSkeleton />
        <SummaryStripSkeleton items={3} />
        <TableSkeleton rows={6} columns={5} />
      </div>
    </div>
  );
}
