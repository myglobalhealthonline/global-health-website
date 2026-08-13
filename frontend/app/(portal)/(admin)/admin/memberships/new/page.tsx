import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { createMembershipPlan } from "@/lib/admin/memberships-api";
import { parseMembershipPlanForm } from "@/lib/admin/membership-form-parse";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";
import { MembershipPlanFields } from "../_components/membership-plan-form";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<{ countryId?: string; error?: string }> };

export default async function AdminNewMembershipPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const countryId = sp.countryId?.trim();
  const createError = sp.error;

  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader eyebrow="Memberships" title="New programme" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load countries: {countriesResult.message}
          </p>
        </AdminCard>
      </>
    );
  }
  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  if (!countryId) {
    return (
      <>
        <PageHeader
          eyebrow="Memberships"
          title="New programme"
          description="Choose a country first — a membership programme belongs to exactly one."
          actions={
            <Btn href="/admin/memberships" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Country</span>
              <select name="countryId" className="gh-select min-w-[240px]" required defaultValue="">
                <option value="">Select…</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code.toUpperCase()})
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="gh-btn gh-btn-primary">
              Continue
            </button>
          </form>
        </AdminCard>
      </>
    );
  }

  async function createAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const qs = `countryId=${encodeURIComponent(countryId ?? "")}`;
    const parsed = parseMembershipPlanForm(formData, { includeCountry: true });
    if (!parsed.ok) {
      redirect(`/admin/memberships/new?${qs}&error=${encodeURIComponent(parsed.error)}`);
    }
    const result = await createMembershipPlan(parsed.data);
    if (!result.ok) {
      redirect(`/admin/memberships/new?${qs}&error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath("/admin/memberships");
    redirect(
      `/admin/memberships/${result.data.plan.id}?success=${encodeURIComponent(
        "Programme created with a Standard level. Add the benefits it gives members below.",
      )}`,
    );
  }

  return (
    <>
      <Link
        href="/admin/memberships"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to memberships
      </Link>
      <PageHeader
        eyebrow="Memberships"
        title="New programme"
        description="Name the partner programme and record who pays for it. A Standard level is created automatically — you'll add its benefits next."
        actions={
          <Btn href="/admin/memberships" variant="ghost">
            Cancel
          </Btn>
        }
      />
      {createError ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {createError}
        </p>
      ) : null}
      <AdminCard>
        <form action={createAction} className="flex flex-col gap-8">
          <MembershipPlanFields countries={countries} pinnedCountryId={countryId} />
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-border)] pt-6">
            <Link href="/admin/memberships" className="gh-btn gh-btn-ghost">
              Cancel
            </Link>
            <button type="submit" className="gh-btn gh-btn-primary">
              Create programme
            </button>
          </div>
        </form>
      </AdminCard>
    </>
  );
}
