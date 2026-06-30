import { fetchNewsletterSubscribers } from "@/lib/admin/admin-api";
import {
  AdminCard,
  Btn,
  PageHeader,
} from "../_components/atoms";

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage() {
  const fetched = await fetchNewsletterSubscribers();
  const result = fetched.ok
    ? { ok: true as const, items: fetched.data.items }
    : { ok: false as const, message: fetched.message };

  return (
    <>
      {/* Download CSV uses the same-origin Next route handler at
          /api/admin/newsletter.csv which forwards the session cookie to
          the backend. A direct cross-origin <a href> would 401 because
          the browser doesn't send cookies on cross-site navigations. */}
      <PageHeader
        eyebrow="Marketing"
        title="Newsletter subscribers"
        description="People who signed up via the public footer form. Export CSV for your mailer."
        actions={
          <Btn
            href="/api/admin/newsletter.csv"
            variant="primary"
            size="md"
          >
            Download CSV
          </Btn>
        }
      />

      {!result.ok ? (
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </AdminCard>
      ) : result.items.length === 0 ? (
        <AdminCard>
          <p className="text-sm text-[var(--color-text-muted)]">
            No subscribers yet. Once visitors use the footer form they&apos;ll
            land here.
          </p>
        </AdminCard>
      ) : (
        <AdminCard padding={0}>
          <div className="gh-admin-ops-table-wrap overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[var(--color-background-soft)] text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Country</th>
                <th className="px-4 py-3 font-semibold">Locale</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Signed up</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {result.items.map((s) => (
                <tr key={s.id} className="gh-admin-newsletter-row">
                  <td className="px-4 py-2 font-semibold text-[var(--color-text-primary)]">{s.email}</td>
                  <td className="px-4 py-2">{s.countryCode ?? "—"}</td>
                  <td className="px-4 py-2">{s.locale ?? "—"}</td>
                  <td className="px-4 py-2">{s.source ?? "—"}</td>
                  <td className="px-4 py-2">
                    {new Date(s.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-2">
                    {s.unsubscribedAt ? (
                      <span className="gh-admin-ops-badge inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">Unsubscribed</span>
                    ) : (
                      <span className="gh-admin-ops-badge inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </AdminCard>
      )}
    </>
  );
}
