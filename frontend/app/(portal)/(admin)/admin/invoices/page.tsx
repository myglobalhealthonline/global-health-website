import Link from "next/link";
import { Receipt } from "lucide-react";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { cookies } from "next/headers";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { formatPrice } from "@/lib/format-currency";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { getActiveCountry } from "@/lib/admin/admin-scope";
import { ScopeBanner } from "../_components/scope-banner";
import { InvoiceFilters, type InvoiceFilterValues } from "./_components/invoice-filters";
import {
  AdminInvoiceOrdersTable,
  type InvoiceOrderGroup,
} from "./_components/admin-invoice-orders-table";

export const dynamic = "force-dynamic";

/** Filter keys forwarded verbatim to the backend list endpoint. */
const FILTER_KEYS = [
  "q",
  "kind",
  "documentType",
  "countryCode",
  "month",
  "invoiceFrom",
  "invoiceTo",
  "consultFrom",
  "consultTo",
] as const;

/**
 * Sentinel meaning "ignore the country-picker cookie and show every country".
 * Without it an empty `countryCode` is indistinguishable from an absent one, so
 * "Show all countries" would silently fall back to the cookie scope.
 */
const ALL_COUNTRIES = "all";

/** Summary numbers computed by the backend over the whole filtered set. */
type InvoiceStats = {
  orderCount: number;
  documentCount: number;
  emailSentCount: number;
  totals: { currencyCode: string; totalCents: number }[];
  truncated: boolean;
};

const EMPTY_STATS: InvoiceStats = {
  orderCount: 0,
  documentCount: 0,
  emailSentCount: 0,
  totals: [],
  truncated: false,
};

async function fetchAdminInvoices(
  filters: InvoiceFilterValues,
  cursor?: string,
): Promise<{ orders: InvoiceOrderGroup[]; nextCursor: string | null; stats: InvoiceStats }> {
  const empty = { orders: [], nextCursor: null, stats: EMPTY_STATS };
  const backend = getBackendOrigin();
  if (!backend) return empty;
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const qs = new URLSearchParams({ limit: "50" });
  if (cursor) qs.set("cursor", cursor);
  for (const key of FILTER_KEYS) {
    const val = filters[key];
    if (val) qs.set(key, val);
  }
  try {
    const res = await fetch(`${backend}/api/admin/invoices?${qs.toString()}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    if (!res.ok) return empty;
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { orders: InvoiceOrderGroup[]; nextCursor: string | null; stats?: InvoiceStats };
    };
    if (!json.ok || !json.data) return empty;
    return { ...json.data, stats: json.data.stats ?? EMPTY_STATS };
  } catch {
    return empty;
  }
}

/** `2026-07` → `July 2026`. Rendered in UTC to match the backend's month window. */
function formatMonth(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  if (!year || !mon) return month;
  return new Date(Date.UTC(year, mon - 1, 1)).toLocaleDateString("en-IE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Human label for the period the stats cover — shown under "Orders". */
function periodLabel(filters: InvoiceFilterValues): string {
  if (filters.month) return formatMonth(filters.month);
  if (filters.invoiceFrom && filters.invoiceTo) {
    return `${filters.invoiceFrom} → ${filters.invoiceTo}`;
  }
  if (filters.invoiceFrom) return `since ${filters.invoiceFrom}`;
  if (filters.invoiceTo) return `until ${filters.invoiceTo}`;
  return "all time";
}

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<
    { cursor?: string } & Partial<Record<(typeof FILTER_KEYS)[number], string>>
  >;
}) {
  const sp = searchParams ? await searchParams : {};
  const { cursor } = sp;

  // Country scope: an explicit `?countryCode=` wins; `all` opts out entirely;
  // otherwise inherit the country picked in the topbar (cookie).
  const countriesResult = await fetchAdminCountries();
  const countries = countriesResult.ok ? countriesResult.data.countries : [];
  const activeCountry = await getActiveCountry(countries);
  const urlCountry = sp.countryCode?.trim().toLowerCase();
  const showAllCountries = urlCountry === ALL_COUNTRIES;
  const effectiveCountryCode = showAllCountries
    ? undefined
    : urlCountry || activeCountry?.code.toLowerCase();
  const scopedCountry = effectiveCountryCode
    ? countries.find((c) => c.code.toLowerCase() === effectiveCountryCode) ?? null
    : null;

  const filters: InvoiceFilterValues = {
    q: sp.q,
    kind: sp.kind,
    documentType: sp.documentType,
    countryCode: effectiveCountryCode,
    month: sp.month,
    invoiceFrom: sp.invoiceFrom,
    invoiceTo: sp.invoiceTo,
    consultFrom: sp.consultFrom,
    consultTo: sp.consultTo,
  };
  const { orders, nextCursor, stats } = await fetchAdminInvoices(filters, cursor);

  // Query string carrying the active filters (no cursor) so pagination keeps
  // them. The country is written out resolved, so paging never drifts scope.
  const filterQs = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const val = key === "countryCode" ? effectiveCountryCode ?? ALL_COUNTRIES : filters[key];
    if (val) filterQs.set(key, val);
  }
  const filterSuffix = filterQs.toString();
  const hasActiveFilter = Boolean(
    filters.q ||
      filters.kind ||
      filters.documentType ||
      filters.month ||
      filters.invoiceFrom ||
      filters.invoiceTo ||
      filters.consultFrom ||
      filters.consultTo ||
      effectiveCountryCode,
  );
  const firstPageHref = filterSuffix ? `/admin/invoices?${filterSuffix}` : "/admin/invoices";
  const nextPageHref = nextCursor
    ? `/admin/invoices?${filterSuffix ? `${filterSuffix}&` : ""}cursor=${encodeURIComponent(nextCursor)}`
    : null;

  // "Show all countries" keeps every other filter, only drops the scope.
  const clearScopeQs = new URLSearchParams(filterQs);
  clearScopeQs.set("countryCode", ALL_COUNTRIES);
  const clearScopeHref = `/admin/invoices?${clearScopeQs.toString()}`;

  const countryOptions = [
    { value: ALL_COUNTRIES, label: "All countries" },
    ...countries
      .filter((c) => c.isActive)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ value: c.code.toLowerCase(), label: c.name })),
  ];

  const [primaryTotal, ...otherTotals] = stats.totals;
  const scopeLabel = scopedCountry?.name ?? "All countries";
  const pendingCount = stats.documentCount - stats.emailSentCount;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Receipt className="size-3.5" aria-hidden /> Commerce
          </span>
        }
        title="Invoices & Receipts"
        description="Unpaid invoices (manual / AI bookings), receipts once paid, and combined invoice/receipts for direct-website orders. Portugal is excluded. Download the PDF or resend it to the patient."
      />

      {/* Reflects the EFFECTIVE scope, not the cookie — an explicit ?countryCode=
          in the URL overrides the topbar picker and the banner must say so. */}
      <ScopeBanner
        activeCountry={
          scopedCountry
            ? {
                id: scopedCountry.id,
                slug: scopedCountry.slug,
                code: scopedCountry.code,
                name: scopedCountry.name,
              }
            : null
        }
        clearHref={clearScopeHref}
      />

      <AdminCard padding={0}>
        <div className="border-b border-[var(--color-border)] px-4 pt-4">
          <AdminSummaryStrip
            items={[
              {
                label: "Orders",
                value: stats.orderCount,
                hint: `${stats.documentCount} documents · ${scopeLabel} · ${periodLabel(filters)}`,
                tone: "brand",
              },
              {
                label: "Email sent",
                value: stats.emailSentCount,
                hint: `${pendingCount} pending`,
                tone:
                  stats.emailSentCount === stats.documentCount && stats.documentCount > 0
                    ? "success"
                    : "neutral",
              },
              {
                label: "Total value",
                value: primaryTotal
                  ? formatPrice(primaryTotal.totalCents, primaryTotal.currencyCode)
                  : formatPrice(0, scopedCountry?.currency.code ?? "EUR"),
                hint: otherTotals.length
                  ? `${primaryTotal?.currencyCode} · +${otherTotals.length} more ${otherTotals.length === 1 ? "currency" : "currencies"}`
                  : (primaryTotal?.currencyCode ?? scopedCountry?.currency.code ?? "EUR"),
                tone: "neutral",
              },
            ]}
          />
          {stats.truncated ? (
            <p className="pb-3 pt-1 text-portal-micro text-[var(--color-text-muted)]">
              Totals cover the first 5,000 orders of this selection. Narrow the country or month
              for an exact figure.
            </p>
          ) : null}
        </div>

        <InvoiceFilters
          values={{ ...filters, countryCode: showAllCountries ? ALL_COUNTRIES : effectiveCountryCode }}
          countryOptions={countryOptions}
        />

        {orders.length === 0 ? (
          hasActiveFilter ? (
            <AdminEmptyState
              assetSrc="/images/portal/obsidian/empty-payments.svg"
              title="No matching invoices"
              description="No invoices match the current search or filters. Try widening the date range, clearing the country scope or consultation type, or checking the spelling of the search term."
            />
          ) : (
            <AdminEmptyState
              assetSrc="/images/portal/obsidian/empty-payments.svg"
              title="No invoices yet"
              description="Invoices are generated automatically after orders are paid. Once created, admins can open printable invoice records from here."
            />
          )
        ) : (
          <AdminInvoiceOrdersTable orders={orders} />
        )}

        <div className="gh-admin-ops-pagination flex items-center justify-between border-t border-[var(--color-border)] px-5 py-4 text-portal-compact">
          {cursor ? (
            <Link href={firstPageHref} className="font-semibold underline">
              ← First page
            </Link>
          ) : (
            <span />
          )}
          {nextPageHref ? (
            <Link href={nextPageHref} className="font-semibold underline">
              Next page →
            </Link>
          ) : (
            <span className="text-[var(--color-text-muted)]">No more invoices</span>
          )}
        </div>
      </AdminCard>
    </>
  );
}
