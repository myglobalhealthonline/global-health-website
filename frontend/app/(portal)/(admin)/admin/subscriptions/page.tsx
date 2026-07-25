import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction, requireSuperAdminAction } from "@/lib/admin/require-admin-action";
import {
  fetchAdminPerkGrants,
  fetchAdminSubscriptions,
  fetchSubscriptionHealth,
  postAdminAdjustCredits,
  postAdminSubscriptionRefund,
  postAdminSubscriptionRegrant,
  postAdminSubscriptionResync,
  postApproveAdminPerkGrant,
  type CreditKind,
} from "@/lib/admin/plans-api";
import {
  AdminCard,
  AdminEmptyState,
  AdminSummaryStrip,
  PageHeader,
  Pill,
  SectionHeader,
} from "../_components/atoms";
import { CreditAdjustForm } from "../_components/credit-adjust-form";
import { SubscriptionHealthPanel } from "../_components/subscription-health-panel";
import { AdminSubscriptionsTable } from "./_components/admin-subscriptions-table";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = ["", "ACTIVE", "PAST_DUE", "CANCELED", "PAUSED", "INCOMPLETE"] as const;

function balanceOf(balances: Array<{ kind: CreditKind; balance: number }>, kind: CreditKind): number {
  return balances.find((b) => b.kind === kind)?.balance ?? 0;
}

/** Fat-finger guard: plan credits top out at 3/month (Premium tier), so a
 *  legitimate manual correction should never need to move a balance by more
 *  than this in one submission. Mirrored in credit-adjust-form.tsx for the
 *  client-side preview/disable — this is the authoritative server check. */
const MAX_ABS_DELTA = 100;

type PageProps = { searchParams?: Promise<{ status?: string; success?: string; error?: string }> };

export default async function AdminSubscriptionsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const status = sp.status && sp.status !== "" ? sp.status : undefined;

  const [healthResult, grantsResult, subsResult] = await Promise.all([
    fetchSubscriptionHealth(),
    fetchAdminPerkGrants("PENDING"),
    fetchAdminSubscriptions({ status, pageSize: "50" }),
  ]);
  const subscriptions = subsResult.ok ? subsResult.data.items : [];
  const activeSubscriptions = subscriptions.filter((sub) => sub.status === "ACTIVE").length;
  const pastDueSubscriptions = subscriptions.filter((sub) =>
    ["PAST_DUE", "INCOMPLETE"].includes(sub.status),
  ).length;
  const healthIssueCount = healthResult.ok
    ? healthResult.data.drift.length +
      healthResult.data.invariantAlerts.length +
      healthResult.data.priceSyncFailures.length
    : null;

  async function approveGrantAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const grantId = String(formData.get("grantId") ?? "");
    if (grantId) await postApproveAdminPerkGrant(grantId);
    revalidatePath("/admin/subscriptions");
  }

  async function resyncAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const subscriptionId = String(formData.get("subscriptionId") ?? "");
    if (!subscriptionId) return;
    const result = await postAdminSubscriptionResync(subscriptionId);
    revalidatePath("/admin/subscriptions");
    redirect(
      `/admin/subscriptions?${
        result.ok
          ? `success=${encodeURIComponent(
              result.data.outcome === "DRIFT"
                ? "Provider subscription not found — drift flagged."
                : "Subscription resynced from provider.",
            )}`
          : `error=${encodeURIComponent(result.message)}`
      }`,
    );
  }

  async function regrantAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const subscriptionId = String(formData.get("subscriptionId") ?? "");
    if (!subscriptionId) return;
    const result = await postAdminSubscriptionRegrant(subscriptionId);
    revalidatePath("/admin/subscriptions");
    redirect(
      `/admin/subscriptions?${
        result.ok
          ? `success=${encodeURIComponent("Period grant re-run (no-op if already granted).")}`
          : `error=${encodeURIComponent(result.message)}`
      }`,
    );
  }

  async function refundAction(formData: FormData) {
    "use server";
    // Money mutation — same SUPER_ADMIN bar as adjust-credits; the backend
    // independently enforces this too (defense in depth).
    await requireSuperAdminAction();
    const subscriptionId = String(formData.get("subscriptionId") ?? "");
    if (!subscriptionId) return;
    const result = await postAdminSubscriptionRefund(subscriptionId);
    revalidatePath("/admin/subscriptions");
    redirect(
      `/admin/subscriptions?${
        result.ok
          ? `success=${encodeURIComponent(
              `Refund issued. Clawed back ${result.data.consultationClawedBack} consultation / ${result.data.wellnessClawedBack} wellness credit(s).`,
            )}`
          : `error=${encodeURIComponent(result.message)}`
      }`,
    );
  }

  async function adjustCreditsAction(formData: FormData) {
    "use server";
    await requireSuperAdminAction();
    const subscriptionId = String(formData.get("subscriptionId") ?? "");
    const delta = Number(formData.get("delta") ?? 0);
    const note = String(formData.get("note") ?? "").trim();

    if (!Number.isInteger(delta) || delta === 0) {
      redirect(`/admin/subscriptions?error=${encodeURIComponent("Delta must be a non-zero whole number.")}`);
    }
    if (Math.abs(delta) > MAX_ABS_DELTA) {
      redirect(
        `/admin/subscriptions?error=${encodeURIComponent(`Delta cannot exceed ±${MAX_ABS_DELTA} in one adjustment.`)}`,
      );
    }
    if (note.length < 8) {
      redirect(`/admin/subscriptions?error=${encodeURIComponent("A reason of at least 8 characters is required.")}`);
    }

    const body = {
      kind: String(formData.get("kind") ?? "CONSULTATION"),
      delta,
      reason: String(formData.get("reason") ?? "ADJUSTMENT"),
      note,
      requestId: String(formData.get("requestId") ?? "") || randomUUID(),
    };
    const result = await postAdminAdjustCredits(subscriptionId, body);
    revalidatePath("/admin/subscriptions");
    redirect(
      `/admin/subscriptions?${result.ok ? `success=${encodeURIComponent(`Balance now ${result.data.balance}`)}` : `error=${encodeURIComponent(result.message)}`}`,
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Subscriptions"
        title="Subscriptions"
        description="Subscriber list, manual credit adjustments, the perk-approval queue, and billing health."
      />

      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">{sp.success}</p>
      ) : null}
      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">{sp.error}</p>
      ) : null}

      <div className="gh-admin-subscriptions flex flex-col gap-6">
        {/* Page-level KPIs — the at-a-glance answer before any detail work.
            Health/perk counts link the admin down to the relevant panel. */}
        <AdminSummaryStrip
          items={[
            {
              label: "Subscribers shown",
              value: subscriptions.length,
              hint: status ?? "All statuses",
              tone: "brand",
            },
            {
              label: "Active",
              value: activeSubscriptions,
              hint: "Current page",
              tone: activeSubscriptions > 0 ? "success" : "neutral",
            },
            {
              label: "Needs billing attention",
              value: pastDueSubscriptions,
              hint: "Past due or incomplete",
              tone: pastDueSubscriptions > 0 ? "warning" : "success",
            },
            {
              label: "Pending perk approvals",
              value: grantsResult.ok ? grantsResult.data.grants.length : "—",
              hint: "Manual queue below",
              tone: grantsResult.ok && grantsResult.data.grants.length > 0 ? "warning" : "neutral",
            },
            {
              label: "Health issues",
              value: healthIssueCount ?? "—",
              hint: "Reconciliation panel below",
              tone: healthIssueCount && healthIssueCount > 0 ? "warning" : "success",
            },
          ]}
        />

        {/* Subscriptions list — the primary content, first card on the page. */}
        <AdminCard padding={0} className="gh-admin-subscription-list">
          <SectionHeader
            title="Subscriptions"
            description="Active and historical subscriptions. Adjust credits writes through the authoritative counter (audited)."
            right={
              <form method="get" className="gh-admin-subscription-filter flex items-center gap-2">
                <select name="status" className="gh-select" defaultValue={sp.status ?? ""}>
                  {STATUS_FILTERS.map((s) => (
                    <option key={s || "all"} value={s}>
                      {s === "" ? "All statuses" : s}
                    </option>
                  ))}
                </select>
                <button type="submit" className="gh-btn gh-btn-soft" style={{ minHeight: 36, padding: "0 14px" }}>
                  Filter
                </button>
              </form>
            }
          />
          <div className="p-0">
            {!subsResult.ok ? (
              <p className="gh-status-warning m-6 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
                Could not load subscriptions: {subsResult.message}
              </p>
            ) : subsResult.data.items.length === 0 ? (
              <AdminEmptyState
                assetSrc="/images/portal/obsidian/empty-payments.svg"
                title="No subscriptions match this filter"
                description="Choose a different status filter to review active, paused, canceled, or incomplete subscriptions."
              />
            ) : (
              <AdminSubscriptionsTable
                items={subsResult.data.items}
                canAdjustCredits={Boolean(subsResult.data.capabilities?.canAdjustCredits)}
                resyncAction={resyncAction}
                regrantAction={regrantAction}
                refundAction={refundAction}
              />
            )}
          </div>
        </AdminCard>

        {/* Support override — manual balance adjustment. SUPER_ADMIN-only
            (§4, money mutation); hidden entirely for plain ADMIN — the
            backend independently rejects the action regardless. */}
        {/* Perk-approval queue — secondary workflow, after the main list. */}
        <AdminCard padding={0} className="gh-admin-subscription-approvals">
          <SectionHeader
            title="Pending perk approvals"
            description="Per-subscriber manual-approval queue (§36.13). Approving unlocks the perk for that subscriber only."
          />
          <div className="p-6">
            {!grantsResult.ok ? (
              <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
                Could not load queue: {grantsResult.message}
              </p>
            ) : grantsResult.data.grants.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                No pending approvals. Manual-approval perks appear here when a subscriber meets the
                configured rule and needs admin review.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {grantsResult.data.grants.map((g) => (
                  <li
                    key={g.id}
                    className="gh-admin-subscription-approval-row flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-4 py-2.5 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone="pending">{g.perkKey}</Pill>
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {g.subscription.user.fullName ?? g.subscription.user.email}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {g.subscription.plan.name} · {g.subscription.paidMonthsCount} paid months
                      </span>
                    </div>
                    <form action={approveGrantAction}>
                      <input type="hidden" name="grantId" value={g.id} />
                      <button type="submit" className="gh-btn gh-btn-primary" style={{ minHeight: 36, padding: "0 14px" }}>
                        Approve
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AdminCard>

        {/* Reconciliation diagnostics — ops detail, lives below the workflows. */}
        <SubscriptionHealthPanel
          health={healthResult.ok ? healthResult.data : null}
          error={healthResult.ok ? undefined : healthResult.message}
        />

        {subsResult.ok && subsResult.data.capabilities?.canAdjustCredits ? (
          <AdminCard padding={0} className="gh-admin-subscription-override">
            <SectionHeader
              title="Support override — manual balance adjustment"
              description="Elevated SUPER-admin action. Directly edits one subscriber's earned consultation or wellness balance. Routine credits come from plan rules and renewals — use this only for verified finance/support cases. Every change is audited and requires a written reason."
            />
            <div className="p-6">
              {subsResult.data.items.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  No subscribers in the current view to adjust. Filter the list above first.
                </p>
              ) : (
                <CreditAdjustForm
                  action={adjustCreditsAction}
                  subscribers={subsResult.data.items.map((s) => ({
                    id: s.id,
                    label: `${s.user.fullName ?? s.user.email} — ${s.plan.name}`,
                    balances: {
                      consultation: balanceOf(s.balances, "CONSULTATION"),
                      wellness: balanceOf(s.balances, "WELLNESS"),
                    },
                  }))}
                />
              )}
            </div>
          </AdminCard>
        ) : null}
      </div>
    </>
  );
}
