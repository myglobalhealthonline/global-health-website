import Link from "next/link";
import { Eye } from "lucide-react";
import { fetchAdminCountries, fetchAdminJobApplications, fetchAdminJobs, type AdminApplicationListDto } from "@/lib/admin/admin-api";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { ResponsiveFilterBar } from "@/components/ResponsiveFilterBar";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, IconBtn, PageHeader, Pill } from "../../_components/atoms";

export const dynamic = "force-dynamic";
type SearchParams = Record<string, string | string[] | undefined>;
const read = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const formatDate = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));

function ApplicationsTable({ rows }: { rows: AdminApplicationListDto[] }) {
  const fields: ColumnPriorityField<AdminApplicationListDto>[] = [
    { key: "candidate", label: "Candidate", priority: 1, cardPrimary: true, render: (row) => <strong>{row.fullName}</strong> },
    { key: "job", label: "Job", priority: 1, render: (row) => row.jobListing.title },
    { key: "country", label: "Country", priority: 2, render: (row) => row.jobListing.country.name },
    { key: "submitted", label: "Submitted", priority: 2, render: (row) => formatDate(row.submittedAt) },
    { key: "status", label: "Status", priority: 1, render: (row) => <Pill tone={row.status === "NEW" ? "pending" : "published"}>{row.status}</Pill> },
    { key: "retention", label: "Delete after", priority: 3, render: (row) => formatDate(row.retentionUntil) },
    { key: "action", label: "View", priority: 1, align: "right", desktopOnly: true, render: (row) => <IconBtn href={`/admin/careers/applications/${row.id}`} ariaLabel={`View application from ${row.fullName}`}><Eye className="size-4" /></IconBtn> },
  ];
  return <ColumnPriorityTable fields={fields} rows={rows} getRowKey={(row) => row.id} cardTone={(row) => row.status === "NEW" ? "warning" : "success"}
    cardActions={(row) => <IconBtn href={`/admin/careers/applications/${row.id}`} ariaLabel={`View application from ${row.fullName}`}><Eye className="size-4" /></IconBtn>} />;
}

export default async function AdminApplicationsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const sp = searchParams ? await searchParams : {};
  const filters = { countryId: read(sp.countryId), jobId: read(sp.jobId), status: read(sp.status), submittedFrom: read(sp.submittedFrom), submittedTo: read(sp.submittedTo), page: read(sp.page) ?? "1", pageSize: "25" };
  const [result, countriesResult, jobsResult] = await Promise.all([fetchAdminJobApplications(filters), fetchAdminCountries(), fetchAdminJobs({ pageSize: "100" })]);
  const rows = result.ok ? result.data.items : [];
  const countries = countriesResult.ok ? countriesResult.data.countries : [];
  const jobs = jobsResult.ok ? jobsResult.data.items : [];
  return <>
    <PageHeader eyebrow="Global" title="Job applications" description="Personal recruitment data. Access and downloads are audited." />
    <nav className="gh-admin-careers-tabs" aria-label="Careers"><Link href="/admin/careers">Jobs</Link><Link href="/admin/careers/applications" aria-current="page">Applications</Link></nav>
    {read(sp.success) ? <p className="gh-status-success mb-4 rounded-md border px-4 py-3">{read(sp.success)}</p> : null}
    {result.ok ? <AdminSummaryStrip items={[{ label: "Matching", value: result.data.pagination.total, tone: "brand" }, { label: "New on page", value: rows.filter((row) => row.status === "NEW").length, tone: "warning" }, { label: "Reviewed on page", value: rows.filter((row) => row.status === "REVIEWED").length, tone: "success" }]} /> : null}
    <AdminCard padding={16} className="mt-4"><form method="get" action="/admin/careers/applications"><ResponsiveFilterBar>
      <label><span className="gh-field-label">Country</span><select name="countryId" className="gh-select" defaultValue={filters.countryId}><option value="">All countries</option>{countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}</select></label>
      <label><span className="gh-field-label">Job</span><select name="jobId" className="gh-select" defaultValue={filters.jobId}><option value="">All jobs</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title} · {job.country.name}</option>)}</select></label>
      <label><span className="gh-field-label">Status</span><select name="status" className="gh-select" defaultValue={filters.status}><option value="">Any status</option><option value="NEW">New</option><option value="REVIEWED">Reviewed</option></select></label>
      <label><span className="gh-field-label">Submitted from</span><input name="submittedFrom" type="date" className="gh-input" defaultValue={filters.submittedFrom} /></label>
      <label><span className="gh-field-label">Submitted to</span><input name="submittedTo" type="date" className="gh-input" defaultValue={filters.submittedTo} /></label>
      <button className="gh-btn gh-btn-primary" type="submit">Filter</button>
    </ResponsiveFilterBar></form></AdminCard>
    <AdminCard padding={0} className="mt-4 overflow-hidden">{!result.ok ? <AdminEmptyState title="Could not load applications" description={result.message} /> : rows.length === 0 ? <AdminEmptyState title="No applications found" description="No records match these non-sensitive filters." /> : <ApplicationsTable rows={rows} />}</AdminCard>
    {result.ok && result.data.pagination.totalPages > 1 ? <nav className="gh-admin-careers-pagination" aria-label="Application pages">
      {result.data.pagination.page > 1 ? <Link href={{ pathname: "/admin/careers/applications", query: { ...filters, page: String(result.data.pagination.page - 1) } }}>Previous</Link> : <span />}
      <span>Page {result.data.pagination.page} of {result.data.pagination.totalPages}</span>
      {result.data.pagination.page < result.data.pagination.totalPages ? <Link href={{ pathname: "/admin/careers/applications", query: { ...filters, page: String(result.data.pagination.page + 1) } }}>Next</Link> : <span />}
    </nav> : null}
  </>;
}
