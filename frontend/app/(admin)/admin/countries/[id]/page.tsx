import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteAdminCountry, fetchAdminCountryById } from "@/lib/admin/admin-api";

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

  if (!result.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Country</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load country: {result.message}
        </p>
        <Link href="/admin/countries" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
          Back to countries
        </Link>
      </section>
    );
  }

  const c = result.data.country;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">{c.name}</h1>
        <div className="flex flex-wrap gap-4">
          <Link href={`/admin/countries/${id}/edit`} className="gh-btn gh-btn-primary">
            Edit
          </Link>
          <Link href="/admin/countries" className="gh-link text-[var(--color-text-muted)]">
            Back to list
          </Link>
        </div>
      </div>

      {messages.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          {messages.error}
        </p>
      ) : null}
      {messages.success ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">
          {messages.success}
        </p>
      ) : null}

      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        Status:{" "}
        <span className={c.isActive ? "text-[var(--color-status-success-text)]" : "text-[var(--color-status-warning-text)]"}>{c.isActive ? "Active" : "Inactive"}</span>
        {" — inactive countries are omitted from the public countries API."}
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Code</dt>
          <dd className="mt-1 uppercase text-[var(--color-text-primary)]">{c.code}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Slug</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{c.slug}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Default locale</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{c.defaultLocale}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Supported locales</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{c.countryLocales.map((l) => l.locale).join(", ")}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Currency</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">
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

      {c.isActive ? (
        <form action={deactivateCountryAction} className="mt-8 border-t border-[var(--color-border)] pt-6">
          <p className="text-sm text-[var(--color-text-muted)]">
            Soft-deactivate hides this country from the public countries API. You can re-enable from Edit.
          </p>
          <button type="submit" className="gh-btn gh-btn-danger mt-3">
            Deactivate country
          </button>
        </form>
      ) : null}
    </section>
  );
}
