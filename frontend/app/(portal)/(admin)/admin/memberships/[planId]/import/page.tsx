import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  cancelMembershipImport,
  commitMembershipImport,
  fetchMembershipImport,
  fetchMembershipPlan,
  uploadMembershipImport,
} from "@/lib/admin/memberships-api";
import { displayNameFrom } from "@/lib/admin/display-name";
import { AdminCard, Btn, PageHeader, Pill, SectionHeader } from "../../../_components/atoms";
import { MembershipImportPreview } from "../../_components/membership-import-preview";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ planId: string }>;
  searchParams?: Promise<{ error?: string; success?: string; batchId?: string }>;
};

export default async function AdminMembershipImportPage({ params, searchParams }: PageProps) {
  const { planId } = await params;
  const sp = searchParams ? await searchParams : {};

  const planResult = await fetchMembershipPlan(planId);
  if (!planResult.ok) {
    if (planResult.status === 404) notFound();
    return (
      <>
        <PageHeader eyebrow="Memberships" title="Import" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load this programme: {planResult.message}
          </p>
        </AdminCard>
      </>
    );
  }
  const plan = planResult.data.plan;
  const planTitle = displayNameFrom(plan.name, plan.translations);
  const basePath = `/admin/memberships/${planId}/import`;

  const batchResult = sp.batchId ? await fetchMembershipImport(sp.batchId) : null;
  const batch = batchResult?.ok ? batchResult.data.batch : null;

  async function uploadAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      redirect(`${basePath}?error=${encodeURIComponent("Choose a CSV file")}`);
    }
    const result = await uploadMembershipImport(planId, file as File);
    if (!result.ok) redirect(`${basePath}?error=${encodeURIComponent(result.message)}`);
    revalidatePath(basePath);
    redirect(`${basePath}?batchId=${result.data.batch.id}`);
  }

  async function commitAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const batchId = String(formData.get("batchId") ?? "");
    const result = await commitMembershipImport(batchId);
    if (!result.ok) {
      redirect(`${basePath}?batchId=${batchId}&error=${encodeURIComponent(result.message)}`);
    }
    const { applied, created = 0, revived = 0, skipped = [] } = result.data;
    const message = applied
      ? `Imported ${created} new and ${revived} returning member(s)` +
        (skipped.length > 0 ? `, skipped ${skipped.length} on re-check` : "")
      : "That import had already been applied";
    revalidatePath(`/admin/memberships/${planId}/members`);
    redirect(`${basePath}?batchId=${batchId}&success=${encodeURIComponent(message)}`);
  }

  async function cancelAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const batchId = String(formData.get("batchId") ?? "");
    const result = await cancelMembershipImport(batchId);
    if (!result.ok) {
      redirect(`${basePath}?batchId=${batchId}&error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(basePath);
    redirect(
      `${basePath}?batchId=${batchId}&success=${encodeURIComponent(
        result.data.cancelled ? "Import discarded" : "That import was already finished",
      )}`,
    );
  }

  const counts = batch
    ? {
        total: batch.rowCount,
        rejected: batch.rejectedCount,
        applicable: batch.rowCount - batch.rejectedCount,
      }
    : null;

  return (
    <>
      <Link
        href={`/admin/memberships/${planId}/members`}
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to members
      </Link>
      <PageHeader
        eyebrow="Membership import"
        title={planTitle}
        description="Upload the partner's member list, check what will happen, then apply it."
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.success}
        </p>
      ) : null}

      <div className="flex flex-col gap-6">
        <AdminCard padding={0}>
          <SectionHeader
            title="Upload a CSV"
            description="Nothing is written until you apply the preview on the next step."
          />
          <form
            action={uploadAction}
            encType="multipart/form-data"
            className="flex flex-col gap-4 p-6"
          >
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Member list</span>
              <input name="file" type="file" accept=".csv,text/csv" className="gh-input" required />
            </label>
            <div className="rounded-[var(--radius-card-sm)] bg-[var(--color-surface-2)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
              <p>
                Required columns: <code>membershipId</code>, <code>email</code>,{" "}
                <code>firstName</code>, <code>lastName</code>.
              </p>
              <p className="mt-1">
                Optional: <code>level</code>, <code>phone</code>, <code>dateOfBirth</code>,{" "}
                <code>startDate</code>, <code>endDate</code>, <code>notes</code>. A row with{" "}
                <code>primaryMembershipId</code> is a dependent and inherits its level and term.
              </p>
              <p className="mt-1">Up to 2,000 rows per file.</p>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="gh-btn gh-btn-primary">
                Preview import
              </button>
            </div>
          </form>
        </AdminCard>

        {batch ? (
          <AdminCard padding={0}>
            <SectionHeader
              title={`Preview — ${batch.fileName}`}
              description={
                batch.status === "PREVIEW"
                  ? "Check the outcomes, then apply. Skipped rows are left out; everything else is written in one go."
                  : "This import is finished. It is kept for the record."
              }
            />
            <div className="flex flex-col gap-4 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Pill tone={batch.status === "PREVIEW" ? "brand" : "neutral"}>
                  {batch.status.charAt(0) + batch.status.slice(1).toLowerCase()}
                </Pill>
                {counts ? (
                  <span className="text-portal-compact text-[var(--color-text-muted)]">
                    {counts.total} row{counts.total === 1 ? "" : "s"} · {counts.applicable} to apply ·{" "}
                    {counts.rejected} skipped
                  </span>
                ) : null}
              </div>

              <MembershipImportPreview batch={batch} />

              {batch.status === "PREVIEW" ? (
                <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--color-border)] pt-4">
                  <form action={cancelAction}>
                    <input type="hidden" name="batchId" value={batch.id} />
                    <Btn type="submit" variant="ghost">
                      Discard
                    </Btn>
                  </form>
                  <form action={commitAction}>
                    <input type="hidden" name="batchId" value={batch.id} />
                    <Btn type="submit">Apply {counts?.applicable ?? 0} row(s)</Btn>
                  </form>
                </div>
              ) : (
                <div className="flex justify-end border-t border-[var(--color-border)] pt-4">
                  <Btn href={`/admin/memberships/${planId}/members`} variant="soft">
                    View members
                  </Btn>
                </div>
              )}
            </div>
          </AdminCard>
        ) : null}
      </div>
    </>
  );
}
