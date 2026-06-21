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

export const dynamic = "force-dynamic";

const STATUS_FILTERS = ["", "ACTIVE", "PAST_DUE", "CANCELED", "PAUSED", "INCOMPLETE"] as const;

function statusTone(status: string): PillTone {
  if (status === "ACTIVE") return "active";
  if (status === "PAST_DUE" || status === "INCOMPLETE") return "pending";
  if (status === "CANCELED") return "inactive";
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

      <div className="flex flex-col gap-6">
        <SubscriptionHealthPanel
          health={healthResult.ok ? healthResult.data : null}
          error={healthResult.ok ? undefined : healthResult.message}
        />

        {/* Perk-approval queue */}
        <AdminCard padding={0}>
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
              <p className="text-sm text-[var(--color-text-muted)]">No pending approvals.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {grantsResult.data.grants.map((g) => (
                  <li
                    key={g.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-4 py-2.5 text-sm"
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
        <AdminCard padding={0}>
          <SectionHeader
            title="Subscriptions"
            description="Active and historical subscriptions. Adjust credits writes through the authoritative counter (audited)."
            right={
              <form method="get" className="flex items-center gap-2">
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
              <p className="p-6 text-sm text-[var(--color-text-muted)]">No subscriptions match this filter.</p>
            ) : (
              <AdminTable>
                <Thead>
                  <Th>Subscriber</Th>
                  <Th>Plan</Th>
                  <Th>Status</Th>
                  <Th>Credits (GP / wellness)</Th>
                  <Th>Adjust credits</Th>
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
                      </Td>
                      <Td>
                        <form action={adjustCreditsAction} className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="subscriptionId" value={sub.id} />
                          <input type="hidden" name="requestId" value={randomUUID()} />
                          <select name="kind" className="gh-select" defaultValue="CONSULTATION" style={{ minWidth: 120 }}>
                            <option value="CONSULTATION">Consultation</option>
                            <option value="WELLNESS">Wellness</option>
                          </select>
                          <input
                            name="delta"
                            type="number"
                            className="gh-input"
                            style={{ width: 80 }}
                            placeholder="±"
                            required
                          />
                          <select name="reason" className="gh-select" defaultValue="ADJUSTMENT" style={{ minWidth: 120 }}>
                            <option value="ADJUSTMENT">Adjustment</option>
                            <option value="CLAWBACK">Clawback</option>
                          </select>
                          <ConfirmDeleteButton
                            message={`Adjust credits for ${sub.user.email}? This writes an audited ledger entry.`}
                            className="gh-btn gh-btn-secondary"
                            ariaLabel="Apply credit adjustment"
                            style={{ minHeight: 36, padding: "0 14px" }}
                          >
                            Apply
                          </ConfirmDeleteButton>
                        </form>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </AdminTable>
            )}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
