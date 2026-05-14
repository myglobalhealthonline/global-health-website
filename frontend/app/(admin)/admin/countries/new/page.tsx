import Link from "next/link";
import { redirect } from "next/navigation";
import { CountryFields } from "../_components/country-fields";
import {
  parseDomainsFromForm,
  parseSupportedLocales,
} from "@/lib/admin/country-form-parse";
import { fetchAdminCurrencies, postAdminCountry } from "@/lib/admin/admin-api";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminNewCountryPage({ searchParams }: PageProps) {
  const messages = searchParams ? await searchParams : {};
  const currenciesResult = await fetchAdminCurrencies();

  if (!currenciesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="New country"
          actions={
            <Btn href="/admin/countries" variant="ghost" size="md">
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
      ...(domains ? { domains } : {}),
    };

    const result = await postAdminCountry(body);
    if (!result.ok) {
      redirect(`/admin/countries/new?error=${encodeURIComponent(result.message)}`);
    }

    redirect(
      `/admin/countries/${result.data.country.id}?success=${encodeURIComponent("Country created")}`,
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="New country"
        description="Hero copy, currency, languages, and URL routes."
        actions={
          <Btn href="/admin/countries" variant="ghost" size="md">
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
        <form action={createCountryAction} className="flex flex-col gap-8">
          <CountryFields currencies={currenciesResult.data.currencies} />
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-6">
            <button type="submit" className="gh-btn gh-btn-primary">
              Create country
            </button>
            <Link
              href="/admin/countries"
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
