/**
 * Categories matrix screen.
 *
 * Reference: ui_kits/admin/Screens2.jsx CategoriesMatrixScreen.
 * One row per category, one column per country, cells = toggles.
 *
 * Schema note: in this codebase, Specialty is per-country (`countryId`),
 * not global. So we group rows by lowercased `slug` and treat the
 * matrix cell as "this country has a specialty with this slug" — toggling
 * on either reactivates a soft-deleted row, creates a new row, or toggles
 * the existing one off.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Heart, MoreHorizontal, Plus, Stethoscope } from "lucide-react";
import {
  deleteAdminSpecialty,
  fetchAdminCountries,
  fetchAdminSpecialties,
  patchAdminSpecialty,
  postAdminSpecialty,
} from "@/lib/admin/admin-api";
import { FlagBadge } from "../_components/flag-badge";
import {
  AdminCard,
  AdminTable,
  Btn,
  IconBtn,
  PageHeader,
  Pill,
  Td,
  Th,
  Thead,
  Toggle,
  Tr,
} from "../_components/atoms";

export const dynamic = "force-dynamic";

type SpecialtyRow = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
};

// Slugs that are conceptually "general practice" rather than specialist.
const GENERAL_SLUGS = new Set([
  "general",
  "general-practice",
  "family-medicine",
  "weight-loss",
  "weight-management",
  "primary-care",
]);

type GridRow = {
  slug: string;
  name: string;
  type: "GENERAL" | "SPECIALIST";
  byCountry: Record<string, SpecialtyRow | undefined>;
};

type PageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminCategoriesMatrixPage({
  searchParams,
}: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const countriesResult = await fetchAdminCountries();

  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader eyebrow="Global" title="Categories" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load countries: {countriesResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const countries = countriesResult.data.countries
    .map((c) => ({ id: c.id, slug: c.slug, code: c.code, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Fetch specialties per country in parallel
  const perCountry = await Promise.all(
    countries.map((c) =>
      fetchAdminSpecialties(c.id).then((res) => ({
        countryId: c.id,
        items: res.ok ? res.data.specialties : [],
      })),
    ),
  );

  // Build the matrix: key = lowercased slug
  const matrix = new Map<string, GridRow>();
  for (const country of perCountry) {
    for (const s of country.items) {
      const slug = s.slug.toLowerCase();
      const isGeneral = GENERAL_SLUGS.has(slug);
      const existing = matrix.get(slug);
      const row: GridRow =
        existing ?? {
          slug,
          name: s.name,
          type: isGeneral ? "GENERAL" : "SPECIALIST",
          byCountry: {},
        };
      row.byCountry[country.countryId] = {
        id: s.id,
        slug: s.slug,
        name: s.name,
        active: s.active,
      };
      matrix.set(slug, row);
    }
  }

  const rows = Array.from(matrix.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // ── Server action: toggle a category for a specific country ──
  async function toggleCategoryAction(formData: FormData) {
    "use server";
    const countryId = String(formData.get("countryId") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const existingId = String(formData.get("existingId") ?? "").trim();
    const currentActive = formData.get("currentActive") === "true";

    if (!countryId || !slug) {
      redirect(`/admin/specialties?error=${encodeURIComponent("Missing data")}`);
    }

    if (existingId) {
      // Toggle existing row's active flag
      if (currentActive) {
        const res = await deleteAdminSpecialty(existingId);
        if (!res.ok) {
          redirect(`/admin/specialties?error=${encodeURIComponent(res.message)}`);
        }
      } else {
        const res = await patchAdminSpecialty(existingId, { active: true });
        if (!res.ok) {
          redirect(`/admin/specialties?error=${encodeURIComponent(res.message)}`);
        }
      }
    } else {
      // Create new row, active=true
      const res = await postAdminSpecialty({
        countryId,
        slug,
        name,
        active: true,
        sortOrder: 0,
      });
      if (!res.ok) {
        redirect(`/admin/specialties?error=${encodeURIComponent(res.message)}`);
      }
    }

    revalidatePath("/admin/specialties");
    redirect(`/admin/specialties?success=${encodeURIComponent("Updated")}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Categories"
        description="One global pool of specialties. Toggle cells to enable a category in a specific country."
        actions={
          <Btn
            href="/admin/specialties/new"
            variant="primary"
            iconLeft={<Plus className="size-3.5" aria-hidden />}
          >
            New category
          </Btn>
        }
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.success}
        </p>
      ) : null}

      <AdminCard padding={0} className="overflow-hidden">
        <div className="overflow-x-auto">
          <AdminTable>
            <Thead>
              <Th>Category</Th>
              <Th>Type</Th>
              {countries.map((c) => (
                <Th key={c.id} align="center">
                  <span className="inline-flex items-center gap-1.5">
                    <FlagBadge code={c.code} size={14} />
                    {c.name}
                  </span>
                </Th>
              ))}
              <Th align="right">In use</Th>
              <Th align="right" style={{ width: 60 }}>
                {" "}
              </Th>
            </Thead>
            <tbody>
              {rows.length === 0 ? (
                <Tr>
                  <Td style={{ paddingLeft: 20 }} align="left">
                    <span className="text-[var(--color-text-muted)]">
                      No categories yet — create one to get started.
                    </span>
                  </Td>
                  {countries.map((c) => (
                    <Td key={c.id} />
                  ))}
                  <Td />
                  <Td />
                  <Td />
                </Tr>
              ) : (
                rows.map((row) => {
                  const inUse = Object.values(row.byCountry).filter(
                    (s) => s?.active,
                  ).length;
                  return (
                    <Tr key={row.slug}>
                      <Td style={{ minWidth: 220 }}>
                        <div className="flex items-center gap-3">
                          <span
                            className="inline-flex shrink-0 items-center justify-center"
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: "rgba(200,230,160,0.30)",
                              color: "var(--color-brand-primary)",
                            }}
                          >
                            {row.type === "GENERAL" ? (
                              <Heart className="size-4" aria-hidden />
                            ) : (
                              <Stethoscope className="size-4" aria-hidden />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="m-0 whitespace-nowrap text-[14px] font-bold text-[var(--color-text-primary)]">
                              {row.name}
                            </p>
                            <p className="m-0 whitespace-nowrap font-mono text-[11px] text-[var(--color-text-muted)]">
                              /{row.slug}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <Pill tone={row.type === "GENERAL" ? "neutral" : "published"}>
                          {row.type.toLowerCase()}
                        </Pill>
                      </Td>
                      {countries.map((c) => {
                        const cell = row.byCountry[c.id];
                        const isActive = !!cell?.active;
                        return (
                          <Td key={c.id} align="center" style={{ padding: "14px 0" }}>
                            <form action={toggleCategoryAction} className="inline-block">
                              <input type="hidden" name="countryId" value={c.id} />
                              <input type="hidden" name="slug" value={row.slug} />
                              <input type="hidden" name="name" value={row.name} />
                              <input
                                type="hidden"
                                name="existingId"
                                value={cell?.id ?? ""}
                              />
                              <input
                                type="hidden"
                                name="currentActive"
                                value={isActive ? "true" : "false"}
                              />
                              <Toggle
                                on={isActive}
                                ariaLabel={`Toggle ${row.name} for ${c.name}`}
                              />
                            </form>
                          </Td>
                        );
                      })}
                      <Td align="right">
                        <span className="text-[12px] text-[var(--color-text-muted)]">
                          {inUse} / {countries.length}
                        </span>
                      </Td>
                      <Td align="right">
                        <IconBtn
                          ariaLabel={`More options for ${row.name}`}
                          href={`/admin/specialties/${
                            // link to first existing specialty row's edit page
                            Object.values(row.byCountry).find((s) => s)?.id ?? ""
                          }/edit`}
                        >
                          <MoreHorizontal className="size-3.5" aria-hidden />
                        </IconBtn>
                      </Td>
                    </Tr>
                  );
                })
              )}
            </tbody>
          </AdminTable>
        </div>
      </AdminCard>

      <p className="mt-6 text-[12px] text-[var(--color-text-muted)]">
        Categories without a service yet won&apos;t appear on the public site. Add a specialist consultation under{" "}
        <Link
          href="/admin/specialist-consultations"
          className="font-bold text-[var(--color-brand-primary)] underline underline-offset-2"
        >
          Specialist consultations
        </Link>
        .
      </p>
    </>
  );
}
