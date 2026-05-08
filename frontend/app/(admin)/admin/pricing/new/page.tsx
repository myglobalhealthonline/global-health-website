import Link from "next/link";
import { redirect } from "next/navigation";
import { PricingFields } from "../_components/pricing-fields";
import { parsePricingBodyFromForm } from "@/lib/admin/pricing-form-parse";
import {
  fetchAdminCountries,
  fetchAdminCurrencies,
  postAdminPricingPlan,
} from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ countryId?: string; error?: string }>;
};

export default async function AdminNewPricingPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const createError = sp.error;
  const countryId = sp.countryId?.trim();

  const [countriesResult, currenciesResult] = await Promise.all([
    fetchAdminCountries(),
    fetchAdminCurrencies(),
  ]);

  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">New pricing plan</h1>
          <Link href="/admin/pricing" className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load countries: {countriesResult.message}
        </p>
      </section>
    );
  }

  if (!currenciesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">New pricing plan</h1>
          <Link href="/admin/pricing" className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load currencies: {currenciesResult.message}
        </p>
      </section>
    );
  }

  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  const currencies = currenciesResult.data.currencies;

  if (!countryId) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">New pricing plan</h1>
          <Link href="/admin/pricing" className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">Pick a country first (plans are unique per country + slug).</p>
        <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Country</span>
            <select name="countryId" className="gh-select min-w-[240px]" required defaultValue="">
              <option value="">Select…</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="gh-btn gh-btn-primary">
            Continue
          </button>
        </form>
        <Link href="/admin/pricing" className="mt-6 inline-block gh-link text-sm text-[var(--color-text-muted)]">
          Back to list
        </Link>
      </section>
    );
  }

  async function createPricingAction(formData: FormData) {
    "use server";

    const parsed = parsePricingBodyFromForm(formData);
    if (!parsed.ok) {
      redirect(`/admin/pricing/new?countryId=${encodeURIComponent(countryId ?? "")}&error=${encodeURIComponent(parsed.error)}`);
    }
    const raw = parsed.data;
    const body = {
      countryId: raw.countryId,
      slug: raw.slug,
      name: raw.name,
      description: raw.description.trim() === "" ? null : raw.description.trim(),
      priceCents: raw.priceCents ?? 0,
      currencyCode: raw.currencyCode,
      interval: raw.interval,
      isActive: raw.isActive,
    };

    const result = await postAdminPricingPlan(body);
    if (!result.ok) {
      redirect(`/admin/pricing/new?countryId=${encodeURIComponent(raw.countryId)}&error=${encodeURIComponent(result.message)}`);
    }

    redirect(`/admin/pricing/${result.data.plan.id}?success=${encodeURIComponent("Pricing plan created")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New pricing plan</h1>
        <Link href="/admin/pricing" className="gh-link text-sm text-[var(--color-text-muted)]">
          Cancel
        </Link>
      </div>

      {createError ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          {createError}
        </p>
      ) : null}

      <form action={createPricingAction} className="mt-8 flex flex-col gap-8">
        <PricingFields countries={countries} currencies={currencies} pinnedCountryId={countryId} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">
            Create plan
          </button>
          <Link href="/admin/pricing" className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
