import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Trash2 } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  createAdminTestCenterLocation,
  deleteAdminTestCenterLocation,
  fetchAdminTestCenterById,
  fetchAdminTestCenterLocations,
  updateAdminTestCenterLocation,
} from "@/lib/admin/admin-api/test-centers";
import { AdminCard, PageHeader, Pill } from "../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../_components/confirm-delete-button";
import { FormSection } from "@/components/FormSection";
import { SetCrumbTitle } from "@/components/crumb-title";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string; edit?: string }>;
};

/** URL-safe slug from a branch name, so an admin never has to type one. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * The physical branches of one test centre.
 *
 * A centre is the provider; each location is a site a patient travels to, with
 * its own address and its own calendar. Pricing is NOT here — a chain charges
 * the same for an exam everywhere, so exams are priced once on the centre under
 * "Manage exams".
 */
/**
 * Redirect back to the page with a flash message.
 *
 * MODULE scope, deliberately: an inline `"use server"` action may only close
 * over serializable values, and capturing a component-scoped function throws at
 * render time ("Something went wrong" on the whole page). Taking `basePath` as
 * an argument keeps the only captured value a plain string.
 */
function backTo(basePath: string, message: string, ok: boolean): never {
  redirect(`${basePath}?${ok ? "success" : "error"}=${encodeURIComponent(message)}`);
}

export default async function AdminTestCenterLocationsPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const basePath = `/admin/test-centers/${id}/locations`;
  const editingId = messages.edit ?? null;

  const [centerResult, locationsResult] = await Promise.all([
    fetchAdminTestCenterById(id),
    fetchAdminTestCenterLocations(id),
  ]);

  if (!centerResult.ok) {
    return (
      <AdminCard>
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {centerResult.message}
        </p>
      </AdminCard>
    );
  }
  const center = centerResult.data?.testCenter;
  if (!center) {
    return (
      <AdminCard>
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          Test center not found.
        </p>
      </AdminCard>
    );
  }

  const locations = locationsResult.ok ? (locationsResult.data?.locations ?? []) : [];
  const editing = editingId ? locations.find((l) => l.id === editingId) ?? null : null;

  async function saveAction(formData: FormData) {
    "use server";
    // The layout guard does not cover server actions — every one re-checks.
    await requireAdminAction();
    const locationId = String(formData.get("locationId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) backTo(basePath, "A location needs a name", false);

    const read = (field: string) => String(formData.get(field) ?? "").trim() || null;
    const body = {
      name,
      // Slug is derived, not typed: it only ever appears in the public booking
      // URL, and an admin mistyping it breaks a link nobody sees them break.
      slug: String(formData.get("slug") ?? "").trim() || slugify(name),
      addressLine: read("addressLine"),
      city: read("city"),
      phone: read("phone"),
      notes: read("notes"),
      isActive: formData.get("isActive") !== null,
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    };

    const result = locationId
      ? await updateAdminTestCenterLocation(id, locationId, body)
      : await createAdminTestCenterLocation(id, body);
    if (!result.ok) backTo(basePath, result.message, false);
    revalidatePath(basePath);
    backTo(basePath, locationId ? "Location updated" : "Location added", true);
  }

  async function deleteAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const locationId = String(formData.get("locationId") ?? "").trim();
    if (!locationId) backTo(basePath, "Missing id", false);
    const result = await deleteAdminTestCenterLocation(id, locationId);
    // The API refuses the last location, and any branch still holding a booked
    // slot — both come back as a message worth showing verbatim.
    if (!result.ok) backTo(basePath, result.message, false);
    revalidatePath(basePath);
    backTo(basePath, "Location removed", true);
  }

  return (
    <>
      <SetCrumbTitle label={center.name} />
      <Link
        href="/admin/test-centers"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to test centres
      </Link>
      <PageHeader
        eyebrow="Test centre"
        title={`${center.name} · Locations`}
        description="The physical sites patients travel to. Each has its own address and its own opening hours. To BOOK A TEST FOR A PATIENT, open a location's calendar below and click a green time. Prices are set once per centre under Manage exams — every location charges the same."
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-md border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}
      {messages.success ? (
        <p className="gh-status-success mb-4 rounded-md border px-4 py-3 text-sm">
          {messages.success}
        </p>
      ) : null}

      <div className="gh-admin-doctor-detail-layout mt-4 grid gap-4">
        <FormSection
          title="Locations"
          description="A centre must keep at least one. A location with a booked appointment cannot be removed."
        >
          {!locationsResult.ok ? (
            <p className="gh-form-section__span-2 mt-4 gh-status-warning rounded-md border px-4 py-3 text-sm">
              {locationsResult.message}
            </p>
          ) : locations.length === 0 ? (
            <p className="gh-form-section__span-2 mt-4 text-portal-compact text-[var(--color-text-muted)]">
              No locations yet. Add this centre&apos;s first site using the form.
            </p>
          ) : (
            <ul className="gh-form-section__span-2 mt-4 grid list-none gap-3 p-0">
              {locations.map((loc) => (
                <li
                  key={loc.id}
                  className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="m-0 font-semibold text-[var(--color-text-primary)]">
                        {loc.name}{" "}
                        <Pill tone={loc.isActive ? "active" : "inactive"}>
                          {loc.isActive ? "Active" : "Paused"}
                        </Pill>
                      </p>
                      <p className="m-0 flex items-start gap-1.5 text-portal-meta text-[var(--color-text-muted)]">
                        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        {[loc.addressLine, loc.city].filter(Boolean).join(", ") ||
                          "No address yet"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`${basePath}/${loc.id}/availability`}
                        className="gh-btn gh-btn-soft text-[12px]"
                      >
                        <CalendarDays className="size-3.5" aria-hidden /> Calendar &amp; booking
                      </Link>
                      <Link
                        href={`${basePath}?edit=${loc.id}`}
                        className="gh-btn gh-btn-soft text-[12px]"
                      >
                        Edit
                      </Link>
                      <form action={deleteAction} className="inline">
                        <input type="hidden" name="locationId" value={loc.id} />
                        <ConfirmDeleteButton
                          message="Remove this location? Its opening hours and open slots go with it."
                          className="inline-flex items-center gap-1 text-portal-meta font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-status-error)]"
                          ariaLabel="Delete location"
                        >
                          <Trash2 className="size-3.5" aria-hidden /> Remove
                        </ConfirmDeleteButton>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </FormSection>

        <FormSection title={editing ? "Edit location" : "Add location"}>
          <form
            action={saveAction}
            className="gh-form-section__span-2 mt-3 grid gap-3"
            key={editing?.id ?? "new"}
          >
            <input type="hidden" name="locationId" value={editing?.id ?? ""} />
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Name *</span>
              <input
                name="name"
                required
                maxLength={200}
                defaultValue={editing?.name ?? ""}
                placeholder="Saldanha"
                className="gh-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Address</span>
              <input
                name="addressLine"
                maxLength={300}
                defaultValue={editing?.addressLine ?? ""}
                placeholder="Av. da República 12"
                className="gh-input"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">City</span>
                <input
                  name="city"
                  maxLength={120}
                  defaultValue={editing?.city ?? ""}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Phone</span>
                <input
                  name="phone"
                  maxLength={60}
                  defaultValue={editing?.phone ?? ""}
                  className="gh-input"
                />
              </label>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={editing?.isActive ?? true}
                className="size-4"
              />
              <span className="text-[13px] text-[var(--color-text-body)]">
                Active — patients can book at this location
              </span>
            </label>
            <div className="flex items-center gap-3">
              <button type="submit" className="gh-btn gh-btn-primary">
                {editing ? "Save location" : "Add location"}
              </button>
              {editing ? (
                <Link href={basePath} className="gh-btn gh-btn-soft">
                  Cancel
                </Link>
              ) : null}
            </div>
          </form>
        </FormSection>
      </div>
    </>
  );
}
