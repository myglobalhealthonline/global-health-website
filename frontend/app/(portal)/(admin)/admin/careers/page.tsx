import Link from "next/link";
import { Edit3, ExternalLink, Plus } from "lucide-react";
import { fetchAdminCountries, fetchAdminJobs, fetchRecruitmentHealth, type AdminJobDto } from "@/lib/admin/admin-api";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { ResponsiveFilterBar } from "@/components/ResponsiveFilterBar";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, Btn, IconBtn, PageHeader, Pill } from "../_components/atoms";

export const dynamic = "force-dynamic";
type SearchParams = Record<string, string | string[] | undefined>;
const read = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "—";

function JobsTable({ jobs }: { jobs: AdminJobDto[] }) {
  const fields: ColumnPriorityField<AdminJobDto>[] = [
    { key: "title", label: "Job", priority: 1, cardPrimary: true, render: (job) => <><strong>{job.title}</strong><small className="block font-mono text-[var(--portal-muted)]">{job.slug}</small></> },
    { key: "market", label: "Market", priority: 2, render: (job) => `${job.country.name} · ${job.locale}` },
    { key: "department", label: "Department", priority: 2, render: (job) => job.department },
    { key: "location", label: "Location", priority: 3, render: (job) => `${job.location} · ${job.workplaceMode}` },
    { key: "status", label: "Status", priority: 1, render: (job) => <Pill tone={job.status === "PUBLISHED" ? "published" : job.status === "ARCHIVED" ? "inactive" : "draft"}>{job.status}</Pill> },
    { key: "closing", label: "Closes", priority: 3, render: (job) => date(job.closesAt) },
    { key: "applications", label: "Applications", priority: 2, align: "right", render: (job) => job._count.applications },
    { key: "actions", label: "Actions", priority: 1, align: "right", desktopOnly: true, render: (job) => <span className="inline-flex gap-1">
      {job.status === "PUBLISHED" ? <IconBtn href={`/${job.country.slug}/${job.locale.toLowerCase()}/careers/${job.slug}`} ariaLabel={`Open ${job.title}`} target="_blank"><ExternalLink className="size-4" /></IconBtn> : null}
      <IconBtn href={`/admin/careers/${job.id}/edit`} ariaLabel={`Edit ${job.title}`}><Edit3 className="size-4" /></IconBtn>
    </span> },
  ];
  return <ColumnPriorityTable fields={fields} rows={jobs} getRowKey={(job) => job.id} cardTone={(job) => job.status === "PUBLISHED" ? "success" : "neutral"}
    cardActions={(job) => <IconBtn href={`/admin/careers/${job.id}/edit`} ariaLabel={`Edit ${job.title}`}><Edit3 className="size-4" /></IconBtn>} />;
}

export default async function AdminCareersPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const sp = searchParams ? await searchParams : {};
  const filters = { search: read(sp.search), countryId: read(sp.countryId), locale: read(sp.locale), status: read(sp.status), page: read(sp.page) ?? "1", pageSize: "25" };
  const [result, countriesResult, health] = await Promise.all([fetchAdminJobs(filters), fetchAdminCountries(), fetchRecruitmentHealth()]);
  const countries = countriesResult.ok ? countriesResult.data.countries : [];
  const jobs = result.ok ? result.data.items : [];

  return <>
    <PageHeader eyebrow="Global" title="Careers" description="Publish country-specific jobs and review applications." actions={<Btn href="/admin/careers/new" iconLeft={<Plus className="size-4" />}>New job</Btn>} />
    <nav className="gh-admin-careers-tabs" aria-label="Careers"><Link href="/admin/careers" aria-current="page">Jobs</Link><Link href="/admin/careers/applications">Applications</Link></nav>
    {!health.ok || !health.data.ready ? <p className="gh-status-warning mb-4 rounded-md border px-4 py-3 text-sm">Candidate intake is not ready. Check private storage and ClamAV before publishing.</p> : null}
    {result.ok ? <AdminSummaryStrip items={[{ label: "Published", value: result.data.summary.published, tone: "success" }, { label: "Draft", value: result.data.summary.draft }, { label: "Archived", value: result.data.summary.archived }]} /> : null}
    <AdminCard padding={16} className="mt-4"><form method="get" action="/admin/careers"><ResponsiveFilterBar search={<label><span className="gh-field-label">Search</span><input name="search" className="gh-input" defaultValue={filters.search} placeholder="Title, department or location" /></label>}>
      <label><span className="gh-field-label">Country</span><select name="countryId" className="gh-select" defaultValue={filters.countryId}><option value="">All countries</option>{countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}</select></label>
      <label><span className="gh-field-label">Language</span><select name="locale" className="gh-select" defaultValue={filters.locale}><option value="">All languages</option>{["EN","PT","ES","CS","RO","DE"].map((locale) => <option key={locale}>{locale}</option>)}</select></label>
      <label><span className="gh-field-label">Status</span><select name="status" className="gh-select" defaultValue={filters.status}><option value="">All statuses</option><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select></label>
      <button className="gh-btn gh-btn-primary" type="submit">Filter</button>
    </ResponsiveFilterBar></form></AdminCard>
    <AdminCard padding={0} className="mt-4 overflow-hidden">{!result.ok ? <AdminEmptyState title="Could not load jobs" description={result.message} /> : jobs.length === 0 ? <AdminEmptyState title="No jobs found" description="Create a job or clear the current filters." action={<Btn href="/admin/careers/new">New job</Btn>} /> : <JobsTable jobs={jobs} />}</AdminCard>
    {result.ok && result.data.pagination.totalPages > 1 ? <nav className="gh-admin-careers-pagination" aria-label="Job pages">
      {result.data.pagination.page > 1 ? <Link href={{ pathname: "/admin/careers", query: { ...filters, page: String(result.data.pagination.page - 1) } }}>Previous</Link> : <span />}
      <span>Page {result.data.pagination.page} of {result.data.pagination.totalPages}</span>
      {result.data.pagination.page < result.data.pagination.totalPages ? <Link href={{ pathname: "/admin/careers", query: { ...filters, page: String(result.data.pagination.page + 1) } }}>Next</Link> : <span />}
    </nav> : null}
  </>;
}
