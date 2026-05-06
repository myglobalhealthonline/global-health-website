import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteAdminFaq, fetchAdminFaqById } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminFaqDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const faqResult = await fetchAdminFaqById(id);
  if (!faqResult.ok) {
    return <section className="gh-card p-6 sm:p-8">Could not load FAQ: {faqResult.message}</section>;
  }

  async function deactivateAction() {
    "use server";
    const result = await deleteAdminFaq(id);
    if (!result.ok) {
      redirect(`/admin/faqs/${id}?error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/faqs/${id}?success=${encodeURIComponent("FAQ deactivated")}`);
  }

  const faq = faqResult.data.faq;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">FAQ detail</h1>
        <div className="flex gap-3">
          <Link href={`/admin/faqs/${id}/edit`} className="gh-btn gh-btn-primary">Edit</Link>
          <Link href="/admin/faqs" className="gh-link">Back</Link>
        </div>
      </div>
      {sp.success ? <p className="mt-3 text-green-700">{sp.success}</p> : null}
      {sp.error ? <p className="mt-3 text-amber-900">{sp.error}</p> : null}
      <h2 className="mt-6 text-lg font-semibold">{faq.question}</h2>
      <p className="mt-3 whitespace-pre-wrap">{faq.answer}</p>
      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        {faq.locale} · {faq.country?.name ?? "Global"} · sort {faq.sortOrder} · {faq.isActive ? "active" : "inactive"}
      </p>
      <form action={deactivateAction} className="mt-6">
        <button type="submit" className="gh-btn">Deactivate</button>
      </form>
    </section>
  );
}
