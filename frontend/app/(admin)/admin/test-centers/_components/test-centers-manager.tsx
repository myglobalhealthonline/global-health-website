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
  fetchAdminExamTypes,
  fetchAdminTestCenters,
  updateAdminExamType,
  updateAdminTestCenter,
  updateAdminTestCenterExam,
  type AdminExamTypeDto,
  type AdminTestCenterDto,
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

/**
 * Shared test-centers management UI (country-scoped). Sits beside Insurance in
 * the sidebar. Three stacked sections:
 *   1. Test centers table (create / edit / soft-delete).
 *   2. A per-center "manage exams" panel (add offerings from the exam
 *      catalogue with cost + markup → patient price; edit / remove).
 *   3. The global exam-type catalogue (create / edit / deactivate).
 * All mutations run as inline server actions and redirect back to `basePath`
 * so each host keeps its own URL state.
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

  const [centersRes, examTypesRes] = await Promise.all([
    fetchAdminTestCenters(countryId),
    fetchAdminExamTypes(),
  ]);

  const centers: AdminTestCenterDto[] = centersRes.ok ? centersRes.data.testCenters : [];
  const examTypes: AdminExamTypeDto[] = examTypesRes.ok ? examTypesRes.data.examTypes : [];
  const activeExamTypes = examTypes.filter((t) => t.isActive);

  const editId = sp.edit ?? null;
  const editCenter = editId ? centers.find((c) => c.id === editId) ?? null : null;

  const manageId = sp.center ?? null;
  const manageCenter = manageId ? centers.find((c) => c.id === manageId) ?? null : null;

  const editTypeId = sp.editType ?? null;
  const editExamType = editTypeId ? examTypes.find((t) => t.id === editTypeId) ?? null : null;

  const editOfferingId = sp.editOffering ?? null;

  // ─── Server actions ────────────────────────────────────────────────────

  async function saveCenterAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const centerId = String(formData.get("centerId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    if (!name || !slug) {
      redirect(`${base}?error=${encodeURIComponent("Name and slug are required")}`);
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
      redirect(`${base}?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(base);
    redirect(`${base}?success=${encodeURIComponent("Test center saved")}`);
  }

  async function deleteCenterAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const centerId = String(formData.get("centerId") ?? "");
    if (centerId) {
      const result = await deleteAdminTestCenter(centerId);
      if (!result.ok) {
        redirect(`${base}?error=${encodeURIComponent(result.message)}`);
      }
    }
    revalidatePath(base);
    redirect(`${base}?success=${encodeURIComponent("Test center deactivated")}`);
  }

  async function saveExamTypeAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const typeId = String(formData.get("typeId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    if (!name || !slug) {
      redirect(`${base}?error=${encodeURIComponent("Exam name and slug are required")}`);
    }
    const body = {
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
      redirect(`${base}?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(base);
    redirect(`${base}?success=${encodeURIComponent("Exam type saved")}`);
  }

  async function deleteExamTypeAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const typeId = String(formData.get("typeId") ?? "");
    if (typeId) {
      const result = await deleteAdminExamType(typeId);
      if (!result.ok) {
        redirect(`${base}?error=${encodeURIComponent(result.message)}`);
      }
    }
    revalidatePath(base);
    redirect(`${base}?success=${encodeURIComponent("Exam type deactivated")}`);
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
    const markupValue = markupMode === "PERCENT" ? Math.round(markupNum * 100) : Math.round(markupNum * 100);
    const currency = String(formData.get("currencyCode") ?? currencyCode).trim().toUpperCase() || currencyCode;

    const back = `${base}?center=${centerId}`;
    if (!offeringId && !examTypeId) {
      redirect(`${back}&error=${encodeURIComponent("Pick an exam to add")}`);
    }

    let result;
    if (offeringId) {
      result = await updateAdminTestCenterExam(centerId, offeringId, {
        costCents,
        markupMode,
        markupValue,
        currencyCode: currency,
      });
    } else {
      result = await createAdminTestCenterExam(centerId, {
        examTypeId,
        costCents,
        markupMode,
        markupValue,
        currencyCode: currency,
      });
    }
    if (!result.ok) {
      redirect(`${back}&error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(base);
    redirect(`${back}&success=${encodeURIComponent("Exam pricing saved")}`);
  }

  async function deleteOfferingAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const centerId = String(formData.get("centerId") ?? "");
    const offeringId = String(formData.get("offeringId") ?? "");
    if (centerId && offeringId) {
      const result = await deleteAdminTestCenterExam(centerId, offeringId);
      if (!result.ok) {
        redirect(`${base}?center=${centerId}&error=${encodeURIComponent(result.message)}`);
      }
    }
    revalidatePath(base);
    redirect(`${base}?center=${centerId}&success=${encodeURIComponent("Exam removed")}`);
  }

  // Exams not yet on the center being managed — available to add.
  const offeredTypeIds = new Set((manageCenter?.exams ?? []).map((e) => e.examTypeId));
  const addableExamTypes = activeExamTypes.filter((t) => !offeredTypeIds.has(t.id));
  const editingOffering =
    manageCenter && editOfferingId
      ? manageCenter.exams.find((e) => e.id === editOfferingId) ?? null
      : null;

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
                    <Td>{c.exams.length}</Td>
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
            is added to give the patient price shown below.
          </p>

          <div className="overflow-x-auto">
            <AdminTable>
              <Thead>
                <Th>Exam</Th>
                <Th align="right">Our cost</Th>
                <Th align="right">Markup</Th>
                <Th align="right">Patient price</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </Thead>
              <tbody>
                {manageCenter.exams.length === 0 ? (
                  <Tr>
                    <Td>
                      <span className="text-[12px] text-[var(--color-text-muted)]">
                        No exams on this center yet — add one below.
                      </span>
                    </Td>
                    <Td></Td>
                    <Td></Td>
                    <Td></Td>
                    <Td></Td>
                    <Td></Td>
                  </Tr>
                ) : (
                  manageCenter.exams.map((e) => (
                    <Tr key={e.id}>
                      <Td>{e.examTypeName}</Td>
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
                          <Link
                            href={`${base}?center=${manageCenter.id}&editOffering=${e.id}`}
                            className="gh-btn gh-btn-soft text-[12px]"
                          >
                            Edit
                          </Link>
                          <form action={deleteOfferingAction} className="inline">
                            <input type="hidden" name="centerId" value={manageCenter.id} />
                            <input type="hidden" name="offeringId" value={e.id} />
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

          {/* Add / edit an offering */}
          <form action={saveOfferingAction} className="mt-5 grid gap-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4">
            <input type="hidden" name="centerId" value={manageCenter.id} />
            <input type="hidden" name="offeringId" value={editingOffering?.id ?? ""} />
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
                        {t.category ? `${t.category} — ${t.name}` : t.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[12px] text-[var(--color-text-muted)]">
                    All catalogue exams are already on this center. Add a new exam type below first.
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
                <Link href={`${base}?center=${manageCenter.id}`} className="gh-btn gh-btn-soft">
                  Cancel edit
                </Link>
              ) : null}
            </div>
          </form>
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
        <div className="mt-4 overflow-x-auto">
          <AdminTable>
            <Thead>
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
                      No exam types yet. Add one to start pricing centers.
                    </span>
                  </Td>
                  <Td></Td>
                  <Td></Td>
                  <Td></Td>
                  <Td></Td>
                </Tr>
              ) : (
                examTypes.map((t) => (
                  <Tr key={t.id}>
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
                        <Link href={`${base}?editType=${t.id}`} className="gh-btn gh-btn-soft text-[12px]">
                          Edit
                        </Link>
                        <form action={deleteExamTypeAction} className="inline">
                          <input type="hidden" name="typeId" value={t.id} />
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
              <div className="grid gap-4 sm:grid-cols-2">
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
                <Link href={base} className="gh-btn gh-btn-soft">Cancel</Link>
              </div>
            </form>
          </div>
        ) : null}
      </AdminCard>
    </>
  );
}
