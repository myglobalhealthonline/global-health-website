import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { fetchCorporatePlans, postCorporateCompany } from "@/lib/admin/admin-api/corporate";
import { AdminCard, Btn, PageHeader, SectionHeader } from "../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

async function createCompanyAction(formData: FormData) {
  "use server";
  await requireAdminAction();

  const optional = (field: string) => {
    const raw = String(formData.get(field) ?? "").trim();
    return raw === "" ? undefined : raw;
  };

  const body = {
    name: String(formData.get("name") ?? "").trim(),
    countryCode: String(formData.get("countryCode") ?? "").trim().toLowerCase(),
    billingEmail: String(formData.get("billingEmail") ?? "").trim(),
    contactName: String(formData.get("contactName") ?? "").trim(),
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
    contactPhone: optional("contactPhone"),
    registrationNumber: optional("registrationNumber"),
    addressLine1: optional("addressLine1"),
    addressLine2: optional("addressLine2"),
    city: optional("city"),
    postalCode: optional("postalCode"),
    planSlug: optional("planSlug") ?? "corporate-standard",
    contractEndAt: optional("contractEndAt"),
    adminEmail: optional("adminEmail"),
  };

  const result = await postCorporateCompany(body);
  if (!result.ok) {
    redirect(`/admin/corporate/new?error=${encodeURIComponent(result.message)}`);
  }

  revalidatePath("/admin/corporate");
  const params = new URLSearchParams({ success: "Company created" });
  if (result.data.adminInviteError) {
    params.set("error", `Admin invite failed: ${result.data.adminInviteError}`);
  }
  redirect(`/admin/corporate/${result.data.id}?${params.toString()}`);
}

export default async function AdminNewCorporateCompanyPage({ searchParams }: PageProps) {
  const messages = searchParams ? await searchParams : {};
  const [plansResult, countriesResult] = await Promise.all([
    fetchCorporatePlans(),
    fetchAdminCountries(),
  ]);

  const plans = plansResult.ok ? plansResult.data.plans : [];
  const countries = countriesResult.ok ? countriesResult.data.countries : [];

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="New corporate company"
        description="Onboard a company onto the corporate plan. Employees are invited afterwards from the company page."
        actions={
          <Btn href="/admin/corporate" variant="ghost" size="md" iconLeft={<ArrowLeft className="size-3.5" aria-hidden />}>
            Back
          </Btn>
        }
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}
      {!countriesResult.ok ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          Could not load countries: {countriesResult.message}
        </p>
      ) : null}
      {!plansResult.ok ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          Could not load corporate plans: {plansResult.message}
        </p>
      ) : null}

      <AdminCard padding={0} className="overflow-hidden">
        <form action={createCompanyAction}>
          <SectionHeader title="Company" description="Legal + contact details" />
          <div className="grid grid-cols-1 gap-4 border-t border-[var(--color-border)] px-5 py-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Company name *</span>
              <input type="text" name="name" required maxLength={240} className="gh-input" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Registration number</span>
              <input type="text" name="registrationNumber" maxLength={120} className="gh-input" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Country *</span>
              <select name="countryCode" required defaultValue="" className="gh-select">
                <option value="" disabled>
                  Select country…
                </option>
                {countries.map((c) => (
                  <option key={c.id} value={c.code.toLowerCase()}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Billing email *</span>
              <input type="email" name="billingEmail" required maxLength={320} className="gh-input" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Contact name *</span>
              <input type="text" name="contactName" required maxLength={240} className="gh-input" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Contact email *</span>
              <input type="email" name="contactEmail" required maxLength={320} className="gh-input" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Contact phone</span>
              <input type="tel" name="contactPhone" maxLength={40} className="gh-input" />
            </label>
          </div>

          <SectionHeader title="Address" description="Optional — used on invoices" />
          <div className="grid grid-cols-1 gap-4 border-t border-[var(--color-border)] px-5 py-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Address line 1</span>
              <input type="text" name="addressLine1" maxLength={240} className="gh-input" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Address line 2</span>
              <input type="text" name="addressLine2" maxLength={240} className="gh-input" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">City</span>
              <input type="text" name="city" maxLength={120} className="gh-input" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Postal code</span>
              <input type="text" name="postalCode" maxLength={24} className="gh-input" />
            </label>
          </div>

          <SectionHeader title="Plan & onboarding" description="Plan, pre-assessment GP, and portal access" />
          <div className="grid grid-cols-1 gap-4 border-t border-[var(--color-border)] px-5 py-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Corporate plan</span>
              <select name="planSlug" defaultValue="corporate-standard" className="gh-select">
                {plans.length === 0 ? (
                  <option value="corporate-standard">Corporate Standard</option>
                ) : (
                  plans.map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Contract end date</span>
              <input type="date" name="contractEndAt" className="gh-input" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Corporate-admin email</span>
              <input type="email" name="adminEmail" maxLength={320} className="gh-input" />
              <span className="text-portal-meta text-[var(--color-text-muted)]">
                Optional — sends a portal invite to this address immediately.
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-border)] px-5 py-5">
            <Link
              href="/admin/corporate"
              className="gh-btn gh-btn-ghost"
            >
              Cancel
            </Link>
            <Btn type="submit" variant="primary" size="md">
              Create company
            </Btn>
          </div>
        </form>
      </AdminCard>
    </>
  );
}
