import { revalidateTag } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  fetchAdminServices,
  fetchOrphanedMedia,
  patchAdminService,
  type AdminServiceDto,
} from "@/lib/admin/admin-api";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { AdminCard, AdminEmptyState, Btn, PageHeader, Pill } from "../../_components/atoms";

// Post-incident recovery tool (2026-07-05 Service-table wipe): the cascade
// hard-deleted every Asset row tied to a service, but the image FILES
// survived in the bucket. This page lists the orphaned files so an admin
// can eyeball each one and re-attach it to a service — no automated
// matching is possible (bucket keys carry no service reference).
export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function groupByCountry(services: AdminServiceDto[]) {
  const groups = new Map<string, AdminServiceDto[]>();
  for (const s of services) {
    const key = `${s.country.code.toUpperCase()} · ${s.country.name}`;
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export default async function OrphanedMediaPage() {
  const [mediaResult, servicesResult] = await Promise.all([
    fetchOrphanedMedia(),
    fetchAdminServices({ pageSize: "100" }),
  ]);

  const orphaned = mediaResult.ok ? mediaResult.data.orphaned : [];
  const services = servicesResult.ok ? servicesResult.data.items : [];
  const servicesById = new Map(services.map((s) => [s.id, s]));
  const grouped = groupByCountry(services);

  async function assignAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const publicUrl = String(formData.get("publicUrl") ?? "");
    const serviceId = String(formData.get("serviceId") ?? "");
    const mode = String(formData.get("mode") ?? "hero");
    if (!publicUrl || !serviceId) return;

    if (mode === "gallery") {
      const service = servicesById.get(serviceId);
      const next = Array.from(new Set([...(service?.galleryImagePaths ?? []), publicUrl]));
      await patchAdminService(serviceId, { galleryImagePaths: next });
    } else {
      await patchAdminService(serviceId, { imagePath: publicUrl });
    }
    revalidateTag(SITE_CACHE_TAGS.globalServices(), "max");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Recovery"
        title="Orphaned service images"
        description="Files from the 2026-07-05 Service-table wipe that still exist in storage but lost their database link. Pick the right service for each image below — hero replaces the existing detail-page image, gallery appends to the extra product images."
      />

      {!mediaResult.ok ? (
        <AdminEmptyState
          title="Could not load orphaned media"
          description={mediaResult.message}
          tone="danger"
        />
      ) : orphaned.length === 0 ? (
        <AdminEmptyState
          title="Nothing orphaned"
          description="Every image in storage is already linked to a service, or storage is empty."
        />
      ) : (
        <>
          <AdminCard padding={16} className="mb-4">
            <p className="text-[13px]" style={{ color: "var(--portal-text-2)" }}>
              <strong>{orphaned.length}</strong> unlinked file{orphaned.length === 1 ? "" : "s"} found
              in storage. Filenames are generic (uploads keep only a random id + the original
              filename) — there is no automatic way to know which service each one belonged to.
            </p>
          </AdminCard>

          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            {orphaned.map((item) => (
              <AdminCard key={item.key} padding={12}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.publicUrl}
                  alt=""
                  loading="lazy"
                  className="mb-3 h-40 w-full rounded-lg object-cover"
                  style={{ background: "var(--portal-surface-2)" }}
                />
                <p
                  className="mb-1 truncate text-[11px]"
                  style={{ color: "var(--portal-text-3)" }}
                  title={item.key}
                >
                  {item.key.replace(/^media\//, "")}
                </p>
                <p className="mb-3 text-[11px]" style={{ color: "var(--portal-text-3)" }}>
                  {formatBytes(item.size)}
                  {item.lastModified ? ` · ${new Date(item.lastModified).toLocaleDateString()}` : ""}
                </p>
                <form action={assignAction} className="flex flex-col gap-2">
                  <input type="hidden" name="publicUrl" value={item.publicUrl} />
                  <select
                    name="serviceId"
                    required
                    defaultValue=""
                    className="gh-select w-full"
                    style={{ fontSize: 12 }}
                  >
                    <option value="" disabled>
                      Choose a service…
                    </option>
                    {grouped.map(([countryLabel, list]) => (
                      <optgroup key={countryLabel} label={countryLabel}>
                        {list.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.isActive ? "" : "(draft)"}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Btn type="submit" name="mode" value="hero" variant="soft" size="sm">
                      Set as hero
                    </Btn>
                    <Btn type="submit" name="mode" value="gallery" variant="ghost" size="sm">
                      Add to gallery
                    </Btn>
                  </div>
                </form>
              </AdminCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
