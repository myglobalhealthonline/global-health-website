import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CountryFields } from "../../_components/country-fields";
import {
  parseBookingSettingFromForm,
  parseDomainsFromForm,
  parseSupportedLocales,
} from "@/lib/admin/country-form-parse";
import {
  fetchAdminCurrencies,
  fetchAdminCountryById,
  patchAdminCountry,
} from "@/lib/admin/admin-api";
import { AdminCard, Btn, PageHeader } from "../../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminEditCountryPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const [countryResult, currenciesResult] = await Promise.all([
    fetchAdminCountryById(id),
    fetchAdminCurrencies(),
  ]);

  if (!currenciesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="Edit country"
          actions={
            <Btn href={`/admin/countries/${id}`} variant="ghost" size="md" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load currencies: {currenciesResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  if (!countryResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="Edit country"
          actions={
            <Btn href={`/admin/countries/${id}`} variant="ghost" size="md" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load country: {countryResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const country = countryResult.data.country;

  async function updateCountryAction(formData: FormData) {
    "use server";

    const supportedLocales = parseSupportedLocales(formData);
    // Country edit form has no domain inputs (per-country domain split
    // was deferred). Parse only if the form actually carried domain
    // values; otherwise OMIT the field so backend `if (body.domains !==
    // undefined)` leaves the existing domains untouched. Sending an
    // empty array here would deleteMany.
    const domainsPayload = parseDomainsFromForm(formData);
    const bookingSettingPayload = parseBookingSettingFromForm(formData);

    const body = {
      code: String(formData.get("code") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim(),
      legacyHomePath: String(formData.get("legacyHomePath") ?? "").trim(),
      teamPath: String(formData.get("teamPath") ?? "").trim(),
      generalConsultationPath: String(
        formData.get("generalConsultationPath") ?? "",
      ).trim(),
      specialistConsultationPath: String(
        formData.get("specialistConsultationPath") ?? "",
      ).trim(),
      defaultLocale: String(formData.get("defaultLocale") ?? "").trim(),
      supportedLocales,
      currencyId: String(formData.get("currencyId") ?? "").trim(),
      isActive: formData.get("isActive") === "on",
      ...(domainsPayload !== undefined ? { domains: domainsPayload } : {}),
      ...(bookingSettingPayload !== undefined ? { bookingSetting: bookingSettingPayload } : {}),
    };

    const result = await patchAdminCountry(id, body);
    if (!result.ok) {
      redirect(`/admin/countries/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }

    redirect(
      `/admin/countries/${id}?success=${encodeURIComponent("Country updated")}`,
    );
  }

  return (
    <>
      <Link
        href={`/admin/countries/${id}`}
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to {country.name}
      </Link>
      <PageHeader
        eyebrow="Global"
        title={`Edit ${country.name}`}
        description="Identifiers, hero copy, currency, languages, and routes."
        actions={
          <Btn href={`/admin/countries/${id}`} variant="ghost" size="md">
            Cancel
          </Btn>
        }
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}

      <AdminCard>
        <form action={updateCountryAction} className="flex flex-col gap-8">
          <CountryFields
            currencies={currenciesResult.data.currencies}
            initial={country}
          />
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-6">
            <button type="submit" className="gh-btn gh-btn-primary">
              Save changes
            </button>
            <Link
              href={`/admin/countries/${id}`}
              className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </AdminCard>
    </>
  );
}
