import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import {
  COUPON_SCOPE_LABELS,
  fetchAdminCoupons,
  type AdminCouponListItem,
} from "@/lib/admin/admin-api";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { ResponsiveFilterBar } from "@/components/ResponsiveFilterBar";
import {
  AdminCard,
  AdminEmptyState,
  AdminSummaryStrip,
  Btn,
  IconBtn,
  PageHeader,
  Pill,
} from "../_components/atoms";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const read = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const date = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));

const STATUS_TONE = {
  active: "published",
  scheduled: "info",
  expired: "draft",
  exhausted: "pending",
  disabled: "inactive",
} as const;

function CouponsTable({ coupons }: { coupons: AdminCouponListItem[] }) {
  const fields: ColumnPriorityField<AdminCouponListItem>[] = [
    {
      key: "code",
      label: "Code",
      priority: 1,
      cardPrimary: true,
      render: (c) => (
        <>
          <strong className="font-mono tracking-[0.08em]">{c.code}</strong>
          {c.personalEmail ? (
            <small className="block text-[var(--portal-muted)]">{c.personalEmail}</small>
          ) : null}
        </>
      ),
    },
    { key: "kind", label: "Kind", priority: 2, render: (c) => c.kind },
    {
      key: "scope",
      label: "Applies to",
      priority: 3,
      render: (c) => COUPON_SCOPE_LABELS[c.scope],
    },
    {
      key: "discount",
      label: "Discount",
      priority: 1,
      align: "right",
      render: (c) => `${c.discountPercent}%`,
    },
    {
      key: "window",
      label: "Valid",
      priority: 3,
      render: (c) => `${date(c.validFrom)} – ${date(c.validUntil)}`,
    },
    {
      key: "used",
      label: "Used",
      cardLabel: "Used",
      priority: 2,
      align: "right",
      // Counts reserved-but-unpaid orders too: the slot is claimed when the
      // order is created, the same way a time slot is held, and released again
      // if the booking is cancelled or never paid.
      render: (c) => `${c.redeemedCount} / ${c.maxRedemptions}`,
    },
    {
      key: "status",
      label: "Status",
      priority: 1,
      render: (c) => <Pill tone={STATUS_TONE[c.status]}>{c.status}</Pill>,
    },
    {
      key: "actions",
      label: "Actions",
      priority: 1,
      align: "right",
      desktopOnly: true,
      render: (c) => (
        <IconBtn href={`/admin/coupons/${c.id}`} ariaLabel={`Open ${c.code}`}>
          <Eye className="size-4" />
        </IconBtn>
      ),
    },
  ];

  return (
    <ColumnPriorityTable
      fields={fields}
      rows={coupons}
      getRowKey={(c) => c.id}
      cardTone={(c) => (c.status === "active" ? "success" : "neutral")}
      cardActions={(c) => (
        <IconBtn href={`/admin/coupons/${c.id}`} ariaLabel={`Open ${c.code}`}>
          <Eye className="size-4" />
        </IconBtn>
      )}
    />
  );
}

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};
  const filters = {
    q: read(sp.q),
    kind: read(sp.kind),
    status: read(sp.status),
    page: read(sp.page) ?? "1",
    pageSize: "25",
  };
  const result = await fetchAdminCoupons(filters);
  const coupons = result.ok ? result.data.items : [];
  const totalPages = result.ok ? Math.max(1, Math.ceil(result.data.total / result.data.pageSize)) : 1;
  const page = result.ok ? result.data.page : 1;

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Coupons"
        description="Percentage discount codes — personal ones locked to one address, general ones anyone can use."
        actions={
          <Btn href="/admin/coupons/new" iconLeft={<Plus className="size-4" />}>
            New coupon
          </Btn>
        }
      />

      {result.ok ? (
        <AdminSummaryStrip
          items={[
            { label: "Active", value: result.data.summary.active, tone: "success" },
            { label: "Redemptions", value: result.data.summary.redemptions },
            { label: "Expiring in 7 days", value: result.data.summary.expiring },
          ]}
        />
      ) : null}

      <AdminCard padding={16} className="mt-4">
        <form method="get" action="/admin/coupons">
          <ResponsiveFilterBar
            search={
              <label>
                <span className="gh-field-label">Search</span>
                <input
                  name="q"
                  className="gh-input"
                  defaultValue={filters.q}
                  placeholder="Code, email or note"
                />
              </label>
            }
          >
            <label>
              <span className="gh-field-label">Kind</span>
              <select name="kind" className="gh-select" defaultValue={filters.kind}>
                <option value="">All kinds</option>
                <option value="PERSONAL">Personal</option>
                <option value="GENERAL">General</option>
              </select>
            </label>
            <label>
              <span className="gh-field-label">Status</span>
              <select name="status" className="gh-select" defaultValue={filters.status}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="expired">Expired</option>
                <option value="exhausted">Fully redeemed</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
            <button className="gh-btn gh-btn-primary" type="submit">
              Filter
            </button>
          </ResponsiveFilterBar>
        </form>
      </AdminCard>

      <AdminCard padding={0} className="mt-4 overflow-hidden">
        {!result.ok ? (
          <AdminEmptyState title="Could not load coupons" description={result.message} />
        ) : coupons.length === 0 ? (
          <AdminEmptyState
            title="No coupons found"
            description="Create a coupon or clear the current filters."
            action={<Btn href="/admin/coupons/new">New coupon</Btn>}
          />
        ) : (
          <CouponsTable coupons={coupons} />
        )}
      </AdminCard>

      {totalPages > 1 ? (
        <nav className="gh-admin-careers-pagination" aria-label="Coupon pages">
          {page > 1 ? (
            <Link href={{ pathname: "/admin/coupons", query: { ...filters, page: String(page - 1) } }}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={{ pathname: "/admin/coupons", query: { ...filters, page: String(page + 1) } }}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
