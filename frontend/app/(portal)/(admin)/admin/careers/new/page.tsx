import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminJob, fetchAdminCountries } from "@/lib/admin/admin-api";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { PUBLIC_JOBS_TAG } from "@/lib/content/get-public-jobs";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";
import { JobFields } from "../_components/job-fields";
import { parseJobForm, validateJobInput } from "../_components/job-form-parse";

export const dynamic = "force-dynamic";
export default async function NewCareerJobPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const sp = searchParams ? await searchParams : {};
  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) return <AdminCard><p className="gh-status-warning">Could not load countries: {countriesResult.message}</p></AdminCard>;
  async function create(form: FormData) {
    "use server";
    await requireAdminAction();
    let body;
    try { body = parseJobForm(form); } catch { redirect("/admin/careers/new?error=Invalid+job+form+values"); }
    const error = validateJobInput(body!);
    if (error) redirect(`/admin/careers/new?error=${encodeURIComponent(error)}`);
    const result = await createAdminJob(body!);
    if (!result.ok) redirect(`/admin/careers/new?error=${encodeURIComponent(result.message)}`);
    revalidateTag(PUBLIC_JOBS_TAG, "max"); revalidatePath("/admin/careers");
    redirect(`/admin/careers/${result.data.job.id}/edit?success=${encodeURIComponent("Job created")}`);
  }
  return <>
    <Link href="/admin/careers" className="mb-2 inline-flex items-center gap-2"><ArrowLeft className="size-4" />Back to careers</Link>
    <PageHeader eyebrow="Careers" title="New job" description="Create one market- and language-specific listing." />
    {sp.error ? <p className="gh-status-warning mb-4 rounded-md border px-4 py-3">{sp.error}</p> : null}
    <form action={create} className="gh-admin-careers-form"><JobFields countries={countriesResult.data.countries} />
      <div className="mt-4 flex justify-end gap-2"><Btn href="/admin/careers" variant="ghost">Cancel</Btn><Btn type="submit">Create job</Btn></div>
    </form>
  </>;
}
