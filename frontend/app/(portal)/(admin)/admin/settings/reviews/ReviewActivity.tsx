import Link from "next/link";
import { redirect } from "next/navigation";
import { ColumnPriorityTable } from "@/components/ColumnPriorityTable";
import { fetchReviewActivity, actOnReviewActivity, type ReviewActivityRow } from "@/lib/admin/admin-api/settings";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { Btn } from "../../_components/atoms";

const labels: Record<string, string> = { queued: "Scheduled", sent: "Invitations sent", followups: "Reminders sent", opened: "Review site selected", reported: "Patient reported a review", stopped: "Stopped", failed: "Failed emails", unknown: "Delivery needs checking" };
const countries = ["IE", "CZ", "PT", "ES", "RO", "BR"];
function date(value: string | null) { return value ? new Date(value).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC" : "—"; }
export async function ReviewActivity({ searchParams: sp }: { searchParams: { page?: string; country?: string; status?: string } }) {
  const query = new URLSearchParams();
  for (const key of ["page", "country", "status"] as const) if (sp[key]) query.set(key, sp[key]);
  const result = await fetchReviewActivity(query.toString());
  if (!result.ok) return <p role="alert">Could not load review activity: {result.message}</p>;
  const { rows, total, page, pageSize, counts } = result.data;
  async function action(data: FormData) {
    "use server";
    await requireAdminAction();
    const operation = data.get("action");
    if (operation !== "stop" && operation !== "retry") throw new Error("Invalid action");
    const response = await actOnReviewActivity(String(data.get("id") ?? ""), operation);
    redirect(`/admin/settings/reviews?tab=activity&${response.ok ? "success" : "error"}=${encodeURIComponent(response.ok ? response.message ?? "Updated" : response.message)}`);
  }
  function actions(row: ReviewActivityRow) {
    const failed = row.deliveries.find((d) => d.status === "FAILED");
    return <div className="flex flex-wrap gap-2">
      {!row.stoppedAt ? <form action={action}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="action" value="stop" /><Btn type="submit" variant="secondary">Stop</Btn></form> : null}
      {failed && (!row.stoppedAt || row.stopReason === "failed") ? <form action={action}><input type="hidden" name="id" value={failed.id} /><input type="hidden" name="action" value="retry" /><Btn type="submit" variant="secondary">Retry failed email</Btn></form> : null}
    </div>;
  }
  function pageLink(next: number) { const q = new URLSearchParams(query); q.set("tab", "activity"); q.set("page", String(next)); return `?${q}`; }
  return <div className="grid gap-4">
    <form className="flex flex-wrap items-end gap-3"><input type="hidden" name="tab" value="activity" /><label>Country<select name="country" defaultValue={sp.country ?? ""} className="gh-select"><option value="">All countries</option>{countries.map((code) => <option key={code}>{code}</option>)}</select></label><label>Status<select name="status" defaultValue={sp.status ?? ""} className="gh-select"><option value="">All activity</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><Btn type="submit" variant="secondary">Filter</Btn></form>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Object.entries(labels).map(([key, label]) => { const filter = new URLSearchParams({ tab: "activity", status: key }); if (sp.country) filter.set("country", sp.country); return <Link key={key} href={`?${filter}`} aria-current={sp.status === key ? "page" : undefined} className={`flex min-h-24 flex-col justify-between gap-2 rounded-xl border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${sp.status === key ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white" : "border-[var(--color-border)] hover:bg-[var(--color-background-soft)]"}`}><span className="text-sm">{label}</span><strong className="text-2xl">{counts[key] ?? 0}</strong></Link>; })}</div>
    <p className="text-sm text-[var(--color-text-muted)]">Select a card to filter activity. Counts are invitation sequences, so a patient can appear in several categories. Selecting a review site does not confirm a posted review.</p>
    <details className="text-sm text-[var(--color-text-muted)]"><summary className="cursor-pointer py-2">How delivery tracking works</summary><p>Sent means accepted by the email service, not confirmed delivered. Uncertain delivery is never retried automatically. External review confirmation is not connected.</p></details>
    <ColumnPriorityTable rows={rows} getRowKey={(row) => row.id} emptyState={<div className="rounded-xl border border-[var(--color-border)] p-8 text-center"><h2 className="font-semibold">No review emails to show</h2><p className="mt-2 text-sm">Invitations appear here after automation is enabled and an eligible consultation is completed. Try another filter if emails have already been sent.</p><Link href="?tab=automation" className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[var(--color-border)] px-4 font-semibold">Review email settings →</Link></div>} cardActions={actions} fields={[
      { key: "reference", label: "Appointment", priority: 1, cardPrimary: true, render: (row) => row.orderNumber ?? row.appointmentId ?? "Deleted appointment" },
      { key: "country", label: "Country", priority: 1, render: (row) => row.countryCode ?? "—" },
      { key: "last", label: "Last sent", priority: 1, render: (row) => date(row.deliveries.filter((d) => d.sentAt).map((d) => d.sentAt!).sort().at(-1) ?? null) },
      { key: "followups", label: "Follow-ups / limit", priority: 1, render: (row) => `${row.deliveries.filter((d) => d.stage > 0 && d.status === "SENT").length} / ${row.maxFollowups}` },
      { key: "next", label: "Next send", priority: 1, render: (row) => date(row.nextSendAt) },
      { key: "reason", label: "Status / reason", priority: 1, render: (row) => row.stopReason ? (labels[{ provider_opened: "opened", patient_reviewed: "reported", provider_confirmed: "confirmed" }[row.stopReason] ?? ""] ?? row.stopReason.replaceAll("_", " ")) : row.deliveries.find((d) => d.error)?.error ?? "Active" },
      { key: "actions", label: "Actions", priority: 1, desktopOnly: true, render: actions },
    ]} />
    <div className="flex gap-4 text-sm"><span>{total} sequences · page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>{page > 1 ? <Link href={pageLink(page - 1)}>Previous</Link> : null}{page * pageSize < total ? <Link href={pageLink(page + 1)}>Next</Link> : null}</div>
  </div>;
}
