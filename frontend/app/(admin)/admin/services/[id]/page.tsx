import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  deleteAdminService,
  fetchAdminServiceById,
  purgeAdminService,
} from "@/lib/admin/admin-api";
import { readServiceKind, SERVICE_KIND_META } from "@/lib/admin/service-kind";
import { FlagBadge } from "../../_components/flag-badge";
import { AdminCard, Btn, PageHeader, Pill } from "../../_components/atoms";

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

const cardTitleStyle = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 16,
  fontWeight: 800,
  color: "var(--color-text-primary)",
} as const;

function FieldRow({
  label,
  value,
  mono = false,
  full = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd
        className="mt-1 text-[14px] text-[var(--color-text-primary)]"
        style={mono ? { fontFamily: "ui-monospace, monospace", fontSize: 12.5 } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

export default async function AdminServiceDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const result = await fetchAdminServiceById(id);

  if (!result.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Services"
          title="Service"
          actions={
            <Btn href="/admin/general-consultations" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Back
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load service: {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const service = result.data.service;
  if (service.kind === "HEALTH_TEST") {
    redirect(`/admin/health-tests/${id}`);
  }
  if (service.kind === "HOME_DELIVERY") {
    redirect("/admin");
  }
  const kind = readServiceKind(messages.kind, service.kind);
  const meta = SERVICE_KIND_META[kind];
  const showsCategory = kind === "SPECIALIST";

  async function deactivateServiceAction() {
    "use server";
    const updateResult = await deleteAdminService(id);
    if (!updateResult.ok) {
      redirect(
        `/admin/services/${id}?kind=${encodeURIComponent(kind)}&error=${encodeURIComponent(updateResult.message)}`,
      );
    }
    revalidatePath("/admin/services");
    revalidatePath(meta.listHref);
    revalidatePath(`/admin/services/${id}`);
    redirect(
      `/admin/services/${id}?kind=${encodeURIComponent(kind)}&success=${encodeURIComponent(`${meta.singularLabel} deactivated`)}`,
    );
  }

  async function deleteServiceAction() {
    "use server";
    const deleteResult = await purgeAdminService(id);
    if (!deleteResult.ok) {
      redirect(
        `/admin/services/${id}?kind=${encodeURIComponent(kind)}&error=${encodeURIComponent(deleteResult.message)}`,
      );
    }
    revalidatePath("/admin/services");
    revalidatePath(meta.listHref);
    redirect(meta.listHref);
  }

  return (
    <>
      <Link
        href={meta.listHref}
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to {meta.label.toLowerCase()}
      </Link>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={service.country.code} size={14} />
            {meta.label}
          </span>
        }
        title={service.name}
        description={service.summary ?? meta.singularLabel}
        actions={
          <>
            <Pill tone={service.isActive ? "published" : "draft"}>
              {service.isActive ? "Published" : "Draft"}
            </Pill>
            <Btn
              href={`/admin/services/${id}/edit?kind=${encodeURIComponent(kind)}`}
              variant="primary"
            >
              Edit
            </Btn>
          </>
        }
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}
      {messages.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.success}
        </p>
      ) : null}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <div className="grid gap-4">
          <AdminCard>
            <h3 style={cardTitleStyle}>Basics</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Identifiers and pricing.
            </p>
            <dl className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Slug" value={service.slug} mono />
              <FieldRow
                label="Country"
                value={`${service.country.name} (${service.country.code.toUpperCase()})`}
              />
              <FieldRow label="Type" value={meta.singularLabel} />
              {showsCategory ? (
                <FieldRow
                  label="Category"
                  value={service.specialty?.name ?? meta.emptySpecialtyLabel}
                />
              ) : null}
              <FieldRow label="Sort order" value={String(service.sortOrder)} />
              <FieldRow
                label="Duration"
                value={
                  service.durationMinutes != null
                    ? `${service.durationMinutes} min`
                    : "—"
                }
              />
              <FieldRow
                label="Base price"
                value={formatMoney(service.basePriceCents, service.currencyCode)}
              />
              <FieldRow label="CTA label" value={service.ctaLabel ?? "—"} />
              <FieldRow label="Hero title" value={service.heroTitle ?? "—"} full />
              <FieldRow
                label="Hero image"
                value={service.assets[0]?.path ?? "—"}
                mono
                full
              />
              <FieldRow label="Legacy path" value={service.legacyPath ?? "—"} mono full />
            </dl>
          </AdminCard>

          <AdminCard>
            <h3 style={cardTitleStyle}>Summary</h3>
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--color-text-body)]">
              {service.summary ?? "—"}
            </p>
          </AdminCard>

          <AdminCard>
            <h3 style={cardTitleStyle}>Hero description</h3>
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--color-text-body)]">
              {service.heroDescription ?? "—"}
            </p>
          </AdminCard>

          <AdminCard>
            <h3 style={cardTitleStyle}>Detail body</h3>
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--color-text-body)]">
              {service.detailBody
                ? service.detailBody
                    .replace(/<[^>]*>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
                : "—"}
            </p>
          </AdminCard>
        </div>

        <div className="grid gap-4 self-start">
          <AdminCard>
            <h3 style={cardTitleStyle}>Visibility</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Soft-deactivate hides this record from the public services API and card listings.
            </p>
            {service.isActive ? (
              <form action={deactivateServiceAction}>
                <button type="submit" className="gh-btn gh-btn-danger w-full">
                  Deactivate {meta.singularLabel.toLowerCase()}
                </button>
              </form>
            ) : (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                This {meta.singularLabel.toLowerCase()} is inactive. Re-enable from Edit.
              </p>
            )}
          </AdminCard>

          <AdminCard>
            <h3
              style={{
                ...cardTitleStyle,
                color: "var(--color-status-error-text)",
              }}
            >
              Danger zone
            </h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Permanent delete removes this record instead of hiding it.
            </p>
            <form action={deleteServiceAction}>
              <button type="submit" className="gh-btn gh-btn-danger w-full">
                Delete permanently
              </button>
            </form>
          </AdminCard>
        </div>
      </div>
    </>
  );
}
