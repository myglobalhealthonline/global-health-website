import Link from "next/link";
import {
  ADMIN_PAGE_CONTENT_KEYS,
  ADMIN_PAGE_CONTENT_KEY_LABELS,
  fetchAdminPageContentList,
  type AdminPageContentKey,
  type AdminPageContentListItem,
} from "@/lib/admin/admin-api";
import { AdminCard, PageHeader, Pill } from "../_components/atoms";
import { FlagBadge } from "../_components/flag-badge";

export const dynamic = "force-dynamic";

function cellTone(item: AdminPageContentListItem | undefined): "draft" | "published" | "inactive" | "neutral" {
  if (!item || !item.configured) return "neutral";
  if (!item.isActive) return "inactive";
  return item.status === "PUBLISHED" ? "published" : "draft";
}

function cellLabel(item: AdminPageContentListItem | undefined): string {
  if (!item || !item.configured) return "Not configured";
  if (!item.isActive) return "Disabled";
  return item.status === "PUBLISHED" ? "Published" : "Draft";
}

export default async function AdminPageContentOverview() {
  const result = await fetchAdminPageContentList();
  const items = result.ok ? result.data.items : [];

  const byCountry = new Map<string, { countryId: string; countryCode: string; countryName: string; byKey: Map<string, AdminPageContentListItem> }>();
  for (const item of items) {
    let entry = byCountry.get(item.countryId);
    if (!entry) {
      entry = { countryId: item.countryId, countryCode: item.countryCode, countryName: item.countryName, byKey: new Map() };
      byCountry.set(item.countryId, entry);
    }
    entry.byKey.set(item.pageKey, item);
  }
  const countryRows = Array.from(byCountry.values()).sort((a, b) => a.countryName.localeCompare(b.countryName));

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Page content"
        description="Per-country structured copy for the home, GP hub, specialist hub, doctors index, prescriptions, and health tests pages. Toggle sections and publish per country."
      />

      {!result.ok ? (
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            Could not load page content: {result.message}
          </p>
        </AdminCard>
      ) : countryRows.length === 0 ? (
        <AdminCard>
          <p className="text-portal-compact text-[var(--color-text-muted)]">No active countries yet.</p>
        </AdminCard>
      ) : (
        <AdminCard padding={0} className="overflow-x-auto">
          <table className="gh-admin-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--portal-line-strong)" }}>
                <th style={{ padding: "13px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--portal-muted)" }}>
                  Country
                </th>
                {ADMIN_PAGE_CONTENT_KEYS.map((key) => (
                  <th
                    key={key}
                    style={{ padding: "13px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--portal-muted)" }}
                  >
                    {ADMIN_PAGE_CONTENT_KEY_LABELS[key]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {countryRows.map((row) => (
                <tr key={row.countryId} className="gh-admin-row">
                  <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                    <span className="inline-flex items-center gap-2">
                      <FlagBadge code={row.countryCode} />
                      <span className="font-semibold text-[var(--color-text-primary)]">{row.countryName}</span>
                    </span>
                  </td>
                  {ADMIN_PAGE_CONTENT_KEYS.map((key: AdminPageContentKey) => {
                    const item = row.byKey.get(key);
                    return (
                      <td key={key} style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                        <Link
                          href={`/admin/page-content/${row.countryId}/${key}`}
                          className="inline-flex items-center gap-2 hover:underline"
                        >
                          <Pill tone={cellTone(item)} withDot>
                            {cellLabel(item)}
                          </Pill>
                          {item && item.enabledSectionCount > 0 ? (
                            <span className="text-portal-thead text-[var(--color-text-muted)]">
                              {item.enabledSectionCount} section{item.enabledSectionCount === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}
    </>
  );
}
