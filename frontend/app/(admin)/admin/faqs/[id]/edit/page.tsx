import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  fetchAdminCountries,
  fetchAdminFaqById,
  patchAdminFaq,
} from "@/lib/admin/admin-api";
import { parseFaqBodyFromForm } from "@/lib/admin/faq-form-parse";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminEditFaqPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const [faqResult, countriesResult] = await Promise.all([
    fetchAdminFaqById(id),
    fetchAdminCountries(),
  ]);
  if (!faqResult.ok) notFound();
  if (!countriesResult.ok) {
    return <section className="gh-card p-6 sm:p-8">Could not load countries: {countriesResult.message}</section>;
  }

  async function updateAction(formData: FormData) {
    "use server";
    const body = parseFaqBodyFromForm(formData);
    const result = await patchAdminFaq(id, body);
    if (!result.ok) {
      redirect(`/admin/faqs/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/faqs/${id}?success=${encodeURIComponent("FAQ updated")}`);
  }

  const faq = faqResult.data.faq;

  return (
    <section className="gh-card p-6 sm:p-8">
      <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit FAQ</h1>
      {sp.error ? <p className="mt-3 text-amber-900">{sp.error}</p> : null}
      <form action={updateAction} className="mt-6 grid gap-4">
        <input className="gh-input" name="question" defaultValue={faq.question} required />
        <textarea className="gh-textarea" name="answer" defaultValue={faq.answer} rows={8} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="gh-select" name="locale" defaultValue={faq.locale}>
            {["EN", "PT", "ES", "CS", "RO", "DE"].map((locale) => (
              <option key={locale} value={locale}>{locale}</option>
            ))}
          </select>
          <select className="gh-select" name="countryId" defaultValue={faq.countryId ?? ""}>
            <option value="">Global (no country)</option>
            {countriesResult.data.countries.map((country) => (
              <option key={country.id} value={country.id}>{country.name}</option>
            ))}
          </select>
        </div>
        <input className="gh-input" name="category" defaultValue={faq.category ?? ""} />
        <input className="gh-input" name="placementKey" defaultValue={faq.placementKey ?? ""} />
        <input className="gh-input" name="sortOrder" type="number" defaultValue={faq.sortOrder} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={faq.isActive} />
          Active
        </label>
        <div className="flex gap-3">
          <button className="gh-btn gh-btn-primary" type="submit">Save</button>
          <Link href={`/admin/faqs/${id}`} className="gh-link">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
