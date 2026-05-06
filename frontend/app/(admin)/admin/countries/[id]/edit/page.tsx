import Link from "next/link";
import { redirect } from "next/navigation";
import { CountryFields } from "../../_components/country-fields";
import { parseDomainsFromForm, parseSupportedLocales } from "@/lib/admin/country-form-parse";
import { fetchAdminCurrencies, fetchAdminCountryById, patchAdminCountry } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminEditCountryPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const [countryResult, currenciesResult] = await Promise.all([
    fetchAdminCountryById(id),
    fetchAdminCurrencies(),
  ]);

  if (!currenciesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit country</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load currencies: {currenciesResult.message}
        </p>
      </section>
    );
  }

  if (!countryResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit country</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load country: {countryResult.message}
        </p>
        <Link href="/admin/countries" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
          Back to countries
        </Link>
      </section>
    );
  }

  const country = countryResult.data.country;

  async function updateCountryAction(formData: FormData) {
    "use server";

    const supportedLocales = parseSupportedLocales(formData);
    const domainsPayload = parseDomainsFromForm(formData) ?? [];

    const body = {
      code: String(formData.get("code") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim(),
      legacyHomePath: String(formData.get("legacyHomePath") ?? "").trim(),
      teamPath: String(formData.get("teamPath") ?? "").trim(),
      generalConsultationPath: String(formData.get("generalConsultationPath") ?? "").trim(),
      specialistConsultationPath: String(formData.get("specialistConsultationPath") ?? "").trim(),
      defaultLocale: String(formData.get("defaultLocale") ?? "").trim(),
      supportedLocales,
      currencyId: String(formData.get("currencyId") ?? "").trim(),
      isActive: formData.get("isActive") === "on",
      domains: domainsPayload,
    };

    const result = await patchAdminCountry(id, body);
    if (!result.ok) {
      redirect(`/admin/countries/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }

    redirect(`/admin/countries/${id}?success=${encodeURIComponent("Country updated")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit country</h1>
        <Link href={`/admin/countries/${id}`} className="gh-link text-[var(--color-brand-primary)]">
          Cancel
        </Link>
      </div>

      {messages.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          {messages.error}
        </p>
      ) : null}

      <form action={updateCountryAction} className="mt-8 flex flex-col gap-8">
        <CountryFields currencies={currenciesResult.data.currencies} initial={country} />
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">
            Save changes
          </button>
        </div>
      </form>
    </section>
  );
}
