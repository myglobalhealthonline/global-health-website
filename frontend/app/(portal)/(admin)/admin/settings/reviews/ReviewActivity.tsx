import Link from "next/link";
import { redirect } from "next/navigation";
import { ColumnPriorityTable } from "@/components/ColumnPriorityTable";
import { fetchReviewActivity, actOnReviewActivity, type ReviewActivityRow } from "@/lib/admin/admin-api/settings";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { Btn } from "../../_components/atoms";

const labels: Record<string, string> = { queued: "Queued", sent: "Initial email sent", followups: "Sequences with follow-ups sent", opened: "Review site opened (unconfirmed)", reported: "Patient says reviewed", confirmed: "Review confirmed by provider", stopped: "Stopped", failed: "Failed", unknown: "Acceptance unknown" };
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
    <div className="flex flex-wrap gap-3">{Object.entries(labels).map(([key, label]) => <span key={key} className="rounded border border-[var(--color-border)] p-3 text-sm">{label}: <strong>{counts[key] ?? 0}</strong></span>)}</div>
    <p className="text-sm text-[var(--color-text-muted)]">Counts reflect the selected country; a sequence can appear in more than one category. Sent means accepted by the email provider, not confirmed delivered. Unknown acceptance is never automatically retried.</p>
    <ColumnPriorityTable rows={rows} getRowKey={(row) => row.id} emptyState={<p>No matching review activity.</p>} cardActions={actions} fields={[
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
