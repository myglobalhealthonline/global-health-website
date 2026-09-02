import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Send } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  fetchAdminCouponById,
  patchAdminCoupon,
  postAdminCouponSend,
  type AdminCouponRecipient,
  type AdminCouponRedemption,
} from "@/lib/admin/admin-api";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import {
  AdminCard,
  AdminEmptyState,
  Btn,
  PageHeader,
  Pill,
  StatCard,
} from "../../_components/atoms";
import { DateTimeField } from "../_components/datetime-field";
import { RecipientPicker } from "../_components/recipient-picker";

export const dynamic = "force-dynamic";

const dt = (value: string | null) =>
  value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(cents / 100);

const STATUS_TONE = {
  active: "published",
  scheduled: "info",
  expired: "draft",
  exhausted: "pending",
  disabled: "inactive",
} as const;

const RECIPIENT_TONE = { SENT: "published", PENDING: "draft", FAILED: "inactive" } as const;
const REDEMPTION_TONE = { CONSUMED: "published", RESERVED: "pending", RELEASED: "draft" } as const;

export default async function AdminCouponDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const result = await fetchAdminCouponById(id);
  if (!result.ok && result.status === 404) notFound();

  if (!result.ok) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Coupon" />
        <AdminCard>
          <AdminEmptyState title="Could not load this coupon" description={result.message} />
        </AdminCard>
      </>
    );
  }

  const coupon = result.data;

  async function updateAction(formData: FormData) {
    "use server";
    // ADMIN, not SUPER_ADMIN: this must match the backend gate, which is
    // `verifyGlobalAdminAccess` — every global admin, LOCAL_ADMIN denied. A
    // stricter check here only produced an /unauthorized redirect for people
    // the API would have accepted.
    await requireAdminAction();
    const patch: {
      active?: boolean;
      validFrom?: string;
      validUntil?: string;
      maxRedemptions?: number;
    } = {};

    const active = formData.get("active");
    if (active != null) patch.active = active === "true";

    // Both dates arrive as absolute instants from `DateTimeField`. A naive
    // wall-clock string would be resolved in the SERVER's zone here, which is
    // the bug that made freshly created coupons report "not valid yet".
    for (const [field, label] of [
      ["validFrom", "start date"],
      ["validUntil", "end date"],
    ] as const) {
      const raw = String(formData.get(field) ?? "").trim();
      if (!raw) continue;
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime()) || !/(?:Z|[+-]\d{2}:?\d{2})$/.test(raw)) {
        redirect(
          `/admin/coupons/${id}?error=${encodeURIComponent(`That ${label} is not valid.`)}`,
        );
      }
      patch[field] = parsed.toISOString();
    }

    const maxRedemptions = String(formData.get("maxRedemptions") ?? "").trim();
    if (maxRedemptions) {
      const parsed = Number(maxRedemptions);
      if (!Number.isInteger(parsed) || parsed < 1) {
        redirect(
          `/admin/coupons/${id}?error=${encodeURIComponent("The redemption limit must be a whole number of at least 1.")}`,
        );
      }
      patch.maxRedemptions = parsed;
    }

    const res = await patchAdminCoupon(id, patch);
    if (!res.ok) redirect(`/admin/coupons/${id}?error=${encodeURIComponent(res.message)}`);
    revalidatePath(`/admin/coupons/${id}`);
    revalidatePath("/admin/coupons");
    redirect(`/admin/coupons/${id}?success=${encodeURIComponent("Coupon updated")}`);
  }

  async function sendAction(formData: FormData) {
    "use server";
    // ADMIN, not SUPER_ADMIN: this must match the backend gate, which is
    // `verifyGlobalAdminAccess` — every global admin, LOCAL_ADMIN denied. A
    // stricter check here only produced an /unauthorized redirect for people
    // the API would have accepted.
    await requireAdminAction();
    const raw = String(formData.get("recipients") ?? "");
    const recipientId = String(formData.get("recipientId") ?? "").trim();

    // Two entry points share this action: the "send to more people" picker and
    // a single row's Resend button.
    const body = recipientId
      ? { recipientIds: [recipientId] }
      : { recipients: JSON.parse(raw || "[]") };

    if (!recipientId && (!Array.isArray(body.recipients) || body.recipients.length === 0)) {
      redirect(`/admin/coupons/${id}?error=${encodeURIComponent("Add at least one recipient.")}`);
    }

    const res = await postAdminCouponSend(id, body);
    if (!res.ok) redirect(`/admin/coupons/${id}?error=${encodeURIComponent(res.message)}`);
    revalidatePath(`/admin/coupons/${id}`);
    const note = res.data.queued
      ? "Sending in the background — refresh to see progress"
      : `${res.data.sent ?? 0} sent${(res.data.failed ?? 0) > 0 ? `, ${res.data.failed} failed` : ""}`;
    redirect(`/admin/coupons/${id}?success=${encodeURIComponent(note)}`);
  }

  const recipientFields: ColumnPriorityField<AdminCouponRecipient>[] = [
    {
      key: "email",
      label: "Recipient",
      priority: 1,
      cardPrimary: true,
      render: (r) => (
        <>
          <strong>{r.fullName || r.email}</strong>
          {r.fullName ? <small className="block text-[var(--portal-muted)]">{r.email}</small> : null}
        </>
      ),
    },
    { key: "locale", label: "Language", priority: 3, render: (r) => r.locale ?? "Auto" },
    {
      key: "status",
      label: "Status",
      priority: 1,
      render: (r) => <Pill tone={RECIPIENT_TONE[r.status]}>{r.status}</Pill>,
    },
    { key: "sentAt", label: "Sent", priority: 2, render: (r) => dt(r.sentAt) },
    {
      key: "error",
      label: "Error",
      priority: 4,
      render: (r) => (r.error ? <span className="text-[var(--portal-danger-text)]">{r.error}</span> : "—"),
    },
    {
      key: "resend",
      label: "",
      cardLabel: "Resend",
      priority: 1,
      align: "right",
      render: (r) => (
        <form action={sendAction}>
          <input type="hidden" name="recipientId" value={r.id} />
          <button className="gh-btn" type="submit">
            {r.status === "SENT" ? "Resend" : "Send"}
          </button>
        </form>
      ),
    },
  ];

  const redemptionFields: ColumnPriorityField<AdminCouponRedemption>[] = [
    {
      key: "order",
      label: "Order",
      priority: 1,
      cardPrimary: true,
      render: (r) =>
        r.order ? (
          <Link href={`/admin/orders/${r.order.id}`} className="font-semibold underline">
            {r.order.orderNumber ?? r.order.id.slice(0, 10)}
          </Link>
        ) : (
          "—"
        ),
    },
    { key: "email", label: "Email", priority: 2, render: (r) => r.email },
    {
      key: "discount",
      label: "Discount",
      priority: 1,
      align: "right",
      render: (r) => `${r.discountPercent}% · ${money(r.discountCents, r.currencyCode)}`,
    },
    {
      key: "status",
      label: "Status",
      priority: 1,
      render: (r) => <Pill tone={REDEMPTION_TONE[r.status]}>{r.status}</Pill>,
    },
    { key: "createdAt", label: "Claimed", priority: 3, render: (r) => dt(r.createdAt) },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title={coupon.code}
        description={
          coupon.kind === "PERSONAL"
            ? `Personal coupon — only ${coupon.personalEmail} can redeem it.`
            : "General coupon — anyone holding the code can redeem it."
        }
        actions={
          <Btn href="/admin/coupons" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
            Back
          </Btn>
        }
      />

      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.success}
        </p>
      ) : null}
      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Discount" value={`${coupon.discountPercent}%`} />
        <StatCard label="Used" value={`${coupon.redeemedCount} / ${coupon.maxRedemptions}`} />
        <StatCard label="Status" value={<Pill tone={STATUS_TONE[coupon.status]}>{coupon.status}</Pill>} />
      </div>

      <AdminCard className="mt-4">
        <h2 className="mb-4 text-[15px] font-bold text-[var(--color-text-primary)]">Settings</h2>
        <form action={updateAction} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <DateTimeField
              name="validFrom"
              label="Valid from"
              defaultIso={coupon.validFrom}
              hint="Your local time. Move it back if the coupon reports “not valid yet”."
            />
            <DateTimeField
              name="validUntil"
              label="Valid until"
              defaultIso={coupon.validUntil}
              hint="Your local time."
            />
            <label>
              <span className="gh-field-label">Redemption limit</span>
              <input
                className="gh-input"
                name="maxRedemptions"
                type="number"
                min={coupon.redeemedCount || 1}
                step={1}
                defaultValue={coupon.maxRedemptions}
              />
              <small className="mt-1 block text-[var(--color-text-muted)]">
                Cannot go below the {coupon.redeemedCount} already redeemed.
              </small>
            </label>
            <label>
              <span className="gh-field-label">Active</span>
              <select className="gh-select" name="active" defaultValue={String(coupon.active)}>
                <option value="true">Active</option>
                <option value="false">Disabled</option>
              </select>
              <small className="mt-1 block text-[var(--color-text-muted)]">
                Coupons are never deleted — disabling one stops new redemptions and leaves the
                history intact.
              </small>
            </label>
          </div>
          <p className="text-portal-meta text-[var(--color-text-muted)]">
            The code, kind and percentage cannot be changed once a coupon exists — that would
            rewrite what discounts already taken meant. Disable it and mint a new one instead. The
            validity window can move in either direction; that changes nothing about redemptions
            already taken.
          </p>
          <div className="flex justify-end">
            <button className="gh-btn gh-btn-primary" type="submit">
              Save changes
            </button>
          </div>
        </form>
      </AdminCard>

      <AdminCard className="mt-4">
        <h2 className="mb-4 text-[15px] font-bold text-[var(--color-text-primary)]">Send to more people</h2>
        <form action={sendAction} className="grid gap-4">
          <RecipientPicker
            label="Recipients"
            hint="Each person gets their own separate email. Outbound mail is capped at 100 per day."
          />
          <div className="flex justify-end">
            <button className="gh-btn gh-btn-primary" type="submit">
              <Send className="size-4" /> Send
            </button>
          </div>
        </form>
      </AdminCard>

      <AdminCard padding={0} className="mt-4 overflow-hidden">
        <h2 className="px-4 pt-4 text-[15px] font-bold text-[var(--color-text-primary)]">Recipients</h2>
        {coupon.recipients.length === 0 ? (
          <AdminEmptyState
            title="Nobody has been emailed yet"
            description="Add recipients above to send this code out."
          />
        ) : (
          <ColumnPriorityTable
            fields={recipientFields}
            rows={coupon.recipients}
            getRowKey={(r) => r.id}
            cardTone={(r) => (r.status === "FAILED" ? "danger" : r.status === "SENT" ? "success" : "neutral")}
          />
        )}
      </AdminCard>

      <AdminCard padding={0} className="mt-4 overflow-hidden">
        <h2 className="px-4 pt-4 text-[15px] font-bold text-[var(--color-text-primary)]">Redemptions</h2>
        {coupon.redemptions.length === 0 ? (
          <AdminEmptyState
            title="Not redeemed yet"
            description="Bookings that use this code will appear here."
          />
        ) : (
          <ColumnPriorityTable
            fields={redemptionFields}
            rows={coupon.redemptions}
            getRowKey={(r) => r.id}
            cardTone={(r) => (r.status === "CONSUMED" ? "success" : "neutral")}
          />
        )}
      </AdminCard>

      {coupon.internalNote ? (
        <AdminCard className="mt-4">
          <h2 className="mb-2 text-[15px] font-bold text-[var(--color-text-primary)]">Internal note</h2>
          <p className="whitespace-pre-wrap text-portal-body">{coupon.internalNote}</p>
        </AdminCard>
      ) : null}
    </>
  );
}
