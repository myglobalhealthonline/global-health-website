import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  ADMIN_PAGE_CONTENT_KEYS,
  ADMIN_PAGE_CONTENT_KEY_LABELS,
  fetchAdminPageContentList,
  patchPageContentFlags,
  type AdminPageContentKey,
  type AdminPageContentListItem,
  type AdminPageContentStatus,
} from "@/lib/admin/admin-api";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { AdminCard, PageHeader } from "../_components/atoms";
import { FlagBadge } from "../_components/flag-badge";
import { PageContentCell } from "./_components/page-content-cell";

export const dynamic = "force-dynamic";

// Every translation locale the page-content admin supports. The flags PATCH
// only knows the (countryId, pageKey) it changed, not which locales that
// country has enabled, so on a flip we bust the public cache tag for all of
// them — revalidateTag is just a stale-mark, cheap even for tags with no
// cached entry.
const ALL_PAGE_CONTENT_LOCALES = ["EN", "PT", "ES", "CS", "RO", "DE"] as const;

function isPageKey(value: string): value is AdminPageContentKey {
  return (ADMIN_PAGE_CONTENT_KEYS as string[]).includes(value);
}

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminPageContentOverview({ searchParams }: PageProps) {
  const messages = searchParams ? await searchParams : {};
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

  async function setFlagsAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const countryId = String(formData.get("countryId") ?? "").trim();
    const countryCode = String(formData.get("countryCode") ?? "").trim().toUpperCase();
    const pageKeyRaw = String(formData.get("pageKey") ?? "").trim();
    const field = String(formData.get("field") ?? "").trim();
    const nextValue = String(formData.get("nextValue") ?? "").trim();

    if (!countryId || !isPageKey(pageKeyRaw) || (field !== "status" && field !== "isActive")) {
      redirect(`/admin/page-content?error=${encodeURIComponent("Invalid toggle request")}`);
    }
    const pageKey = pageKeyRaw as AdminPageContentKey;
    const patch: { status?: AdminPageContentStatus; isActive?: boolean } =
      field === "status" ? { status: nextValue as AdminPageContentStatus } : { isActive: nextValue === "true" };

    const res = await patchPageContentFlags(countryId, pageKey, patch);
    if (!res.ok) {
      redirect(`/admin/page-content?error=${encodeURIComponent(res.message)}`);
    }

    revalidatePath("/admin/page-content");
    if (countryCode) {
      for (const locale of ALL_PAGE_CONTENT_LOCALES) {
        revalidateTag(SITE_CACHE_TAGS.countryPageContent(countryCode, pageKey, locale), "max");
      }
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Page content"
        description="Per-country structured copy for the home, GP hub, specialist hub, doctors index, prescriptions, and health tests pages. Publish, activate, or open the full editor per cell."
      />

      {messages?.error ? (
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{messages.error}</p>
        </AdminCard>
      ) : null}

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
                        <PageContentCell
                          countryId={row.countryId}
                          countryCode={row.countryCode}
                          countryName={row.countryName}
                          pageKey={key}
                          pageLabel={ADMIN_PAGE_CONTENT_KEY_LABELS[key]}
                          editHref={`/admin/page-content/${row.countryId}/${key}`}
                          configured={!!item?.configured}
                          status={item?.status ?? null}
                          isActive={item?.isActive ?? null}
                          enabledSectionCount={item?.enabledSectionCount ?? 0}
                          setFlagsAction={setFlagsAction}
                        />
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
