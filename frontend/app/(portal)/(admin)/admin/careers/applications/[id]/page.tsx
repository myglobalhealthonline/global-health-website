import Link from "next/link";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { fetchAdminJobApplication, purgeAdminJobApplication, updateAdminJobApplication } from "@/lib/admin/admin-api";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { FormSection } from "@/components/FormSection";
import { AdminCard, Btn, PageHeader, Pill } from "../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../_components/confirm-delete-button";

export const dynamic = "force-dynamic";
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const fileSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export default async function AdminApplicationDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const result = await fetchAdminJobApplication(id);
  if (!result.ok) return <AdminCard><p className="gh-status-warning">Could not load application: {result.message}</p></AdminCard>;
  const application = result.data.application;
  async function setStatus(form: FormData) {
    "use server"; await requireAdminAction();
    const status = form.get("status") === "REVIEWED" ? "REVIEWED" : "NEW";
    const saved = await updateAdminJobApplication(id, status);
    if (!saved.ok) redirect(`/admin/careers/applications/${id}?error=${encodeURIComponent(saved.message)}`);
    revalidatePath(`/admin/careers/applications/${id}`); revalidatePath("/admin/careers/applications");
    redirect(`/admin/careers/applications/${id}?success=Review+state+updated`);
  }
  async function purge(form: FormData) {
    "use server"; await requireAdminAction();
    const reason = form.get("reason") === "DATA_SUBJECT_REQUEST" ? "DATA_SUBJECT_REQUEST" : "ADMIN_CORRECTION";
    const deleted = await purgeAdminJobApplication(id, reason);
    if (!deleted.ok) redirect(`/admin/careers/applications/${id}?error=${encodeURIComponent(deleted.message)}`);
    revalidatePath("/admin/careers/applications"); redirect("/admin/careers/applications?success=Application+purged");
  }
  return <>
    <Link href="/admin/careers/applications" className="mb-2 inline-flex items-center gap-2"><ArrowLeft className="size-4" />Back to applications</Link>
    <PageHeader eyebrow={`${application.jobListing.country.name} · ${application.jobListing.title}`} title={application.fullName}
      description={<Pill tone={application.status === "NEW" ? "pending" : "published"}>{application.status}</Pill>}
      actions={<Btn href={`/api/admin/careers/applications/${application.id}/cv`} iconLeft={<Download className="size-4" />} download>Download CV</Btn>} />
    {sp.error ? <p className="gh-status-warning mb-4 rounded-md border px-4 py-3">{sp.error}</p> : null}
    {sp.success ? <p className="gh-status-success mb-4 rounded-md border px-4 py-3">{sp.success}</p> : null}
    <div className="gh-admin-careers-detail-grid">
      <FormSection title="Applicant contact"><dl className="gh-admin-careers-dl gh-form-section__span-2"><div><dt>Email</dt><dd>{application.email}</dd></div><div><dt>Phone</dt><dd>{application.phone || "Not provided"}</dd></div></dl></FormSection>
      <FormSection title="Application message"><p className="gh-form-section__span-2 whitespace-pre-wrap">{application.message || "No message provided."}</p></FormSection>
      <FormSection title="Job"><dl className="gh-admin-careers-dl gh-form-section__span-2"><div><dt>Role</dt><dd>{application.jobListing.title}</dd></div><div><dt>Market</dt><dd>{application.jobListing.country.name}</dd></div></dl></FormSection>
      <FormSection title="CV and lifecycle"><dl className="gh-admin-careers-dl gh-form-section__span-2"><div><dt>Size</dt><dd>{fileSize(application.cvByteSize)}</dd></div><div><dt>Virus scanned</dt><dd>{dateTime(application.cvScannedAt)}</dd></div><div><dt>Received</dt><dd>{dateTime(application.submittedAt)}</dd></div><div><dt>Reviewed</dt><dd>{dateTime(application.reviewedAt)}</dd></div><div><dt>Delete after</dt><dd>{dateTime(application.retentionUntil)}</dd></div><div><dt>Privacy notice</dt><dd>{application.privacyNoticeVersion} · {dateTime(application.privacyAcknowledgedAt)}</dd></div></dl></FormSection>
    </div>
    <AdminCard className="mt-4"><div className="flex flex-wrap items-end justify-between gap-4">
      <form action={setStatus}><label><span className="gh-field-label">Review state</span><select name="status" className="gh-select" defaultValue={application.status}><option value="NEW">New</option><option value="REVIEWED">Reviewed</option></select></label><button type="submit" className="gh-btn gh-btn-primary mt-2">Update state</button></form>
      <form action={purge} className="flex items-end gap-2"><label><span className="gh-field-label">Purge reason</span><select name="reason" className="gh-select"><option value="ADMIN_CORRECTION">Admin correction</option><option value="DATA_SUBJECT_REQUEST">Data subject request</option></select></label>
        <ConfirmDeleteButton title={`Purge ${application.fullName}?`} message="The application and private CV will be permanently deleted. This cannot be undone." requireTypedConfirmation={application.fullName} className="gh-btn gh-btn-danger"><Trash2 className="size-4" />Purge</ConfirmDeleteButton>
      </form>
    </div></AdminCard>
  </>;
}
