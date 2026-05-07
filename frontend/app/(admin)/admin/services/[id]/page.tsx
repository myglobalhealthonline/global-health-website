import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteAdminService, fetchAdminServiceById } from "@/lib/admin/admin-api";
import { readServiceKind, SERVICE_KIND_META } from "@/lib/admin/service-kind";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string; kind?: string }>;
};

function formatMoney(cents: number | null, currency: string | null) {
  if (cents === null || cents === undefined) return "—";
  const code = currency?.trim().toUpperCase() || "EUR";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${code} ${(cents / 100).toFixed(2)}`;
  }
}

export default async function AdminServiceDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const result = await fetchAdminServiceById(id);

  if (!result.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Service</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load service: {result.message}
        </p>
        <Link href="/admin/general-consultations" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
          Back to consultations
        </Link>
      </section>
    );
  }

  const service = result.data.service;
  const kind = readServiceKind(messages.kind, service.kind);
  const meta = SERVICE_KIND_META[kind];

  async function deactivateServiceAction() {
    "use server";

    const updateResult = await deleteAdminService(id);
    if (!updateResult.ok) {
      redirect(`/admin/services/${id}?kind=${encodeURIComponent(kind)}&error=${encodeURIComponent(updateResult.message)}`);
    }

    revalidatePath("/admin/services");
    revalidatePath(meta.listHref);
    revalidatePath(`/admin/services/${id}`);
    redirect(`/admin/services/${id}?kind=${encodeURIComponent(kind)}&success=${encodeURIComponent(`${meta.singularLabel} deactivated`)}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">{service.name}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{meta.label}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href={`/admin/services/${id}/edit?kind=${encodeURIComponent(kind)}`} className="gh-btn gh-btn-primary">
            Edit
          </Link>
          <Link href={meta.listHref} className="gh-link text-[var(--color-text-muted)]">
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
        <span className={service.isActive ? "text-[var(--color-status-success-text)]" : "text-[var(--color-status-warning-text)]"}>
          {service.isActive ? "Active" : "Inactive"}
        </span>
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Slug</dt>
          <dd className="mt-1 font-mono text-sm text-[var(--color-text-primary)]">{service.slug}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Country</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{service.country.name} ({service.country.code})</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Type</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{meta.singularLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Specialty</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{service.specialty?.name ?? meta.emptySpecialtyLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Sort order</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{service.sortOrder}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Duration</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{service.durationMinutes != null ? `${service.durationMinutes} min` : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Base price</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{formatMoney(service.basePriceCents, service.currencyCode)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Hero title</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{service.heroTitle ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">CTA label</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{service.ctaLabel ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Hero image</dt>
          <dd className="mt-1 font-mono text-sm text-[var(--color-text-primary)]">{service.assets[0]?.path ?? "—"}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Summary</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{service.summary ?? "—"}</p>
      </div>

      <div className="mt-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Hero description</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{service.heroDescription ?? "—"}</p>
      </div>

      <div className="mt-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Detail body</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">
          {service.detailBody ? service.detailBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "—"}
        </p>
      </div>

      <div className="mt-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Legacy path</h2>
        <p className="mt-2 font-mono text-sm text-[var(--color-text-muted)]">{service.legacyPath ?? "—"}</p>
      </div>

      {service.isActive ? (
        <form action={deactivateServiceAction} className="mt-8 border-t border-[var(--color-border)] pt-6">
          <p className="text-sm text-[var(--color-text-muted)]">
            Soft-deactivate hides this record from the public services API and card listings.
          </p>
          <button type="submit" className="gh-btn gh-btn-danger mt-3">
            Deactivate {meta.singularLabel.toLowerCase()}
          </button>
        </form>
      ) : null}
    </section>
  );
}
