import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteAdminPricingPlan, fetchAdminPricingPlanById } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminPricingDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const result = await fetchAdminPricingPlanById(id);

  async function deactivatePricingAction() {
    "use server";

    const updateResult = await deleteAdminPricingPlan(id);
    if (!updateResult.ok) {
      redirect(`/admin/pricing/${id}?error=${encodeURIComponent(updateResult.message)}`);
    }

    revalidatePath("/admin/pricing");
    revalidatePath(`/admin/pricing/${id}`);
    redirect(`/admin/pricing/${id}?success=${encodeURIComponent("Pricing plan deactivated")}`);
  }

  if (!result.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Pricing plan</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load plan: {result.message}
        </p>
        <Link href="/admin/pricing" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
          Back to pricing
        </Link>
      </section>
    );
  }

  const p = result.data.plan;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">{p.name}</h1>
        <div className="flex flex-wrap gap-4">
          <Link href={`/admin/pricing/${id}/edit`} className="gh-btn gh-btn-primary">
            Edit
          </Link>
          <Link href="/admin/pricing" className="gh-link text-[var(--color-text-muted)]">
            Back to list
          </Link>
        </div>
      </div>

      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        Marketing pricing row — not a payment or Stripe record.
      </p>

      {messages.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {messages.error}
        </p>
      ) : null}
      {messages.success ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {messages.success}
        </p>
      ) : null}

      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        Status:{" "}
        <span className={p.isActive ? "text-emerald-700" : "text-amber-800"}>{p.isActive ? "Active" : "Inactive"}</span>
        {" — inactive plans are omitted from the public pricing API."}
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Slug</dt>
          <dd className="mt-1 font-mono text-sm text-[var(--color-text-primary)]">{p.slug}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Country</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">
            {p.country.name} ({p.country.code})
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Price</dt>
          <dd className="mt-1 font-mono text-sm text-[var(--color-text-primary)]">
            {p.priceCents} {p.currencyCode} ({p.interval})
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Description</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{p.description ?? "—"}</dd>
        </div>
      </dl>

      {p.isActive ? (
        <form action={deactivatePricingAction} className="mt-10 border-t border-[var(--color-border)] pt-8">
          <p className="text-sm text-[var(--color-text-muted)]">Deactivate hides this plan from the public pricing API.</p>
          <button type="submit" className="mt-4 gh-btn border border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100">
            Deactivate plan
          </button>
        </form>
      ) : (
        <p className="mt-10 border-t border-[var(--color-border)] pt-8 text-sm text-[var(--color-text-muted)]">
          Plan is inactive. Re-enable from edit.
        </p>
      )}
    </section>
  );
}
