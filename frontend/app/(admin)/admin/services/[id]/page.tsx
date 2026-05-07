import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteAdminService, fetchAdminServiceById } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminServiceDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const result = await fetchAdminServiceById(id);

  async function deactivateServiceAction() {
    "use server";

    const updateResult = await deleteAdminService(id);
    if (!updateResult.ok) {
      redirect(`/admin/services/${id}?error=${encodeURIComponent(updateResult.message)}`);
    }

    revalidatePath("/admin/services");
    revalidatePath(`/admin/services/${id}`);
    redirect(`/admin/services/${id}?success=${encodeURIComponent("Service deactivated")}`);
  }

  if (!result.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Service</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load service: {result.message}
        </p>
        <Link href="/admin/services" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
          Back to services
        </Link>
      </section>
    );
  }

  const s = result.data.service;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">{s.name}</h1>
        <div className="flex flex-wrap gap-4">
          <Link href={`/admin/services/${id}/edit`} className="gh-btn gh-btn-primary">
            Edit
          </Link>
          <Link href="/admin/services" className="gh-link text-[var(--color-text-muted)]">
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
        <span className={s.isActive ? "text-[var(--color-status-success-text)]" : "text-[var(--color-status-warning-text)]"}>
          {s.isActive ? "Active" : "Inactive"}
        </span>
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Slug</dt>
          <dd className="mt-1 font-mono text-sm text-[var(--color-text-primary)]">{s.slug}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Country</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{s.country.name} ({s.country.code})</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Specialty</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{s.specialty?.name ?? "None"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Duration</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{s.durationMinutes != null ? `${s.durationMinutes} min` : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Base price</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">
            {s.basePriceCents != null ? `${s.basePriceCents}¢` : "—"} {s.currencyCode ?? ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Hero title</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{s.heroTitle ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">CTA label</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{s.ctaLabel ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Hero image</dt>
          <dd className="mt-1 font-mono text-sm text-[var(--color-text-primary)]">{s.assets[0]?.path ?? "—"}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Summary</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{s.summary ?? "—"}</p>
      </div>

      <div className="mt-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Hero description</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{s.heroDescription ?? "—"}</p>
      </div>

      <div className="mt-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Detail body</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">
          {s.detailBody ? s.detailBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "—"}
        </p>
      </div>

      <div className="mt-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Legacy path</h2>
        <p className="mt-2 font-mono text-sm text-[var(--color-text-muted)]">{s.legacyPath ?? "—"}</p>
      </div>

      {s.isActive ? (
        <form action={deactivateServiceAction} className="mt-8 border-t border-[var(--color-border)] pt-6">
          <p className="text-sm text-[var(--color-text-muted)]">
            Soft-deactivate hides this service from the public services API.
          </p>
          <button type="submit" className="gh-btn gh-btn-danger mt-3">
            Deactivate service
          </button>
        </form>
      ) : null}
    </section>
  );
}
