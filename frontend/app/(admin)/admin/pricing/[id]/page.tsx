import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { deleteAdminPricingPlan, fetchAdminPricingPlanById, purgeAdminPricingPlan } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

function formatMoney(cents: number, currency: string) {
  const code = currency.trim().toUpperCase() || "EUR";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${code} ${(cents / 100).toFixed(2)}`;
  }
}

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

  async function deletePricingAction() {
    "use server";

    const deleteResult = await purgeAdminPricingPlan(id);
    if (!deleteResult.ok) {
      redirect(`/admin/pricing/${id}?error=${encodeURIComponent(deleteResult.message)}`);
    }

    revalidatePath("/admin/pricing");
    redirect("/admin/pricing");
  }

  if (!result.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Pricing plan</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load plan: {result.message}
        </p>
        <Link href="/admin/pricing" className="mt-6 inline-block gh-link text-sm text-[var(--color-text-muted)]">
          Back to list
        </Link>
      </section>
    );
  }

  const p = result.data.plan;
  const isActive = p.isActive;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">{p.name}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Marketing pricing row — not a payment or Stripe record.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/admin/pricing/${id}/edit`} className="gh-btn gh-btn-primary">Edit</Link>
          <Link href="/admin/pricing" className="gh-link text-sm text-[var(--color-text-muted)]">Back to list</Link>
        </div>
      </div>

      {messages.error ? <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{messages.error}</p> : null}
      {messages.success ? <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">{messages.success}</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
          isActive
            ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)] border-[var(--color-status-success-border)]"
            : "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-border)]"
        }`}>
          {isActive ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
          {isActive ? "Active" : "Inactive"}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">Inactive plans are omitted from the public pricing API.</span>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Slug</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{p.slug}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Country</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">
            {p.country.name} ({p.country.code})
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Price</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">
            {formatMoney(p.priceCents, p.currencyCode)} ({p.interval})
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Description</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{p.description ?? "—"}</dd>
        </div>
      </dl>

      {isActive ? (
        <form action={deactivatePricingAction} className="mt-8 border-t border-[var(--color-border)] pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--color-text-muted)]">Deactivate hides this plan from the public pricing API.</p>
            <button type="submit" className="gh-btn gh-btn-danger shrink-0">Deactivate plan</button>
          </div>
        </form>
      ) : (
        <p className="mt-8 border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-text-muted)]">
          This plan is inactive. Re-enable from edit.
        </p>
      )}
      <form action={deletePricingAction} className="mt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">Permanent delete removes this pricing row from admin and public data.</p>
          <button type="submit" className="gh-btn gh-btn-danger shrink-0">Delete permanently</button>
        </div>
      </form>
    </section>
  );
}
