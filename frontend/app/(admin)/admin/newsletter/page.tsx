import { fetchNewsletterSubscribers } from "@/lib/admin/admin-api";
import {
  AdminCard,
  AdminEmptyState,
  AdminSummaryStrip,
  Btn,
  PageHeader,
  Pill,
} from "../_components/atoms";

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage() {
  const fetched = await fetchNewsletterSubscribers();
  const result = fetched.ok
    ? { ok: true as const, items: fetched.data.items }
    : { ok: false as const, message: fetched.message };
  const activeCount = result.ok ? result.items.filter((s) => !s.unsubscribedAt).length : 0;
  const localizedCount = result.ok ? result.items.filter((s) => s.locale || s.countryCode).length : 0;

  return (
    <>
      {/* Download CSV uses the same-origin Next route handler at
          /api/admin/newsletter.csv which forwards the session cookie to
          the backend. A direct cross-origin <a href> would 401 because
          the browser doesn't send cookies on cross-site navigations. */}
      <PageHeader
        className="gh-admin-area-hero gh-admin-area-content"
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
          <AdminEmptyState
            assetSrc="/images/portal/generated/admin-content-management-accent.png"
            title="No newsletter subscribers yet"
            description="Subscribers from the public footer form will appear here with source, country, locale, and unsubscribe status."
          />
        </AdminCard>
      ) : (
        <AdminCard padding={0}>
          <div className="border-b border-[var(--color-border)] px-4 pt-4">
            <AdminSummaryStrip
              items={[
                {
                  label: "Subscribers",
                  value: result.items.length,
                  hint: "Total captured",
                  tone: "brand",
                },
                {
                  label: "Active",
                  value: activeCount,
                  hint: `${result.items.length - activeCount} unsubscribed`,
                  tone: activeCount > 0 ? "success" : "neutral",
                },
                {
                  label: "Localized",
                  value: localizedCount,
                  hint: "Country or locale set",
                  tone: localizedCount > 0 ? "neutral" : "warning",
                },
              ]}
            />
          </div>
          <div className="gh-admin-area-hero gh-admin-area-content gh-admin-ops-table-wrap gh-admin-deep-table-wrap overflow-x-auto">
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
                <tr key={s.id} className="gh-admin-area-hero gh-admin-area-content gh-admin-newsletter-row">
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
                      <span className="gh-admin-area-hero gh-admin-area-content gh-admin-ops-badge inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">Unsubscribed</span>
                    ) : (
                      <span className="gh-admin-area-hero gh-admin-area-content gh-admin-ops-badge inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="gh-admin-mobile-list">
            {result.items.map((s) => (
              <article key={s.id} className="gh-admin-mobile-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="gh-admin-mobile-card-title break-all">{s.email}</h3>
                    <p className="gh-admin-mobile-card-meta">{s.source ?? "No source"}</p>
                  </div>
                  <Pill tone={s.unsubscribedAt ? "inactive" : "active"}>
                    {s.unsubscribedAt ? "Unsubscribed" : "Active"}
                  </Pill>
                </div>
                <div className="grid gap-1 text-[12px] text-[var(--color-text-muted)]">
                  <span>Country: {s.countryCode ?? "-"}</span>
                  <span>Locale: {s.locale ?? "-"}</span>
                  <span>
                    Signed up{" "}
                    {new Date(s.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </AdminCard>
      )}
    </>
  );
}
