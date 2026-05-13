import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchAdminCountries, purgeAdminCountry } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminCountriesPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const result = await fetchAdminCountries();

  async function deleteCountryAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    const deleteResult = await purgeAdminCountry(id);
    if (!deleteResult.ok) {
      redirect(`/admin/countries?error=${encodeURIComponent(deleteResult.message)}`);
    }
    revalidatePath("/admin/countries");
    redirect("/admin/countries?success=Country%20deleted");
  }

  if (!result.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Countries</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load countries: {result.message}
        </p>
      </section>
    );
  }

  const rows = result.data.countries;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Countries</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">Manage countries, locales, currencies, and key routes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/countries/new" className="gh-btn gh-btn-primary">
            Add country
          </Link>

        </div>
      </div>

      {sp.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{sp.error}</p>
      ) : null}
      {sp.success ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">{sp.success}</p>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Code</th>
              <th className="px-3 py-2 font-semibold">Default locale</th>
              <th className="px-3 py-2 font-semibold">Locales</th>
              <th className="px-3 py-2 font-semibold">Currency</th>
              <th className="px-3 py-2 font-semibold">Active</th>
              <th className="px-3 py-2 font-semibold">Key routes</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                className={`border-b border-[var(--color-border)] align-top ${c.isActive ? "" : "opacity-60"}`}
              >
                <td className="px-3 py-3 font-medium text-[var(--color-text-primary)]">{c.name}</td>
                <td className="px-3 py-3 uppercase text-[var(--color-text-muted)]">{c.code}</td>
                <td className="px-3 py-3 text-[var(--color-text-primary)]">{c.defaultLocale}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">
                  {c.countryLocales.map((l) => l.locale).join(", ")}
                </td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">{c.currency.code}</td>
                <td className="px-3 py-3 text-[var(--color-text-primary)]">{c.isActive ? "Yes" : "No"}</td>
                <td className="max-w-[14rem] px-3 py-3 text-xs text-[var(--color-text-muted)]">
                  <div>{c.legacyHomePath}</div>
                  <div>{c.teamPath}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    <Link href={`/admin/countries/${c.id}`} className="gh-link text-[var(--color-brand-primary)]">
                      View
                    </Link>
                    <Link href={`/admin/countries/${c.id}/edit`} className="gh-link text-[var(--color-brand-primary)]">
                      Edit
                    </Link>
                    <form action={deleteCountryAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="gh-link text-left text-[var(--color-status-danger-text)]">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--color-text-muted)]">No countries yet. Create one to get started.</p>
      ) : null}
    </section>
  );
}
