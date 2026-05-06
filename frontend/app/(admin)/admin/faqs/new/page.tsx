import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchAdminCountries, postAdminFaq } from "@/lib/admin/admin-api";
import { parseFaqBodyFromForm } from "@/lib/admin/faq-form-parse";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<{ error?: string }> };

export default async function AdminNewFaqPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return <section className="gh-card p-6 sm:p-8">Could not load countries: {countriesResult.message}</section>;
  }

  async function createAction(formData: FormData) {
    "use server";
    const body = parseFaqBodyFromForm(formData);
    const result = await postAdminFaq(body);
    if (!result.ok) {
      redirect(`/admin/faqs/new?error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/faqs/${result.data.faq.id}?success=${encodeURIComponent("FAQ created")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <h1 className="gh-h2 text-[var(--color-text-primary)]">New FAQ</h1>
      {sp.error ? <p className="mt-3 text-[var(--color-status-warning-text)]">{sp.error}</p> : null}
      <form action={createAction} className="mt-6 grid gap-4">
        <input aria-label="FAQ question" className="gh-input" name="question" placeholder="Question" required />
        <textarea aria-label="FAQ answer" className="gh-textarea" name="answer" placeholder="Answer" rows={8} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <select aria-label="FAQ locale" className="gh-select" name="locale" defaultValue="EN">
            {["EN", "PT", "ES", "CS", "RO", "DE"].map((locale) => (
              <option key={locale} value={locale}>{locale}</option>
            ))}
          </select>
          <select aria-label="FAQ country" className="gh-select" name="countryId" defaultValue="">
            <option value="">Global (no country)</option>
            {countriesResult.data.countries.map((country) => (
              <option key={country.id} value={country.id}>{country.name}</option>
            ))}
          </select>
        </div>
        <input aria-label="FAQ category" className="gh-input" name="category" placeholder="Category (optional)" />
        <input aria-label="FAQ placement key" className="gh-input" name="placementKey" placeholder="Placement key / page (optional)" />
        <input aria-label="FAQ sort order" className="gh-input" name="sortOrder" type="number" defaultValue={0} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked />
          Active
        </label>
        <div className="flex gap-3">
          <button className="gh-btn gh-btn-primary" type="submit">Create FAQ</button>
          <Link href="/admin/faqs" className="gh-link">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
