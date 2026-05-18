import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  deleteAdminHealthTest,
  fetchAdminHealthTestById,
  purgeAdminHealthTest,
} from "@/lib/admin/admin-api";
import { FlagBadge } from "../../_components/flag-badge";
import { AdminCard, Btn, PageHeader, Pill } from "../../_components/atoms";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";

export const dynamic = "force-dynamic";

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

const cardTitleStyle = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 16,
  fontWeight: 800,
  color: "var(--color-text-primary)",
} as const;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminHealthTestDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const result = await fetchAdminHealthTestById(id);

  if (!result.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Services"
          title="Health test"
          actions={
            <Btn href="/admin/health-tests" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Back
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load health test: {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const test = result.data.healthTest;

  async function deactivateAction() {
    "use server";
    const updateResult = await deleteAdminHealthTest(id);
    if (!updateResult.ok)
      redirect(`/admin/health-tests/${id}?error=${encodeURIComponent(updateResult.message)}`);
    revalidatePath("/admin/health-tests");
    revalidatePath(`/admin/health-tests/${id}`);
    redirect(
      `/admin/health-tests/${id}?success=${encodeURIComponent("Health test deactivated")}`,
    );
  }

  async function deleteAction() {
    "use server";
    const deleteResult = await purgeAdminHealthTest(id);
    if (!deleteResult.ok)
      redirect(`/admin/health-tests/${id}?error=${encodeURIComponent(deleteResult.message)}`);
    revalidatePath("/admin/health-tests");
    redirect("/admin/health-tests?success=Health%20test%20deleted");
  }

  return (
    <>
      <Link
        href="/admin/health-tests"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to health tests
      </Link>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={test.country.code} size={14} />
            {test.country.name}
          </span>
        }
        title={test.title}
        description={test.shortDescription ?? "Dedicated health-test product page."}
        actions={
          <>
            <Pill tone={test.isActive ? "published" : "draft"}>
              {test.isActive ? "Active" : "Inactive"}
            </Pill>
            <Btn href={`/admin/health-tests/${id}/edit`} variant="primary">
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
          <AdminCard padding={0}>
            <div className="bg-[var(--color-background-soft)] p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={test.productImagePath}
                alt={test.title}
                className="mx-auto block max-h-72 max-w-full rounded-[var(--radius-card-sm)] object-contain"
              />
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <FieldRow label="Slug" value={test.slug} mono />
              <FieldRow
                label="Price"
                value={formatMoney(test.priceCents, test.currencyCode)}
              />
              <FieldRow label="Sample type" value={test.sampleType ?? "—"} />
              <FieldRow label="Results timeline" value={test.resultsTimeline ?? "—"} />
            </div>
          </AdminCard>

          {test.detailIntro ? (
            <AdminCard>
              <h3 style={cardTitleStyle}>Detail intro</h3>
              <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-[var(--color-text-body)]">
                {test.detailIntro}
              </p>
            </AdminCard>
          ) : null}

          {test.whatThisTestCovers.length > 0 ? (
            <AdminCard>
              <h3 style={cardTitleStyle}>What this test covers</h3>
              <ul className="mt-3 grid gap-2 text-[14px] leading-relaxed text-[var(--color-text-body)]">
                {test.whatThisTestCovers.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 rounded-md bg-[var(--color-background-soft)] px-3 py-2"
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 999,
                        background: "var(--color-brand-primary)",
                        marginTop: 8,
                        flexShrink: 0,
                      }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </AdminCard>
          ) : null}

          {test.whyGetTested.length > 0 ? (
            <AdminCard>
              <h3 style={cardTitleStyle}>Why get tested</h3>
              <ul className="mt-3 grid gap-2 text-[14px] leading-relaxed text-[var(--color-text-body)]">
                {test.whyGetTested.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 rounded-md bg-[var(--color-background-soft)] px-3 py-2"
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 999,
                        background: "var(--color-brand-primary)",
                        marginTop: 8,
                        flexShrink: 0,
                      }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </AdminCard>
          ) : null}
        </div>

        <div className="grid gap-4 self-start">
          <AdminCard>
            <h3 style={cardTitleStyle}>Visibility</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Deactivating hides this test from the public catalogue.
            </p>
            {test.isActive ? (
              <form action={deactivateAction}>
                <button type="submit" className="gh-btn gh-btn-danger w-full">
                  Deactivate health test
                </button>
              </form>
            ) : (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                This health test is inactive. Re-enable from Edit.
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
            <form action={deleteAction}>
              <ConfirmDeleteButton
                message="Permanently delete this health test? This cannot be undone."
                className="gh-btn gh-btn-danger w-full"
                ariaLabel="Delete health test permanently"
              >
                Delete permanently
              </ConfirmDeleteButton>
            </form>
          </AdminCard>
        </div>
      </div>
    </>
  );
}

function FieldRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
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
