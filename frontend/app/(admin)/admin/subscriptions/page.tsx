import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  fetchAdminPerkGrants,
  fetchAdminSubscriptions,
  fetchSubscriptionHealth,
  postAdminAdjustCredits,
  postApproveAdminPerkGrant,
  type CreditKind,
} from "@/lib/admin/plans-api";
import {
  AdminCard,
  AdminEmptyState,
  AdminSummaryStrip,
  AdminTable,
  PageHeader,
  Pill,
  SectionHeader,
  Td,
  Th,
  Thead,
  Tr,
  type PillTone,
} from "../_components/atoms";
import { ConfirmDeleteButton } from "../_components/confirm-delete-button";
import { SubscriptionHealthPanel } from "../_components/subscription-health-panel";
import { AdminSubscriberLedger } from "../_components/subscriber-ledger";
import { PortalMobileCard, type PortalMobileCardTone } from "@/components/PortalMobileCard";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = ["", "ACTIVE", "PAST_DUE", "CANCELED", "PAUSED", "INCOMPLETE"] as const;

function statusTone(status: string): PillTone {
  if (status === "ACTIVE") return "active";
  if (status === "PAST_DUE" || status === "INCOMPLETE") return "pending";
  if (status === "CANCELED") return "inactive";
  return "neutral";
}

function statusCardTone(status: string): PortalMobileCardTone {
  if (status === "ACTIVE") return "success";
  if (status === "PAST_DUE" || status === "INCOMPLETE") return "warning";
  if (status === "CANCELED") return "danger";
  return "neutral";
}

function balanceOf(balances: Array<{ kind: CreditKind; balance: number }>, kind: CreditKind): number {
  return balances.find((b) => b.kind === kind)?.balance ?? 0;
}

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

  async function approveGrantAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const grantId = String(formData.get("grantId") ?? "");
    if (grantId) await postApproveAdminPerkGrant(grantId);
    revalidatePath("/admin/subscriptions");
  }

  async function adjustCreditsAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const subscriptionId = String(formData.get("subscriptionId") ?? "");
    const body = {
      kind: String(formData.get("kind") ?? "CONSULTATION"),
      delta: Number(formData.get("delta") ?? 0),
      reason: String(formData.get("reason") ?? "ADJUSTMENT"),
      note: String(formData.get("note") ?? ""),
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
        <SubscriptionHealthPanel
          health={healthResult.ok ? healthResult.data : null}
          error={healthResult.ok ? undefined : healthResult.message}
        />

        {/* Perk-approval queue */}
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
              <AdminEmptyState
                assetSrc="/images/portal/generated/admin-content-management-accent.png"
                title="No pending perk approvals"
                description="Manual approval perks will appear here when subscribers meet the configured rule and require admin review."
              />
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

        {/* Subscriptions list */}
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
                assetSrc="/images/portal/generated/admin-content-management-accent.png"
                title="No subscriptions match this filter"
                description="Choose a different status filter to review active, paused, canceled, or incomplete subscriptions."
              />
            ) : (
              <>
              <div className="border-b border-[var(--color-border)] px-4 pt-4">
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
                  ]}
                />
              </div>
              <div className="gh-admin-plan-table-wrap gh-admin-deep-table-wrap overflow-x-auto">
              <AdminTable>
                <Thead>
                  <Th>Subscriber</Th>
                  <Th>Plan</Th>
                  <Th>Status</Th>
                  <Th>Credits (GP / wellness)</Th>
                </Thead>
                <tbody>
                  {subsResult.data.items.map((sub) => (
                    <Tr key={sub.id}>
                      <Td>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {sub.user.fullName ?? sub.user.email}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {sub.user.email} · {sub.countryCode.toUpperCase()}
                          </span>
                        </div>
                      </Td>
                      <Td>{sub.plan.name}</Td>
                      <Td>
                        <Pill tone={statusTone(sub.status)}>{sub.status}</Pill>
                        {sub.cancelAtPeriodEnd ? (
                          <span className="ml-1">
                            <Pill tone="draft">cancels</Pill>
                          </span>
                        ) : null}
                      </Td>
                      <Td>
                        {balanceOf(sub.balances, "CONSULTATION")} / {balanceOf(sub.balances, "WELLNESS")}
                        <AdminSubscriberLedger subscriptionId={sub.id} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </AdminTable>
              </div>
              <div className="gh-admin-mobile-list">
                {subscriptions.map((sub) => (
                  <PortalMobileCard
                    key={sub.id}
                    tone={statusCardTone(sub.status)}
                    title={sub.user.fullName ?? sub.user.email}
                    subtitle={`${sub.user.email} - ${sub.countryCode.toUpperCase()}`}
                    statusPill={<Pill tone={statusTone(sub.status)}>{sub.status}</Pill>}
                    meta={[
                      { label: "Plan", value: sub.plan.name },
                      {
                        label: "Balances",
                        value: `GP ${balanceOf(sub.balances, "CONSULTATION")} / wellness ${balanceOf(sub.balances, "WELLNESS")}`,
                      },
                      ...(sub.cancelAtPeriodEnd
                        ? [{ label: "Renewal", value: <Pill tone="draft">cancels at period end</Pill> }]
                        : []),
                    ]}
                  >
                    <AdminSubscriberLedger subscriptionId={sub.id} />
                  </PortalMobileCard>
                ))}
              </div>
              </>
            )}
          </div>
        </AdminCard>

        {/* Support override — manual balance adjustment. Hidden unless the caller
            holds the dedicated SUPER-scope permission (§4); the backend rejects
            the action regardless, but hiding keeps it out of normal admin flow. */}
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
                <form action={adjustCreditsAction} className="gh-admin-subscription-adjust-form flex flex-wrap items-end gap-3">
                  <input type="hidden" name="requestId" value={randomUUID()} />
                  <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                    <span>Subscriber</span>
                    <select name="subscriptionId" className="gh-select" required style={{ minWidth: 240 }}>
                      {subsResult.data.items.map((s) => (
                        <option key={s.id} value={s.id}>
                          {(s.user.fullName ?? s.user.email)} — {s.plan.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                    <span>Kind</span>
                    <select name="kind" className="gh-select" defaultValue="CONSULTATION" style={{ minWidth: 130 }}>
                      <option value="CONSULTATION">Consultation</option>
                      <option value="WELLNESS">Wellness</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                    <span>Delta</span>
                    <input name="delta" type="number" className="gh-input" style={{ width: 90 }} placeholder="±" required />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                    <span>Category</span>
                    <select name="reason" className="gh-select" defaultValue="ADJUSTMENT" style={{ minWidth: 130 }}>
                      <option value="ADJUSTMENT">Adjustment</option>
                      <option value="CLAWBACK">Clawback</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]" style={{ flex: "1 1 260px" }}>
                    <span>Reason (required, audited)</span>
                    <input
                      name="note"
                      type="text"
                      className="gh-input"
                      minLength={8}
                      maxLength={500}
                      required
                      placeholder="Why is this adjustment being made?"
                    />
                  </label>
                  <ConfirmDeleteButton
                    message="Apply this manual balance adjustment? It writes an audited ledger entry and cannot be silently undone."
                    className="gh-btn gh-btn-secondary"
                    ariaLabel="Apply credit adjustment"
                    style={{ minHeight: 36, padding: "0 14px" }}
                  >
                    Apply override
                  </ConfirmDeleteButton>
                </form>
              )}
            </div>
          </AdminCard>
        ) : null}
      </div>
    </>
  );
}
