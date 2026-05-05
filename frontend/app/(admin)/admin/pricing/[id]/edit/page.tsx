import Link from "next/link";
import { redirect } from "next/navigation";
import { PricingFields } from "../../_components/pricing-fields";
import { parsePricingBodyFromForm } from "@/lib/admin/pricing-form-parse";
import {
  fetchAdminCountries,
  fetchAdminCurrencies,
  fetchAdminPricingPlanById,
  patchAdminPricingPlan,
} from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminEditPricingPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const [planResult, countriesResult, currenciesResult] = await Promise.all([
    fetchAdminPricingPlanById(id),
    fetchAdminCountries(),
    fetchAdminCurrencies(),
  ]);

  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit pricing plan</h1>
        <p className="mt-4 text-amber-900">Could not load countries: {countriesResult.message}</p>
      </section>
    );
  }

  if (!currenciesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit pricing plan</h1>
        <p className="mt-4 text-amber-900">Could not load currencies: {currenciesResult.message}</p>
      </section>
    );
  }

  if (!planResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit pricing plan</h1>
        <p className="mt-4 text-amber-900">Could not load plan: {planResult.message}</p>
        <Link href="/admin/pricing" className="mt-6 inline-block gh-link">
          Back to pricing
        </Link>
      </section>
    );
  }

  const plan = planResult.data.plan;
  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));
  const currencies = currenciesResult.data.currencies;

  async function updatePricingAction(formData: FormData) {
    "use server";

    const raw = parsePricingBodyFromForm(formData);
    const body = {
      slug: raw.slug,
      name: raw.name,
      description: raw.description.trim() === "" ? null : raw.description.trim(),
      priceCents: raw.priceCents ?? 0,
      currencyCode: raw.currencyCode,
      interval: raw.interval,
      isActive: raw.isActive,
    };

    const result = await patchAdminPricingPlan(id, body);
    if (!result.ok) {
      redirect(`/admin/pricing/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }

    redirect(`/admin/pricing/${id}?success=${encodeURIComponent("Pricing plan updated")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit pricing plan</h1>
        <Link href={`/admin/pricing/${id}`} className="gh-link text-[var(--color-brand-primary)]">
          Cancel
        </Link>
      </div>

      {messages.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {messages.error}
        </p>
      ) : null}

      <form action={updatePricingAction} className="mt-8 flex flex-col gap-8">
        <PricingFields countries={countries} currencies={currencies} initial={plan} countryLocked />
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">
            Save changes
          </button>
        </div>
      </form>
    </section>
  );
}
