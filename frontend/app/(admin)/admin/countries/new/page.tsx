import Link from "next/link";
import { redirect } from "next/navigation";
import { CountryFields } from "../_components/country-fields";
import { parseDomainsFromForm, parseSupportedLocales } from "@/lib/admin/country-form-parse";
import { fetchAdminCurrencies, postAdminCountry } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminNewCountryPage({ searchParams }: PageProps) {
  const messages = searchParams ? await searchParams : {};
  const currenciesResult = await fetchAdminCurrencies();

  if (!currenciesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New country</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load currencies: {currenciesResult.message}
        </p>
        <Link href="/admin/countries" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
          Back to countries
        </Link>
      </section>
    );
  }

  async function createCountryAction(formData: FormData) {
    "use server";

    const supportedLocales = parseSupportedLocales(formData);
    const domains = parseDomainsFromForm(formData);

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
      ...(domains ? { domains } : {}),
    };

    const result = await postAdminCountry(body);
    if (!result.ok) {
      redirect(`/admin/countries/new?error=${encodeURIComponent(result.message)}`);
    }

    redirect(`/admin/countries/${result.data.country.id}?success=${encodeURIComponent("Country created")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New country</h1>
        <Link href="/admin/countries" className="gh-link text-[var(--color-brand-primary)]">
          Back to list
        </Link>
      </div>

      {messages.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {messages.error}
        </p>
      ) : null}

      <form action={createCountryAction} className="mt-8 flex flex-col gap-8">
        <CountryFields currencies={currenciesResult.data.currencies} />
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">
            Create country
          </button>
        </div>
      </form>
    </section>
  );
}
