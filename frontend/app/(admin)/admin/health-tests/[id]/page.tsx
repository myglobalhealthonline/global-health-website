import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteAdminHealthTest, fetchAdminHealthTestById, purgeAdminHealthTest } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminHealthTestDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const result = await fetchAdminHealthTestById(id);

  if (!result.ok) {
    return <section className="gh-card p-6 sm:p-8"><h1 className="gh-h2 text-[var(--color-text-primary)]">Health test</h1><p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">Could not load health test: {result.message}</p></section>;
  }

  const test = result.data.healthTest;

  async function deactivateAction() {
    "use server";
    const updateResult = await deleteAdminHealthTest(id);
    if (!updateResult.ok) redirect(`/admin/health-tests/${id}?error=${encodeURIComponent(updateResult.message)}`);
    revalidatePath("/admin/health-tests");
    revalidatePath(`/admin/health-tests/${id}`);
    redirect(`/admin/health-tests/${id}?success=${encodeURIComponent("Health test deactivated")}`);
  }

  async function deleteAction() {
    "use server";
    const deleteResult = await purgeAdminHealthTest(id);
    if (!deleteResult.ok) redirect(`/admin/health-tests/${id}?error=${encodeURIComponent(deleteResult.message)}`);
    revalidatePath("/admin/health-tests");
    redirect("/admin/health-tests?success=Health%20test%20deleted");
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">{test.title}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{test.country.name} ({test.country.code})</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Dedicated health-test product page record.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/admin/health-tests/${id}/edit`} className="gh-btn gh-btn-primary">Edit</Link>
          <Link href="/admin/health-tests" className="gh-link text-sm text-[var(--color-text-muted)]">Back to list</Link>
        </div>
      </div>

      {messages.error ? <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{messages.error}</p> : null}
      {messages.success ? <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">{messages.success}</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={test.productImagePath} alt={test.title} className="h-auto w-full rounded-[var(--radius-card-sm)] object-contain" />
        </div>
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Slug</p><p className="mt-2 font-mono text-sm text-[var(--color-text-primary)]">{test.slug}</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Price</p><p className="mt-2 text-sm text-[var(--color-text-primary)]">{formatMoney(test.priceCents, test.currencyCode)}</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Sample type</p><p className="mt-2 text-sm text-[var(--color-text-primary)]">{test.sampleType ?? "—"}</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Results timeline</p><p className="mt-2 text-sm text-[var(--color-text-primary)]">{test.resultsTimeline ?? "—"}</p></div>
          </div>

          {test.shortDescription ? <div><h2 className="gh-h3 text-[var(--color-text-primary)]">Short description</h2><p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">{test.shortDescription}</p></div> : null}
          {test.detailIntro ? <div><h2 className="gh-h3 text-[var(--color-text-primary)]">Detail intro</h2><p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--color-text-muted)]">{test.detailIntro}</p></div> : null}
          {test.whatThisTestCovers.length > 0 ? <div><h2 className="gh-h3 text-[var(--color-text-primary)]">What this test covers</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--color-text-muted)]">{test.whatThisTestCovers.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
          {test.whyGetTested.length > 0 ? <div><h2 className="gh-h3 text-[var(--color-text-primary)]">Why get tested</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--color-text-muted)]">{test.whyGetTested.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-4">
        <span className="text-sm text-[var(--color-text-primary)]">{test.isActive ? "Active" : "Inactive"}</span>
        <form action={deactivateAction}><button type="submit" className="gh-btn gh-btn-soft">Deactivate</button></form>
        <form action={deleteAction}><button type="submit" className="gh-link text-[var(--color-status-danger-text)]">Delete permanently</button></form>
      </div>
    </section>
  );
}
