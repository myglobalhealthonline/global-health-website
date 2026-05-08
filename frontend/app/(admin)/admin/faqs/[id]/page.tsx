import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { deleteAdminFaq, fetchAdminFaqById, purgeAdminFaq } from "@/lib/admin/admin-api";

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
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">FAQ</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load FAQ: {faqResult.message}
        </p>
        <Link href="/admin/faqs" className="mt-6 inline-block gh-link text-sm text-[var(--color-text-muted)]">
          Back to list
        </Link>
      </section>
    );
  }

  async function deactivateAction() {
    "use server";
    const result = await deleteAdminFaq(id);
    if (!result.ok) {
      redirect(`/admin/faqs/${id}?error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/faqs/${id}?success=${encodeURIComponent("FAQ deactivated")}`);
  }

  async function deleteAction() {
    "use server";
    const result = await purgeAdminFaq(id);
    if (!result.ok) {
      redirect(`/admin/faqs/${id}?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath("/admin/faqs");
    redirect("/admin/faqs");
  }

  const faq = faqResult.data.faq;
  const isActive = faq.isActive;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">{faq.question}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/admin/faqs/${id}/edit`} className="gh-btn gh-btn-primary">Edit</Link>
          <Link href="/admin/faqs" className="gh-link text-sm text-[var(--color-text-muted)]">Back to list</Link>
        </div>
      </div>

      {sp.error ? <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{sp.error}</p> : null}
      {sp.success ? <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">{sp.success}</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
          isActive
            ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)] border-[var(--color-status-success-border)]"
            : "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-border)]"
        }`}>
          {isActive ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
          {isActive ? "Active" : "Inactive"}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">{faq.locale} · {faq.country?.name ?? "Global"} · sort {faq.sortOrder}</span>
      </div>

      <div className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Answer</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{faq.answer}</p>
      </div>

      {isActive ? (
        <form action={deactivateAction} className="mt-8 border-t border-[var(--color-border)] pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--color-text-muted)]">Deactivating removes this FAQ from the public FAQ API.</p>
            <button type="submit" className="gh-btn gh-btn-danger shrink-0">Deactivate FAQ</button>
          </div>
        </form>
      ) : (
        <p className="mt-8 border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-text-muted)]">
          This FAQ is inactive. Re-enable from edit.
        </p>
      )}
      <form action={deleteAction} className="mt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">Permanent delete removes this FAQ record from admin and public responses.</p>
          <button type="submit" className="gh-btn gh-btn-danger shrink-0">Delete permanently</button>
        </div>
      </form>
    </section>
  );
}
