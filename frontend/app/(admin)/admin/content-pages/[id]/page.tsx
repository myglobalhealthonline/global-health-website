import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deleteAdminContentPage,
  fetchAdminContentPageById,
} from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminContentPageDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const pageResult = await fetchAdminContentPageById(id);
  if (!pageResult.ok) {
    return <section className="gh-card p-6 sm:p-8">Could not load content page: {pageResult.message}</section>;
  }

  async function deactivateAction() {
    "use server";
    const result = await deleteAdminContentPage(id);
    if (!result.ok) {
      redirect(`/admin/content-pages/${id}?error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/content-pages/${id}?success=${encodeURIComponent("Content page deactivated")}`);
  }

  const page = pageResult.data.page;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">{page.title}</h1>
        <div className="flex gap-3">
          <Link href={`/admin/content-pages/${id}/edit`} className="gh-btn gh-btn-primary">Edit</Link>
          <Link href="/admin/content-pages" className="gh-link">Back</Link>
        </div>
      </div>
      {sp.success ? <p className="mt-3 text-green-700">{sp.success}</p> : null}
      {sp.error ? <p className="mt-3 text-amber-900">{sp.error}</p> : null}
      <p className="mt-3 text-sm text-amber-900">
        Legal copy edits may require external approval. Public routes remain fallback-safe until approved.
      </p>
      <dl className="mt-6 grid gap-2 text-sm">
        <div><dt className="font-semibold">Page key</dt><dd>{page.pageKey}</dd></div>
        <div><dt className="font-semibold">Status</dt><dd>{page.status}</dd></div>
        <div><dt className="font-semibold">Locale</dt><dd>{page.locale}</dd></div>
        <div><dt className="font-semibold">Country</dt><dd>{page.country?.name ?? "Global"}</dd></div>
      </dl>
      <p className="mt-6 whitespace-pre-wrap">{page.body}</p>
      <form action={deactivateAction} className="mt-6">
        <button type="submit" className="gh-btn">Deactivate</button>
      </form>
    </section>
  );
}
