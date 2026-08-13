import { revalidatePath } from "next/cache";
import { IdCard, Plus } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { getActiveCountry } from "@/lib/admin/admin-scope";
import { deactivateMembershipPlan, fetchMembershipPlans } from "@/lib/admin/memberships-api";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, Btn, PageHeader } from "../_components/atoms";
import { MembershipPlansTable } from "./_components/membership-plans-table";

export const dynamic = "force-dynamic";

/**
 * Private membership plans — programme list for the country in the top-bar
 * picker (docs/plans/private-membership-plans-implementation.md §9). A plan
 * belongs to exactly one country (decision 9), so this page is country-scoped
 * the same way /admin/plans is.
 */
export default async function AdminMembershipsPage() {
  const countriesResult = await fetchAdminCountries();
  const countries = countriesResult.ok ? countriesResult.data.countries : [];
  const active = await getActiveCountry(countries);

  async function deactivatePlanAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    if (id) await deactivateMembershipPlan(id);
    revalidatePath("/admin/memberships");
  }

  if (!active) {
    return (
      <>
        <PageHeader
          eyebrow="Memberships"
          title="Private memberships"
          description="Pick a country in the top bar — membership programmes are configured per country."
        />
        <AdminCard>
          <p className="text-sm text-[var(--color-text-muted)]">
            Select a country from the picker above to manage its membership programmes.
          </p>
        </AdminCard>
      </>
    );
  }

  const newHref = `/admin/memberships/new?countryId=${encodeURIComponent(active.id)}`;
  const plansResult = await fetchMembershipPlans({
    countryId: active.id,
    includeInactive: "true",
  });
  const plans = plansResult.ok ? plansResult.data.plans : [];
  const activePlans = plans.filter((plan) => plan.isActive).length;
  const memberCount = plans.reduce((sum, plan) => sum + plan._count.enrollments, 0);

  return (
    <>
      <PageHeader
        eyebrow="Memberships"
        title="Private memberships"
        description={`Partner membership programmes for ${active.name}. Never shown on the public site — only the people you enroll can use them.`}
        actions={
          <Btn href={newHref} iconLeft={<Plus className="size-4" />}>
            New programme
          </Btn>
        }
      />

      {!plansResult.ok ? (
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load membership programmes: {plansResult.message}
          </p>
        </AdminCard>
      ) : plans.length === 0 ? (
        <AdminCard>
          <AdminEmptyState
            icon={<IdCard className="size-8" aria-hidden />}
            title={`No membership programmes yet for ${active.name}`}
            description="Create a programme to define its levels and what each one gives members — included consultations, a percentage off, or a fixed member price."
            action={
              <Btn href={newHref} variant="soft" size="sm">
                Create first programme
              </Btn>
            }
          />
        </AdminCard>
      ) : (
        <>
          <AdminSummaryStrip
            items={[
              {
                label: "Programmes",
                value: plans.length,
                hint: `${activePlans} active`,
                tone: "brand",
              },
              {
                label: "Levels",
                value: plans.reduce((sum, plan) => sum + plan._count.levels, 0),
                hint: "Tiers across all programmes",
                tone: "neutral",
              },
              {
                label: "Members",
                value: memberCount,
                hint: "Enrollments, all statuses",
                tone: "success",
              },
            ]}
          />
          <AdminCard padding={0} className="overflow-hidden">
            <MembershipPlansTable plans={plans} deactivatePlanAction={deactivatePlanAction} />
          </AdminCard>
        </>
      )}
    </>
  );
}
