import { fetchNewsletterSubscribers, type NewsletterSubscriberDto } from "@/lib/admin/admin-api";
import {
  AdminCard,
  AdminEmptyState,
  AdminSummaryStrip,
  Btn,
  PageHeader,
  Pill,
} from "../_components/atoms";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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
            assetSrc="/images/portal/obsidian/empty-content.svg"
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
          <ColumnPriorityTable<NewsletterSubscriberDto>
            fields={newsletterFields}
            rows={result.items}
            getRowKey={(s) => s.id}
            cardTone={(s) => (s.unsubscribedAt ? "neutral" : "success")}
          />
        </AdminCard>
      )}
    </>
  );
}

const newsletterFields: ColumnPriorityField<NewsletterSubscriberDto>[] = [
  {
    key: "email",
    label: "Email",
    priority: 1,
    render: (s) => <span className="break-all font-semibold text-[var(--color-text-primary)]">{s.email}</span>,
  },
  {
    key: "status",
    label: "Status",
    priority: 1,
    render: (s) => (
      <Pill tone={s.unsubscribedAt ? "inactive" : "active"}>
        {s.unsubscribedAt ? "Unsubscribed" : "Active"}
      </Pill>
    ),
  },
  {
    key: "countryCode",
    label: "Country",
    priority: 2,
    render: (s) => s.countryCode ?? "—",
  },
  {
    key: "createdAt",
    label: "Signed up",
    priority: 2,
    render: (s) => fmtDate(s.createdAt),
  },
  {
    key: "source",
    label: "Source",
    priority: 3,
    render: (s) => s.source ?? "—",
  },
  {
    key: "locale",
    label: "Locale",
    priority: 3,
    render: (s) => s.locale ?? "—",
  },
];
