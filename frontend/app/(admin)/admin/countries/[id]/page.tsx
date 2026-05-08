import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { deleteAdminCountry, fetchAdminCountryById, purgeAdminCountry } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminCountryDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const result = await fetchAdminCountryById(id);

  async function deactivateCountryAction() {
    "use server";

    const updateResult = await deleteAdminCountry(id);
    if (!updateResult.ok) {
      redirect(`/admin/countries/${id}?error=${encodeURIComponent(updateResult.message)}`);
    }

    revalidatePath("/admin/countries");
    revalidatePath(`/admin/countries/${id}`);
    redirect(`/admin/countries/${id}?success=${encodeURIComponent("Country deactivated")}`);
  }

  async function deleteCountryAction() {
    "use server";

    const deleteResult = await purgeAdminCountry(id);
    if (!deleteResult.ok) {
      redirect(`/admin/countries/${id}?error=${encodeURIComponent(deleteResult.message)}`);
    }

    revalidatePath("/admin/countries");
    redirect(`/admin/countries?success=${encodeURIComponent("Country deleted")}`);
  }

  if (!result.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Country</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load country: {result.message}
        </p>
        <Link href="/admin/countries" className="mt-6 inline-block gh-link text-sm text-[var(--color-text-muted)]">
          Back to list
        </Link>
      </section>
    );
  }

  const c = result.data.country;
  const isActive = c.isActive;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">{c.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/admin/countries/${id}/edit`} className="gh-btn gh-btn-primary">Edit</Link>
          <Link href="/admin/countries" className="gh-link text-sm text-[var(--color-text-muted)]">Back to list</Link>
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
        <span className="text-xs text-[var(--color-text-muted)]">Inactive countries are omitted from the public countries API.</span>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Code</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{c.code}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Slug</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{c.slug}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Default locale</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{c.defaultLocale}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Supported locales</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{c.countryLocales.map((l) => l.locale).join(", ")}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Currency</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">
            {c.currency.code} ({c.currency.symbol})
          </dd>
        </div>
      </dl>

      <div className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Public routes</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--color-text-muted)]">
          <li>{c.legacyHomePath}</li>
          <li>{c.teamPath}</li>
          <li>{c.generalConsultationPath}</li>
          <li>{c.specialistConsultationPath}</li>
        </ul>
      </div>

      <div className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Domains</h2>
        {c.domains.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">None configured.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">
            {c.domains.map((d) => (
              <li key={d.id}>
                {d.domain}
                {d.isPrimary ? " (primary)" : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isActive ? (
        <form action={deactivateCountryAction} className="mt-8 border-t border-[var(--color-border)] pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--color-text-muted)]">
              Soft-deactivate hides this country from the public countries API. You can re-enable from Edit.
            </p>
            <button type="submit" className="gh-btn gh-btn-danger shrink-0">Deactivate country</button>
          </div>
        </form>
      ) : (
        <p className="mt-8 border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-text-muted)]">
          This country is inactive. Re-enable from edit.
        </p>
      )}
      <form action={deleteCountryAction} className="mt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">Permanent delete removes this country and its dependent admin content.</p>
          <button type="submit" className="gh-btn gh-btn-danger shrink-0">Delete permanently</button>
        </div>
      </form>
    </section>
  );
}
