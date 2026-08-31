import Link from "next/link";
import { ArrowLeft, Archive, ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { fetchAdminCountries, fetchAdminJob, updateAdminJobGroup } from "@/lib/admin/admin-api";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { PUBLIC_JOBS_TAG } from "@/lib/content/get-public-jobs";
import { AdminCard, Btn, PageHeader, Pill } from "../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../_components/confirm-delete-button";
import { JobFields } from "../../_components/job-fields";
import { parseJobForm, toAdminJobGroupInput, validateJobInput } from "../../_components/job-form-parse";

export const dynamic = "force-dynamic";
export default async function EditCareerJobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const [jobResult, countriesResult] = await Promise.all([fetchAdminJob(id), fetchAdminCountries()]);
  if (!jobResult.ok || !countriesResult.ok) return <AdminCard><p className="gh-status-warning">Could not load job: {!jobResult.ok ? jobResult.message : countriesResult.ok ? "Unknown error" : countriesResult.message}</p></AdminCard>;
  const job = jobResult.data.job;
  const publicPath = `/${job.country.slug}/${job.locale.toLowerCase()}/careers/${job.slug}`;
  async function save(form: FormData) {
    "use server"; await requireAdminAction();
    let body; try { body = parseJobForm(form); } catch { redirect(`/admin/careers/${id}/edit?error=Invalid+job+form+values`); }
    const error = validateJobInput(body!, job.localizations.map(({ locale }) => locale)); if (error) redirect(`/admin/careers/${id}/edit?error=${encodeURIComponent(error)}`);
    const result = await updateAdminJobGroup(id, toAdminJobGroupInput(body!)); if (!result.ok) redirect(`/admin/careers/${id}/edit?error=${encodeURIComponent(result.message)}`);
    revalidateTag(PUBLIC_JOBS_TAG, "max"); revalidatePath("/admin/careers"); revalidatePath(publicPath);
    redirect(`/admin/careers/${id}/edit?success=${encodeURIComponent("Job saved")}`);
  }
  async function archive() {
    "use server"; await requireAdminAction();
    const result = await updateAdminJobGroup(id, { status: "ARCHIVED" });
    if (!result.ok) redirect(`/admin/careers/${id}/edit?error=${encodeURIComponent(result.message)}`);
    revalidateTag(PUBLIC_JOBS_TAG, "max"); revalidatePath("/admin/careers"); revalidatePath(publicPath);
    redirect(`/admin/careers/${id}/edit?success=Job+archived`);
  }
  return <>
    <Link href="/admin/careers" className="mb-2 inline-flex items-center gap-2"><ArrowLeft className="size-4" />Back to careers</Link>
    <PageHeader eyebrow={`${job.country.name} · ${job.locale}`} title={job.title} description={<span className="inline-flex items-center gap-2"><Pill tone={job.status === "PUBLISHED" ? "published" : job.status === "ARCHIVED" ? "inactive" : "draft"}>{job.status}</Pill><span>/{job.slug}</span></span>} actions={job.status === "PUBLISHED" ? <Btn href={publicPath} target="_blank" variant="ghost" iconLeft={<ExternalLink className="size-4" />}>Open job</Btn> : undefined} />
    {sp.error ? <p className="gh-status-warning mb-4 rounded-md border px-4 py-3">{sp.error}</p> : null}
    {sp.success ? <p className="gh-status-success mb-4 rounded-md border px-4 py-3">{sp.success}</p> : null}
    <form action={save} className="gh-admin-careers-form"><JobFields countries={countriesResult.data.countries} job={job} />
      <div className="mt-4 flex justify-end gap-2"><Btn href="/admin/careers" variant="ghost">Cancel</Btn><Btn type="submit">Save changes</Btn></div>
    </form>
    {job.status !== "ARCHIVED" ? <form action={archive} className="mt-4"><ConfirmDeleteButton title="Archive job?" message="The public page and application form will close immediately." className="gh-btn gh-btn-danger"><Archive className="size-4" />Archive</ConfirmDeleteButton></form> : null}
  </>;
}
