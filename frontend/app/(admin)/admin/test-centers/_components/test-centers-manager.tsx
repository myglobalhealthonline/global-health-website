import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  createAdminExamType,
  createAdminTestCenter,
  createAdminTestCenterExam,
  deleteAdminExamType,
  deleteAdminTestCenter,
  deleteAdminTestCenterExam,
  fetchAdminExamTypeCategories,
  fetchAdminExamTypes,
  fetchAdminTestCenterExams,
  fetchAdminTestCenters,
  updateAdminExamType,
  updateAdminTestCenter,
  updateAdminTestCenterExam,
  type AdminExamTypeDto,
  type AdminPagination,
  type AdminTestCenterDto,
  type AdminTestCenterExamDto,
} from "@/lib/admin/admin-api";
import {
  AdminCard,
  AdminTable,
  Btn,
  PageHeader,
  Pill,
  Td,
  Th,
  Thead,
  Tr,
} from "../../_components/atoms";
import { FlagBadge } from "../../_components/flag-badge";

type ManagerSearchParams = Record<string, string | undefined>;

/** Rows per page for the two big tables. The catalogue holds thousands of rows
 *  once a supplier price list is imported, so nothing here is ever unbounded. */
const PAGE_SIZE = 50;
/** How many catalogue matches the "add an exam" picker offers at a time. */
const PICKER_LIMIT = 25;

function centsToInput(cents: number | null | undefined): string {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

function formatMoney(cents: number | null | undefined, currency: string | null): string {
  if (cents == null) return "—";
  const amount = (cents / 100).toFixed(2);
  return currency ? `${amount} ${currency}` : amount;
}

/** Parse a decimal amount into integer cents. Accepts "35", "35.00", "35,00"
 *  (comma decimal). Returns null for blank/invalid. Matches the insurance
 *  manager's parser so "35" is always 3500, never 3499. */
function amountToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/[^\d.,]/g, "").replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Human-readable markup summary for a row. */
function markupLabel(mode: "FIXED" | "PERCENT", value: number, currency: string): string {
  return mode === "PERCENT"
    ? `+${(value / 100).toFixed(value % 100 === 0 ? 0 : 2)}%`
    : `+${formatMoney(value, currency)}`;
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Prev/next bar for a server-paginated table. Collapses to a row count when
 *  everything fits on one page. */
function Pager({
  pagination,
  hrefForPage,
}: {
  pagination: AdminPagination;
  hrefForPage: (page: number) => string;
}) {
  const { page, pageSize, total, totalPages } = pagination;
  if (totalPages <= 1) {
    return (
      <p className="m-0 px-1 py-2 text-[12px] text-[var(--color-text-muted)]">
        {total} {total === 1 ? "row" : "rows"}
      </p>
    );
  }
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-1 py-3 text-[12px]">
      <div className="text-[var(--color-text-muted)]">
        Page {page} of {totalPages} · {total} rows · {pageSize} per page
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={hrefForPage(Math.max(1, page - 1))}
          className={`gh-btn gh-btn-soft text-[12px] ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
        >
          Previous
        </Link>
        <Link
          href={hrefForPage(Math.min(totalPages, page + 1))}
          className={`gh-btn gh-btn-primary text-[12px] ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
        >
          Next
        </Link>
      </div>
    </nav>
  );
}

/** Search + category filter bar. Submits as GET so the filter state lives in
 *  the URL; `carried` holds the other view params so paging/panels survive. */
function FilterBar({
  action,
  carried,
  searchKey,
  categoryKey,
  categories,
  searchValue,
  categoryValue,
  placeholder,
  clearHref,
}: {
  action: string;
  carried: [string, string][];
  searchKey: string;
  categoryKey: string;
  categories: string[];
  searchValue: string | undefined;
  categoryValue: string | undefined;
  placeholder: string;
  clearHref: string;
}) {
  return (
    <form method="get" action={action} className="flex flex-wrap items-end gap-2">
      {carried.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <label className="flex flex-col gap-1">
        <span className="gh-field-label">Search</span>
        <input
          name={searchKey}
          defaultValue={searchValue ?? ""}
          placeholder={placeholder}
          className="gh-input"
          style={{ minWidth: 240 }}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="gh-field-label">Category</span>
        <select name={categoryKey} defaultValue={categoryValue ?? ""} className="gh-input">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="gh-btn gh-btn-soft">
        Filter
      </button>
      {searchValue || categoryValue ? (
        <Link href={clearHref} className="gh-btn gh-btn-ghost text-[12px]">
          Clear
        </Link>
      ) : null}
    </form>
  );
}

/**
 * Shared test-centers management UI (country-scoped). Sits beside Insurance in
 * the sidebar. Three stacked sections:
 *   1. Test centers table (create / edit / soft-delete).
 *   2. A per-center "manage exams" panel — the center's priced offerings
 *      (paginated + searchable) plus a picker to add more from the catalogue.
 *   3. The global exam-type catalogue (paginated + searchable).
 *
 * Both exam tables are server-paginated: a single center can carry a whole
 * supplier price list (Synlab PT is ~4.2k rows), so neither the offerings nor
 * the catalogue may ever be fetched whole.
 *
 * All mutations run as inline server actions and redirect back to the URL the
 * form was submitted from (`returnTo`), so paging/search survive a save.
 */
export async function TestCentersManager({
  countryId,
  countryCode,
  countryName,
  currencyCode,
  basePath,
  searchParams,
}: {
  countryId: string;
  countryCode: string;
  countryName: string;
  currencyCode: string;
  basePath: string;
  searchParams: ManagerSearchParams;
}) {
  const sp = searchParams;
  const base = basePath;

  const manageId = sp.center ?? null;
  const editId = sp.edit ?? null;
  const editTypeId = sp.editType ?? null;
  const editOfferingId = sp.editOffering ?? null;

  // Offerings table state (per-center) and catalogue table state.
  const offeringPage = parsePage(sp.oPage);
  const offeringSearch = sp.oSearch?.trim() || undefined;
  const offeringCategory = sp.oCat?.trim() || undefined;
  const cataloguePage = parsePage(sp.cPage);
  const catalogueSearch = sp.cSearch?.trim() || undefined;
  const catalogueCategory = sp.cCat?.trim() || undefined;
  const pickerSearch = sp.pick?.trim() || undefined;

  /** Rebuild the current URL with some params replaced. `null` drops a param. */
  function href(overrides: Record<string, string | number | null | undefined>): string {
    const params = new URLSearchParams();
    const merged: Record<string, string | number | null | undefined> = {
      center: manageId,
      edit: editId,
      editType: editTypeId,
      editOffering: editOfferingId,
      oPage: offeringPage > 1 ? offeringPage : null,
      oSearch: offeringSearch,
      oCat: offeringCategory,
      cPage: cataloguePage > 1 ? cataloguePage : null,
      cSearch: catalogueSearch,
      cCat: catalogueCategory,
      pick: pickerSearch,
      ...overrides,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value === null || value === undefined || value === "") continue;
      params.set(key, String(value));
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  /** The URL a form should return to after saving — current view, no flash keys. */
  const returnTo = href({});

  const [centersRes, categoriesRes, catalogueRes] = await Promise.all([
    fetchAdminTestCenters(countryId),
    fetchAdminExamTypeCategories(),
    fetchAdminExamTypes({
      page: cataloguePage,
      pageSize: PAGE_SIZE,
      category: catalogueCategory,
      search: catalogueSearch,
    }),
  ]);

  const centers: AdminTestCenterDto[] = centersRes.ok ? centersRes.data.testCenters : [];
  const categories: string[] = categoriesRes.ok ? categoriesRes.data.categories : [];
  const examTypes: AdminExamTypeDto[] = catalogueRes.ok ? catalogueRes.data.examTypes : [];
  const cataloguePagination: AdminPagination | null = catalogueRes.ok
    ? catalogueRes.data.pagination
    : null;

  const editCenter = editId ? centers.find((c) => c.id === editId) ?? null : null;
  const manageCenter = manageId ? centers.find((c) => c.id === manageId) ?? null : null;
  const editExamType = editTypeId ? examTypes.find((t) => t.id === editTypeId) ?? null : null;

  // Offerings + picker candidates only load while a center is open.
  const [offeringsRes, pickerRes] = manageCenter
    ? await Promise.all([
        fetchAdminTestCenterExams(manageCenter.id, {
          page: offeringPage,
          pageSize: PAGE_SIZE,
          category: offeringCategory,
          search: offeringSearch,
        }),
        fetchAdminExamTypes({
          page: 1,
          pageSize: PICKER_LIMIT,
          isActive: "true",
          notOnCenterId: manageCenter.id,
          search: pickerSearch,
        }),
      ])
    : [null, null];

  const offerings: AdminTestCenterExamDto[] = offeringsRes?.ok ? offeringsRes.data.exams : [];
  const offeringsPagination: AdminPagination | null = offeringsRes?.ok
    ? offeringsRes.data.pagination
    : null;
  const addableExamTypes: AdminExamTypeDto[] = pickerRes?.ok ? pickerRes.data.examTypes : [];
  const addableTotal = pickerRes?.ok ? pickerRes.data.pagination.total : 0;

  const editingOffering = editOfferingId
    ? offerings.find((e) => e.id === editOfferingId) ?? null
    : null;

  // ─── Server actions ────────────────────────────────────────────────────

  /** Where to send the browser after a mutation — the view the form came from,
   *  with a flash message appended. */
  function backTo(formData: FormData, key: "success" | "error", message: string): string {
    const target = String(formData.get("returnTo") ?? "").trim() || base;
    const sep = target.includes("?") ? "&" : "?";
    return `${target}${sep}${key}=${encodeURIComponent(message)}`;
  }

  async function saveCenterAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const centerId = String(formData.get("centerId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    if (!name || !slug) {
      redirect(backTo(formData, "error", "Name and slug are required"));
    }
    const body = {
      name,
      slug,
      addressLine: String(formData.get("addressLine") ?? "").trim() || null,
      city: String(formData.get("city") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
      isActive: formData.get("isActive") === "on",
    };
    const result = centerId
      ? await updateAdminTestCenter(centerId, body)
      : await createAdminTestCenter({ ...body, countryId });
    if (!result.ok) {
      redirect(backTo(formData, "error", result.message));
    }
    revalidatePath(base);
    redirect(backTo(formData, "success", "Test center saved"));
  }

  async function deleteCenterAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const centerId = String(formData.get("centerId") ?? "");
    if (centerId) {
      const result = await deleteAdminTestCenter(centerId);
      if (!result.ok) {
        redirect(backTo(formData, "error", result.message));
      }
    }
    revalidatePath(base);
    redirect(backTo(formData, "success", "Test center deactivated"));
  }

  async function saveExamTypeAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const typeId = String(formData.get("typeId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    if (!name || !slug) {
      redirect(backTo(formData, "error", "Exam name and slug are required"));
    }
    const body = {
      // Blank clears the reference; the API validates the GH1-0001 shape.
      code: String(formData.get("code") ?? "").trim().toUpperCase() || null,
      name,
      slug,
      category: String(formData.get("category") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
      isActive: formData.get("isActive") === "on",
    };
    const result = typeId
      ? await updateAdminExamType(typeId, body)
      : await createAdminExamType(body);
    if (!result.ok) {
      redirect(backTo(formData, "error", result.message));
    }
    revalidatePath(base);
    redirect(backTo(formData, "success", "Exam type saved"));
  }

  async function deleteExamTypeAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const typeId = String(formData.get("typeId") ?? "");
    if (typeId) {
      const result = await deleteAdminExamType(typeId);
      if (!result.ok) {
        redirect(backTo(formData, "error", result.message));
      }
    }
    revalidatePath(base);
    redirect(backTo(formData, "success", "Exam type deactivated"));
  }

  // Add or update an offering. markupMode drives how markupValue is parsed:
  // PERCENT → percent typed by admin, stored as basis points (×100);
  // FIXED   → money typed by admin, stored as cents.
  async function saveOfferingAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const centerId = String(formData.get("centerId") ?? "").trim();
    const offeringId = String(formData.get("offeringId") ?? "").trim();
    const examTypeId = String(formData.get("examTypeId") ?? "").trim();
    const markupMode = String(formData.get("markupMode") ?? "PERCENT") === "FIXED" ? "FIXED" : "PERCENT";
    const costCents = amountToCents(String(formData.get("cost") ?? "")) ?? 0;
    const markupRaw = String(formData.get("markupValue") ?? "").trim();
    const markupNum = Number(markupRaw.replace(",", ".")) || 0;
    const markupValue = Math.round(markupNum * 100);
    const currency = String(formData.get("currencyCode") ?? currencyCode).trim().toUpperCase() || currencyCode;
    const supplierCode = String(formData.get("supplierCode") ?? "").trim() || null;
    const turnaroundRaw = String(formData.get("turnaroundDays") ?? "").trim();
    const turnaroundDays = turnaroundRaw === "" ? null : Number(turnaroundRaw);

    if (!offeringId && !examTypeId) {
      redirect(backTo(formData, "error", "Pick an exam to add"));
    }
    if (turnaroundDays !== null && !Number.isInteger(turnaroundDays)) {
      redirect(backTo(formData, "error", "Turnaround must be a whole number of days"));
    }

    const body = {
      supplierCode,
      turnaroundDays,
      costCents,
      markupMode,
      markupValue,
      currencyCode: currency,
    };
    const result = offeringId
      ? await updateAdminTestCenterExam(centerId, offeringId, body)
      : await createAdminTestCenterExam(centerId, { ...body, examTypeId });
    if (!result.ok) {
      redirect(backTo(formData, "error", result.message));
    }
    revalidatePath(base);
    redirect(backTo(formData, "success", "Exam pricing saved"));
  }

  async function deleteOfferingAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const centerId = String(formData.get("centerId") ?? "");
    const offeringId = String(formData.get("offeringId") ?? "");
    if (centerId && offeringId) {
      const result = await deleteAdminTestCenterExam(centerId, offeringId);
      if (!result.ok) {
        redirect(backTo(formData, "error", result.message));
      }
    }
    revalidatePath(base);
    redirect(backTo(formData, "success", "Exam removed"));
  }

  // ─── Filter-bar params ─────────────────────────────────────────────────
  // Each bar owns two keys and resets its own page; everything else rides
  // along as hidden fields so the other panel keeps its state.

  const offeringFilterCarried: [string, string][] = Object.entries({
    center: manageId,
    editOffering: editOfferingId,
    cPage: cataloguePage > 1 ? String(cataloguePage) : null,
    cSearch: catalogueSearch,
    cCat: catalogueCategory,
    pick: pickerSearch,
  }).filter((entry): entry is [string, string] => Boolean(entry[1]));

  const catalogueFilterCarried: [string, string][] = Object.entries({
    center: manageId,
    editOffering: editOfferingId,
    oPage: offeringPage > 1 ? String(offeringPage) : null,
    oSearch: offeringSearch,
    oCat: offeringCategory,
    pick: pickerSearch,
  }).filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={countryCode} size={14} />
            {countryName}
          </span>
        }
        title="Test centers &amp; exam clinics"
        description="Register the labs and clinics where prescribed exams can be performed in this market. For each center, list the exams it offers with our cost and a markup — the patient price is computed automatically. Exam names come from a shared catalogue you manage below."
        actions={
          <Btn href={`${base}?edit=`} variant="primary" size="md">
            <Plus className="size-3.5" /> New center
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

      {/* ── Test centers list ─────────────────────────────────────────── */}
      <AdminCard padding={0} className="overflow-hidden">
        <div className="overflow-x-auto">
          <AdminTable>
            <Thead>
              <Th>Name</Th>
              <Th>City</Th>
              <Th>Exams</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </Thead>
            <tbody>
              {centers.length === 0 ? (
                <Tr>
                  <Td>
                    <span className="text-[12px] text-[var(--color-text-muted)]">
                      No test centers yet.
                    </span>
                  </Td>
                  <Td></Td>
                  <Td></Td>
                  <Td></Td>
                  <Td></Td>
                </Tr>
              ) : (
                centers.map((c) => (
                  <Tr key={c.id}>
                    <Td>{c.name}</Td>
                    <Td>{c.city ?? "—"}</Td>
                    <Td>{c.examCount}</Td>
                    <Td>
                      <Pill tone={c.isActive ? "published" : "inactive"}>
                        {c.isActive ? "Active" : "Inactive"}
                      </Pill>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`${base}?center=${c.id}`} className="gh-btn gh-btn-soft text-[12px]">
                          Manage exams
                        </Link>
                        <Link href={`${base}?edit=${c.id}`} className="gh-btn gh-btn-soft text-[12px]">
                          Edit
                        </Link>
                        <form action={deleteCenterAction} className="inline">
                          <input type="hidden" name="centerId" value={c.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button
                            type="submit"
                            className="gh-btn gh-btn-danger flex items-center gap-1 text-[12px]"
                            aria-label={`Deactivate ${c.name}`}
                          >
                            <Trash2 className="size-3" aria-hidden />
                          </button>
                        </form>
                      </div>
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </div>
      </AdminCard>

      {/* ── New / edit center form ────────────────────────────────────── */}
      {editId !== null ? (
        <AdminCard className="mt-4">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            {editCenter ? "Edit" : "New"} test center
          </h3>
          <form action={saveCenterAction} className="mt-4 grid gap-4">
            <input type="hidden" name="centerId" value={editCenter?.id ?? ""} />
            <input type="hidden" name="returnTo" value={base} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Name</span>
                <input name="name" defaultValue={editCenter?.name ?? ""} placeholder="City Diagnostics Lab" className="gh-input" required />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Slug</span>
                <input name="slug" defaultValue={editCenter?.slug ?? ""} placeholder="city-diagnostics-lab" className="gh-input" required />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Address</span>
                <input name="addressLine" defaultValue={editCenter?.addressLine ?? ""} placeholder="Rua da Saúde 12" className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">City</span>
                <input name="city" defaultValue={editCenter?.city ?? ""} placeholder="Lisbon" className="gh-input" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_140px]">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Phone</span>
                <input name="phone" defaultValue={editCenter?.phone ?? ""} placeholder="+351 21 000 0000" className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Email</span>
                <input name="email" type="email" defaultValue={editCenter?.email ?? ""} placeholder="bookings@lab.com" className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Sort order</span>
                <input name="sortOrder" type="number" min={0} max={9999} defaultValue={editCenter?.sortOrder ?? 0} className="gh-input" />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Notes</span>
              <textarea name="notes" defaultValue={editCenter?.notes ?? ""} rows={2} placeholder="Opening hours, referral instructions…" className="gh-input" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isActive" defaultChecked={editCenter?.isActive ?? true} className="size-4" />
              <span className="text-[13px] text-[var(--color-text-body)]">Active</span>
            </label>
            <div className="flex items-center gap-3">
              <button type="submit" className="gh-btn gh-btn-primary">Save center</button>
              <Link href={base} className="gh-btn gh-btn-soft">Cancel</Link>
            </div>
          </form>
        </AdminCard>
      ) : null}

      {/* ── Manage exams for one center ───────────────────────────────── */}
      {manageCenter ? (
        <AdminCard className="mt-4">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            Exams &amp; pricing at {manageCenter.name}
          </h3>
          <p className="mt-1 mb-4 text-[12px] text-[var(--color-text-muted)]">
            Our cost is what the center bills us. The markup (a percentage of cost, or a fixed amount)
            is added to give the patient price shown below. <strong>Ref</strong> is our catalogue
            reference; <strong>center code</strong> is the lab&rsquo;s own code for the same exam.
          </p>

          <div className="mb-3">
            <FilterBar
              action={base}
              carried={offeringFilterCarried}
              searchKey="oSearch"
              categoryKey="oCat"
              categories={categories}
              searchValue={offeringSearch}
              categoryValue={offeringCategory}
              placeholder="Exam name, GH ref or center code…"
              clearHref={href({ oSearch: null, oCat: null, oPage: null })}
            />
          </div>

          {offeringsRes && !offeringsRes.ok ? (
            <p className="gh-status-warning mb-3 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
              {offeringsRes.message}
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <AdminTable>
              <Thead>
                <Th>Ref</Th>
                <Th>Exam</Th>
                <Th>Center code</Th>
                <Th align="right">Days</Th>
                <Th align="right">Our cost</Th>
                <Th align="right">Markup</Th>
                <Th align="right">Patient price</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </Thead>
              <tbody>
                {offerings.length === 0 ? (
                  <Tr>
                    <Td>
                      <span className="text-[12px] text-[var(--color-text-muted)]">
                        {offeringSearch || offeringCategory
                          ? "No exams match this filter."
                          : "No exams on this center yet — add one below."}
                      </span>
                    </Td>
                    <Td></Td>
                    <Td></Td>
                    <Td></Td>
                    <Td></Td>
                    <Td></Td>
                    <Td></Td>
                    <Td></Td>
                    <Td></Td>
                  </Tr>
                ) : (
                  offerings.map((e) => (
                    <Tr key={e.id}>
                      <Td>
                        <span className="font-mono text-[12px]">{e.examTypeCode ?? "—"}</span>
                      </Td>
                      <Td>{e.examTypeName}</Td>
                      <Td>
                        <span className="font-mono text-[12px]">{e.supplierCode ?? "—"}</span>
                      </Td>
                      <Td align="right">{e.turnaroundDays ?? "—"}</Td>
                      <Td align="right">{formatMoney(e.costCents, e.currencyCode)}</Td>
                      <Td align="right">{markupLabel(e.markupMode, e.markupValue, e.currencyCode)}</Td>
                      <Td align="right">
                        <strong>{formatMoney(e.patientPriceCents, e.currencyCode)}</strong>
                      </Td>
                      <Td>
                        <Pill tone={e.isActive ? "published" : "inactive"}>
                          {e.isActive ? "Active" : "Inactive"}
                        </Pill>
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={href({ editOffering: e.id })} className="gh-btn gh-btn-soft text-[12px]">
                            Edit
                          </Link>
                          <form action={deleteOfferingAction} className="inline">
                            <input type="hidden" name="centerId" value={manageCenter.id} />
                            <input type="hidden" name="offeringId" value={e.id} />
                            <input type="hidden" name="returnTo" value={href({ editOffering: null })} />
                            <button
                              type="submit"
                              className="gh-btn gh-btn-danger flex items-center gap-1 text-[12px]"
                              aria-label={`Remove ${e.examTypeName}`}
                            >
                              <Trash2 className="size-3" aria-hidden />
                            </button>
                          </form>
                        </div>
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </AdminTable>
          </div>

          {offeringsPagination ? (
            <Pager pagination={offeringsPagination} hrefForPage={(p) => href({ oPage: p })} />
          ) : null}

          {/* Add / edit an offering */}
          <form action={saveOfferingAction} className="mt-5 grid gap-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4">
            <input type="hidden" name="centerId" value={manageCenter.id} />
            <input type="hidden" name="offeringId" value={editingOffering?.id ?? ""} />
            <input type="hidden" name="returnTo" value={href({ editOffering: null })} />
            <p className="m-0 text-[13px] font-semibold text-[var(--color-text-primary)]">
              {editingOffering ? `Edit pricing — ${editingOffering.examTypeName}` : "Add an exam to this center"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Exam</span>
                {editingOffering ? (
                  <input className="gh-input" value={editingOffering.examTypeName} readOnly disabled />
                ) : addableExamTypes.length > 0 ? (
                  <select name="examTypeId" className="gh-input" required defaultValue="">
                    <option value="" disabled>Choose an exam…</option>
                    {addableExamTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {[t.code, t.category, t.name].filter(Boolean).join(" — ")}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[12px] text-[var(--color-text-muted)]">
                    {pickerSearch
                      ? "No unpriced catalogue exam matches that search."
                      : "All catalogue exams are already on this center."}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Our cost ({currencyCode})</span>
                <input
                  type="text"
                  inputMode="decimal"
                  name="cost"
                  defaultValue={centsToInput(editingOffering?.costCents)}
                  placeholder="0.00"
                  className="gh-input"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-[180px_1fr_120px]">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Markup type</span>
                <select name="markupMode" defaultValue={editingOffering?.markupMode ?? "PERCENT"} className="gh-input">
                  <option value="PERCENT">Percentage of cost</option>
                  <option value="FIXED">Fixed amount</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Markup value (% or amount)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  name="markupValue"
                  defaultValue={
                    editingOffering
                      ? editingOffering.markupMode === "PERCENT"
                        ? (editingOffering.markupValue / 100).toString()
                        : centsToInput(editingOffering.markupValue)
                      : ""
                  }
                  placeholder="30"
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Currency</span>
                <input name="currencyCode" defaultValue={editingOffering?.currencyCode ?? currencyCode} className="gh-input" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Center&rsquo;s own code</span>
                <input
                  name="supplierCode"
                  defaultValue={editingOffering?.supplierCode ?? ""}
                  placeholder="e.g. 1102"
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Turnaround (days)</span>
                <input
                  name="turnaroundDays"
                  type="number"
                  min={0}
                  max={365}
                  defaultValue={editingOffering?.turnaroundDays ?? ""}
                  className="gh-input"
                />
              </label>
            </div>
            <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
              Percentage: enter <strong>30</strong> for a 30% markup. Fixed: enter an amount in {currencyCode}.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="gh-btn gh-btn-primary"
                disabled={!editingOffering && addableExamTypes.length === 0}
              >
                {editingOffering ? "Save pricing" : "Add exam"}
              </button>
              <Link href={base} className="gh-btn gh-btn-soft">Done</Link>
              {editingOffering ? (
                <Link href={href({ editOffering: null })} className="gh-btn gh-btn-soft">
                  Cancel edit
                </Link>
              ) : null}
            </div>
          </form>

          {/* Catalogue search feeding the picker above. Separate GET form so it
              can be used without submitting the pricing form. */}
          {editingOffering ? null : (
            <form method="get" action={base} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="center" value={manageCenter.id} />
              {offeringSearch ? <input type="hidden" name="oSearch" value={offeringSearch} /> : null}
              {offeringCategory ? <input type="hidden" name="oCat" value={offeringCategory} /> : null}
              {offeringPage > 1 ? <input type="hidden" name="oPage" value={String(offeringPage)} /> : null}
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Find an exam to add</span>
                <input
                  name="pick"
                  defaultValue={pickerSearch ?? ""}
                  placeholder="Search the catalogue by name or GH ref…"
                  className="gh-input"
                  style={{ minWidth: 300 }}
                />
              </label>
              <button type="submit" className="gh-btn gh-btn-soft">Search catalogue</button>
              <span className="pb-2 text-[12px] text-[var(--color-text-muted)]">
                {addableTotal > PICKER_LIMIT
                  ? `Showing ${PICKER_LIMIT} of ${addableTotal} unpriced matches — narrow the search.`
                  : `${addableTotal} unpriced ${addableTotal === 1 ? "exam" : "exams"} available.`}
              </span>
            </form>
          )}
        </AdminCard>
      ) : null}

      {/* ── Exam-type catalogue (global) ──────────────────────────────── */}
      <AdminCard className="mt-6" padding={0}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <div>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Exam catalogue
            </h3>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Shared list of exam types across all countries. Centers pick from these when pricing.
            </p>
          </div>
          <Btn href={`${base}?editType=`} variant="soft" size="sm">
            <Plus className="size-3.5" /> New exam type
          </Btn>
        </div>

        <div className="px-5 pt-4">
          <FilterBar
            action={base}
            carried={catalogueFilterCarried}
            searchKey="cSearch"
            categoryKey="cCat"
            categories={categories}
            searchValue={catalogueSearch}
            categoryValue={catalogueCategory}
            placeholder="Exam name or GH ref…"
            clearHref={href({ cSearch: null, cCat: null, cPage: null })}
          />
        </div>

        {!catalogueRes.ok ? (
          <p className="gh-status-warning mx-5 mt-3 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            {catalogueRes.message}
          </p>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <AdminTable>
            <Thead>
              <Th>Ref</Th>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>In use</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </Thead>
            <tbody>
              {examTypes.length === 0 ? (
                <Tr>
                  <Td>
                    <span className="text-[12px] text-[var(--color-text-muted)]">
                      {catalogueSearch || catalogueCategory
                        ? "No exam types match this filter."
                        : "No exam types yet. Add one to start pricing centers."}
                    </span>
                  </Td>
                  <Td></Td>
                  <Td></Td>
                  <Td></Td>
                  <Td></Td>
                  <Td></Td>
                </Tr>
              ) : (
                examTypes.map((t) => (
                  <Tr key={t.id}>
                    <Td>
                      <span className="font-mono text-[12px]">{t.code ?? "—"}</span>
                    </Td>
                    <Td>{t.name}</Td>
                    <Td>{t.category ?? "—"}</Td>
                    <Td>{t.offeringCount ?? 0}</Td>
                    <Td>
                      <Pill tone={t.isActive ? "published" : "inactive"}>
                        {t.isActive ? "Active" : "Inactive"}
                      </Pill>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={href({ editType: t.id })} className="gh-btn gh-btn-soft text-[12px]">
                          Edit
                        </Link>
                        <form action={deleteExamTypeAction} className="inline">
                          <input type="hidden" name="typeId" value={t.id} />
                          <input type="hidden" name="returnTo" value={href({ editType: null })} />
                          <button
                            type="submit"
                            className="gh-btn gh-btn-danger flex items-center gap-1 text-[12px]"
                            aria-label={`Deactivate ${t.name}`}
                          >
                            <Trash2 className="size-3" aria-hidden />
                          </button>
                        </form>
                      </div>
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </div>

        <div className="px-5">
          {cataloguePagination ? (
            <Pager pagination={cataloguePagination} hrefForPage={(p) => href({ cPage: p })} />
          ) : null}
        </div>

        {editTypeId !== null ? (
          <div className="border-t border-[var(--color-border)] p-5">
            <h4
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800 }}
            >
              {editExamType ? "Edit" : "New"} exam type
            </h4>
            <form action={saveExamTypeAction} className="mt-4 grid gap-4">
              <input type="hidden" name="typeId" value={editExamType?.id ?? ""} />
              <input type="hidden" name="returnTo" value={href({ editType: null })} />
              <div className="grid gap-4 sm:grid-cols-[160px_1fr_1fr]">
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Reference</span>
                  <input
                    name="code"
                    defaultValue={editExamType?.code ?? ""}
                    placeholder="GH1-0001"
                    className="gh-input"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Name</span>
                  <input name="name" defaultValue={editExamType?.name ?? ""} placeholder="MRI Brain" className="gh-input" required />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Slug</span>
                  <input name="slug" defaultValue={editExamType?.slug ?? ""} placeholder="mri-brain" className="gh-input" required />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Category</span>
                  <input name="category" defaultValue={editExamType?.category ?? ""} placeholder="Imaging" className="gh-input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Sort order</span>
                  <input name="sortOrder" type="number" min={0} max={9999} defaultValue={editExamType?.sortOrder ?? 0} className="gh-input" />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Description</span>
                <textarea name="description" defaultValue={editExamType?.description ?? ""} rows={2} className="gh-input" />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isActive" defaultChecked={editExamType?.isActive ?? true} className="size-4" />
                <span className="text-[13px] text-[var(--color-text-body)]">Active (selectable when pricing centers)</span>
              </label>
              <div className="flex items-center gap-3">
                <button type="submit" className="gh-btn gh-btn-primary">Save exam type</button>
                <Link href={href({ editType: null })} className="gh-btn gh-btn-soft">Cancel</Link>
              </div>
            </form>
          </div>
        ) : null}
      </AdminCard>
    </>
  );
}
