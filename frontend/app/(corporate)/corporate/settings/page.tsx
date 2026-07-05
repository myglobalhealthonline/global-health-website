import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  fetchCorporateCompany,
  patchCorporateCompany,
} from "@/lib/corporate/corporate-api";
import {
  AdminCard,
  Btn,
  PageHeader,
  Pill,
  SectionHeader,
} from "@/components/portal-atoms";
import {
  companyStatusLabel,
  companyStatusTone,
  formatCents,
  formatDate,
} from "@/app/(admin)/admin/corporate/_lib";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

async function updateCompanyAction(formData: FormData) {
  "use server";
  const read = (key: string) => String(formData.get(key) ?? "").trim();
  const optional = (key: string) => {
    const value = read(key);
    return value || null;
  };
  const body = {
    name: read("name"),
    registrationNumber: optional("registrationNumber"),
    addressLine1: optional("addressLine1"),
    addressLine2: optional("addressLine2"),
    city: optional("city"),
    postalCode: optional("postalCode"),
    billingEmail: read("billingEmail"),
    contactName: read("contactName"),
    contactEmail: read("contactEmail"),
    contactPhone: optional("contactPhone"),
  };
  if (!body.name || !body.billingEmail || !body.contactName || !body.contactEmail) {
    redirect(
      `/corporate/settings?error=${encodeURIComponent(
        "Company name, billing email and contact details are required",
      )}`,
    );
  }
  const result = await patchCorporateCompany(body);
  if (!result.ok) {
    redirect(`/corporate/settings?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/corporate/settings");
  redirect(`/corporate/settings?success=${encodeURIComponent("Company details saved")}`);
}

export default async function CorporateSettingsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const result = await fetchCorporateCompany();

  if (!result.ok) {
    return (
      <>
        <PageHeader eyebrow="Company" title="Settings" />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{result.message}</p>
        </AdminCard>
      </>
    );
  }
  const company = result.data;

  return (
    <>
      <PageHeader
        eyebrow="Company"
        title="Company settings"
        description="Your company profile and billing contact. Plan, contract, and status are managed by MyGlobalHealth."
        actions={
          <Pill tone={companyStatusTone(company.status)}>{companyStatusLabel(company.status)}</Pill>
        }
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-md border px-4 py-3 text-sm">{sp.error}</p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-md border px-4 py-3 text-sm">{sp.success}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader title="Company details" />
          <form
            action={updateCompanyAction}
            className="border-t border-[var(--color-border)] px-5 py-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="gh-field-label">Company name *</span>
                <input name="name" required maxLength={240} defaultValue={company.name} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Registration number</span>
                <input
                  name="registrationNumber"
                  maxLength={120}
                  defaultValue={company.registrationNumber ?? ""}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Country</span>
                <input
                  value={company.countryCode.toUpperCase()}
                  readOnly
                  disabled
                  className="gh-input opacity-70"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="gh-field-label">Address line 1</span>
                <input
                  name="addressLine1"
                  maxLength={240}
                  defaultValue={company.addressLine1 ?? ""}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="gh-field-label">Address line 2</span>
                <input
                  name="addressLine2"
                  maxLength={240}
                  defaultValue={company.addressLine2 ?? ""}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">City</span>
                <input name="city" maxLength={120} defaultValue={company.city ?? ""} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Postal code</span>
                <input
                  name="postalCode"
                  maxLength={24}
                  defaultValue={company.postalCode ?? ""}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Billing email *</span>
                <input
                  name="billingEmail"
                  type="email"
                  required
                  maxLength={320}
                  defaultValue={company.billingEmail}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Contact name *</span>
                <input
                  name="contactName"
                  required
                  maxLength={240}
                  defaultValue={company.contactName}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Contact email *</span>
                <input
                  name="contactEmail"
                  type="email"
                  required
                  maxLength={320}
                  defaultValue={company.contactEmail}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Contact phone</span>
                <input
                  name="contactPhone"
                  maxLength={40}
                  defaultValue={company.contactPhone ?? ""}
                  className="gh-input"
                />
              </label>
            </div>
            <div className="mt-4">
              <Btn type="submit" variant="primary" size="sm">
                Save details
              </Btn>
            </div>
          </form>
        </AdminCard>

        <AdminCard padding={0} className="h-fit overflow-hidden">
          <SectionHeader title="Plan + contract" description="Managed by MyGlobalHealth." />
          <dl className="m-0 grid grid-cols-1 gap-y-3 px-5 py-4 text-sm">
            <div>
              <dt className="gh-field-label">Plan</dt>
              <dd className="m-0 mt-0.5 font-semibold text-[var(--color-text-primary)]">
                {company.plan.name}
              </dd>
            </div>
            <div>
              <dt className="gh-field-label">Price per employee</dt>
              <dd className="m-0 mt-0.5 text-[var(--color-text-primary)]">
                {formatCents(company.plan.annualPricePerEmployeeCents, company.plan.currencyCode)} /
                year
              </dd>
            </div>
            <div>
              <dt className="gh-field-label">Max beneficiaries per employee</dt>
              <dd className="m-0 mt-0.5 text-[var(--color-text-primary)]">
                {company.plan.maxBeneficiariesPerEmployee}
              </dd>
            </div>
            <div>
              <dt className="gh-field-label">Contract start</dt>
              <dd className="m-0 mt-0.5 text-[var(--color-text-primary)]">
                {formatDate(company.contractStartAt)}
              </dd>
            </div>
            <div>
              <dt className="gh-field-label">Contract end</dt>
              <dd className="m-0 mt-0.5 text-[var(--color-text-primary)]">
                {company.contractEndAt ? formatDate(company.contractEndAt) : "Open-ended"}
              </dd>
            </div>
            <div>
              <dt className="gh-field-label">Current annual total</dt>
              <dd className="m-0 mt-0.5 text-lg font-bold text-[var(--color-text-primary)]">
                {formatCents(company.billing.totalAnnualCents, company.billing.currencyCode)}
              </dd>
            </div>
          </dl>
        </AdminCard>
      </div>
    </>
  );
}
