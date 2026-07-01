import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Plus } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { getActiveCountry } from "@/lib/admin/admin-scope";
import { deleteAdminPlan, fetchAdminPlans } from "@/lib/admin/plans-api";
import {
  AdminCard,
  AdminTable,
  Btn,
  PageHeader,
  Pill,
  Td,
  Th,
  Thead,
  Tr,
} from "../_components/atoms";
import { ConfirmDeleteButton } from "../_components/confirm-delete-button";

export const dynamic = "force-dynamic";

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

export default async function AdminPlansPage() {
  const countriesResult = await fetchAdminCountries();
  const countries = countriesResult.ok ? countriesResult.data.countries : [];
  const active = await getActiveCountry(countries);

  async function deactivatePlanAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    if (id) await deleteAdminPlan(id);
    revalidatePath("/admin/plans");
  }

  const newHref = active ? `/admin/plans/new?countryId=${encodeURIComponent(active.id)}` : "/admin/plans/new";

  if (!active) {
    return (
      <>
        <PageHeader
          className="gh-admin-area-hero gh-admin-area-plans"
          eyebrow="Subscriptions"
          title="Plans"
          description="Pick a country in the top bar — plans are configured per country."
        />
        <AdminCard>
          <p className="text-sm text-[var(--color-text-muted)]">
            Select a country from the picker above to manage its subscription plans.
          </p>
        </AdminCard>
      </>
    );
  }

  const plansResult = await fetchAdminPlans({ countryId: active.id, includeInactive: "true" });

  return (
    <>
      <PageHeader
        className="gh-admin-area-hero gh-admin-area-plans"
        eyebrow="Subscriptions"
        title="Plans"
        description={`Monthly subscription plans for ${active.name}. Create, configure, reorder, and deactivate.`}
        actions={
          <Btn href={newHref} iconLeft={<Plus className="size-4" />}>
            New plan
          </Btn>
        }
      />

      {!plansResult.ok ? (
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load plans: {plansResult.message}
          </p>
        </AdminCard>
      ) : plansResult.data.plans.length === 0 ? (
        <AdminCard>
          <p className="text-sm text-[var(--color-text-muted)]">
            No plans yet for {active.name}.{" "}
            <Link href={newHref} className="font-semibold text-[var(--color-brand-primary)]">
              Create the first one
            </Link>
            .
          </p>
        </AdminCard>
      ) : (
        <AdminCard padding={0} className="gh-admin-area-hero gh-admin-area-plans gh-admin-plan-list">
          <div className="gh-admin-area-hero gh-admin-area-plans gh-admin-plan-table-wrap overflow-x-auto">
          <AdminTable>
            <Thead>
              <Th>Plan</Th>
              <Th>Price / mo</Th>
              <Th>Credits (GP / wellness)</Th>
              <Th>What&apos;s set up</Th>
              <Th>Subscribers</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Thead>
            <tbody>
              {plansResult.data.plans.map((plan) => (
                <Tr key={plan.id}>
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {plan.name}
                        {plan.isFeatured ? (
                          <span className="ml-2 align-middle">
                            <Pill tone="brand">{plan.badgeLabel ?? "Featured"}</Pill>
                          </span>
                        ) : null}
                      </span>
                      <span className="font-mono text-xs text-[var(--color-text-muted)]">{plan.slug}</span>
                    </div>
                  </Td>
                  <Td>{formatMoney(plan.monthlyPriceCents, plan.currencyCode)}</Td>
                  <Td>
                    {plan.monthlyConsultationCredits} / {plan.wellnessCreditsPerMonth}
                  </Td>
                  <Td>
                    <span className="text-[13px] text-[var(--color-text-muted)]">
                      {plan._count.consultationRules} visits · {plan._count.perkRules} perks
                      {plan._count.healthTestRules > 0 ? ` · ${plan._count.healthTestRules} kits` : ""}
                    </span>
                  </Td>
                  <Td>{plan._count.subscriptions}</Td>
                  <Td>
                    {plan.isActive ? (
                      <Pill tone="active">Active</Pill>
                    ) : (
                      <Pill tone="inactive">Inactive</Pill>
                    )}
                  </Td>
                  <Td>
                    <div className="gh-admin-area-hero gh-admin-area-plans gh-admin-plan-row-actions flex items-center gap-3">
                      <Link
                        href={`/admin/plans/${plan.id}/edit`}
                        className="text-[13px] font-semibold text-[var(--color-brand-primary)] hover:underline"
                      >
                        Edit
                      </Link>
                      {plan.isActive ? (
                        <form action={deactivatePlanAction}>
                          <input type="hidden" name="id" value={plan.id} />
                          <ConfirmDeleteButton
                            message={`Deactivate "${plan.name}"? Existing subscribers keep their plan; it just hides from new signups.`}
                            className="text-[13px] font-semibold text-[var(--color-status-error-text)] hover:underline"
                          >
                            Deactivate
                          </ConfirmDeleteButton>
                        </form>
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </AdminTable>
          </div>
        </AdminCard>
      )}
    </>
  );
}
