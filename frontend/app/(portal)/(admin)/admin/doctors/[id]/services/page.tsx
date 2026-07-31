import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  adminAssignServiceToDoctor,
  adminRemoveDoctorService,
  approveRejectDoctorService,
  updateDoctorServicePayout,
  fetchAdminDoctorById,
  fetchAdminDoctorServices,
  fetchAdminServices,
  type AdminDoctorServiceAssignmentDto,
  type AdminDoctorDto,
} from "@/lib/admin/admin-api";
import { formatServicePriceInput } from "@/lib/admin/service-form-parse";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { AdminCard, Btn, PageHeader, Pill } from "../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../_components/confirm-delete-button";
import { FlagBadge } from "../../../_components/flag-badge";
import { SetCrumbTitle } from "@/components/crumb-title";

/** A service assignment change (assign/disable/activate/remove) affects the
 *  public book flow for every market this doctor serves, not just their home
 *  country — bust each one so the change is visible immediately instead of
 *  waiting out the public services cache TTL. */
function revalidateDoctorServiceMarkets(doctor: AdminDoctorDto) {
  revalidateTag(SITE_CACHE_TAGS.countryServices(doctor.country.code), "max");
  for (const link of doctor.additionalCountries) {
    if (link.active) revalidateTag(SITE_CACHE_TAGS.countryServices(link.country.code), "max");
  }
  revalidateTag(SITE_CACHE_TAGS.globalServices(), "max");
}

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  GENERAL: "GP",
  SPECIALIST: "Specialist",
  PRESCRIPTION: "Prescription",
  HEALTH_TEST: "Health test",
  HOME_DELIVERY: "Home delivery",
};

function statusTone(
  status: AdminDoctorServiceAssignmentDto["status"],
): "published" | "inactive" | "brand" {
  if (status === "active") return "published";
  if (status === "pending") return "brand";
  return "inactive";
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminDoctorServicesPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const [doctorResult, servicesResult] = await Promise.all([
    fetchAdminDoctorById(id),
    fetchAdminDoctorServices(id),
  ]);

  async function assignAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const serviceId = String(formData.get("serviceId") ?? "").trim();
    if (!serviceId) {
      redirect(
        `/admin/doctors/${id}/services?error=${encodeURIComponent("Select a service")}`,
      );
    }
    const res = await adminAssignServiceToDoctor(id, serviceId);
    if (!res.ok) {
      redirect(
        `/admin/doctors/${id}/services?error=${encodeURIComponent(res.message)}`,
      );
    }
    revalidatePath(`/admin/doctors/${id}/services`);
    revalidatePath(`/admin/doctors/${id}`);
    if (doctorResult.ok) revalidateDoctorServiceMarkets(doctorResult.data.doctor);
    redirect(
      `/admin/doctors/${id}/services?success=${encodeURIComponent("Service assigned")}`,
    );
  }

  async function statusAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const serviceDoctorId = String(formData.get("serviceDoctorId") ?? "");
    const status = String(formData.get("status") ?? "") as
      | "pending"
      | "active"
      | "rejected"
      | "disabled";
    if (!serviceDoctorId || !status) {
      redirect(
        `/admin/doctors/${id}/services?error=${encodeURIComponent("Invalid update")}`,
      );
    }
    const res = await approveRejectDoctorService(id, serviceDoctorId, status);
    if (!res.ok) {
      redirect(
        `/admin/doctors/${id}/services?error=${encodeURIComponent(res.message)}`,
      );
    }
    revalidatePath(`/admin/doctors/${id}/services`);
    revalidatePath(`/admin/doctors/${id}`);
    if (doctorResult.ok) revalidateDoctorServiceMarkets(doctorResult.data.doctor);
    redirect(
      `/admin/doctors/${id}/services?success=${encodeURIComponent("Assignment updated")}`,
    );
  }

  async function removeAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const serviceDoctorId = String(formData.get("serviceDoctorId") ?? "");
    if (!serviceDoctorId) {
      redirect(
        `/admin/doctors/${id}/services?error=${encodeURIComponent("Invalid assignment")}`,
      );
    }
    const res = await adminRemoveDoctorService(id, serviceDoctorId);
    if (!res.ok) {
      redirect(
        `/admin/doctors/${id}/services?error=${encodeURIComponent(res.message)}`,
      );
    }
    revalidatePath(`/admin/doctors/${id}/services`);
    revalidatePath(`/admin/doctors/${id}`);
    if (doctorResult.ok) revalidateDoctorServiceMarkets(doctorResult.data.doctor);
    redirect(
      `/admin/doctors/${id}/services?success=${encodeURIComponent("Assignment removed")}`,
    );
  }

  async function amountAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const serviceDoctorId = String(formData.get("serviceDoctorId") ?? "");
    if (!serviceDoctorId) {
      redirect(
        `/admin/doctors/${id}/services?error=${encodeURIComponent("Invalid assignment")}`,
      );
    }
    const raw = String(formData.get("doctorAmount") ?? "").trim();
    // Empty clears the payout (back to "Not set"); otherwise accept 45 / 45.00.
    let doctorAmountCents: number | null;
    if (raw === "") {
      doctorAmountCents = null;
    } else if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
      redirect(
        `/admin/doctors/${id}/services?error=${encodeURIComponent("Payout must be a valid amount like 30 or 30.00")}`,
      );
      return;
    } else {
      doctorAmountCents = Math.round(Number(raw) * 100);
    }
    const res = await updateDoctorServicePayout(
      id,
      serviceDoctorId,
      doctorAmountCents,
    );
    if (!res.ok) {
      redirect(
        `/admin/doctors/${id}/services?error=${encodeURIComponent(res.message)}`,
      );
    }
    revalidatePath(`/admin/doctors/${id}/services`);
    revalidatePath(`/admin/doctors/${id}`);
    redirect(
      `/admin/doctors/${id}/services?success=${encodeURIComponent("Payout updated")}`,
    );
  }

  if (!doctorResult.ok) {
    return (
      <>
        <PageHeader title="Doctor services" />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {doctorResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const doctor = doctorResult.data.doctor;
  const assignments = servicesResult.ok ? servicesResult.data.items : [];
  const assignedServiceIds = new Set(assignments.map((a) => a.serviceId));

  // A doctor can provide services in more than one country — their primary
  // country plus any active additional-country listings. Services are
  // country-scoped, so we fetch the catalog per country and present the
  // assign/assigned UI grouped by country.
  const assignableCountries = [
    { id: doctor.country.id, code: doctor.country.code, name: doctor.country.name },
    ...doctor.additionalCountries
      .filter((link) => link.active)
      .map((link) => ({
        id: link.country.id,
        code: link.country.code,
        name: link.country.name,
      })),
  ].filter(
    (c, idx, arr) => arr.findIndex((other) => other.id === c.id) === idx,
  );

  const catalogResults = await Promise.all(
    assignableCountries.map((c) =>
      fetchAdminServices({ countryId: c.id, pageSize: "200" }),
    ),
  );

  // serviceId → its country, used to bucket the assigned list by country.
  const serviceCountryById = new Map<
    string,
    { id: string; code: string; name: string }
  >();
  // Per-country list of services not yet assigned to this doctor.
  const unassignedByCountry = assignableCountries.map((country, idx) => {
    const result = catalogResults[idx];
    const items = result.ok ? result.data.items : [];
    for (const item of items) {
      serviceCountryById.set(item.id, item.country);
    }
    return {
      country,
      items: items.filter((s) => !assignedServiceIds.has(s.id)),
    };
  });

  // Bucket assignments by their service's country, preserving the
  // assignable-country order. Assignments whose country is no longer active
  // (e.g. an additional market was disabled after assignment) fall into a
  // trailing "Other markets" group so they stay manageable.
  const assignmentGroups = new Map<
    string,
    { country: { id: string; code: string; name: string } | null; rows: typeof assignments }
  >();
  for (const country of assignableCountries) {
    assignmentGroups.set(country.id, { country, rows: [] });
  }
  const otherAssignments: typeof assignments = [];
  for (const row of assignments) {
    const country = serviceCountryById.get(row.serviceId);
    if (country && assignmentGroups.has(country.id)) {
      assignmentGroups.get(country.id)!.rows.push(row);
    } else if (country) {
      const existing = assignmentGroups.get(country.id);
      if (existing) existing.rows.push(row);
      else assignmentGroups.set(country.id, { country, rows: [row] });
    } else {
      otherAssignments.push(row);
    }
  }
  const renderedAssignmentGroups = [
    ...Array.from(assignmentGroups.values()).filter((g) => g.rows.length > 0),
    ...(otherAssignments.length > 0
      ? [{ country: null, rows: otherAssignments }]
      : []),
  ];

  const marketSummary =
    assignableCountries.length > 1
      ? `${doctor.country.name} +${assignableCountries.length - 1} more`
      : doctor.country.name;

  function renderAssignmentRow(row: AdminDoctorServiceAssignmentDto) {
    return (
      <li
        key={row.id}
        className="gh-admin-doctor-service-row rounded-[var(--radius-card-sm)] border border-[var(--color-border-subtle)] p-4"
      >
        <div className="gh-admin-doctor-service-row-inner flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="m-0 text-[15px] font-semibold text-[var(--color-text-primary)]">
              {row.service.name}
            </p>
            <p className="mt-1 text-portal-compact text-[var(--color-text-muted)]">
              {KIND_LABELS[row.service.kind] ?? row.service.kind}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone={statusTone(row.status)}>{row.status}</Pill>
              <Pill tone="inactive">
                {row.selectedBy === "doctor"
                  ? "Doctor-selected"
                  : "Admin-assigned"}
              </Pill>
              {!row.service.isActive ? (
                <Pill tone="inactive">Service inactive</Pill>
              ) : null}
            </div>
            <form
              action={amountAction}
              className="mt-3 flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="serviceDoctorId" value={row.id} />
              <label className="flex flex-col gap-1 text-portal-meta font-semibold text-[var(--color-text-muted)]">
                Doctor payout{" "}
                {row.service.currencyCode ? `(${row.service.currencyCode})` : ""}
                <input
                  type="text"
                  inputMode="decimal"
                  name="doctorAmount"
                  defaultValue={formatServicePriceInput(row.doctorAmountCents)}
                  placeholder="Not set"
                  pattern="^\d+(\.\d{1,2})?$"
                  title="Enter a valid amount like 30 or 30.00"
                  aria-label={`Payout to this doctor for ${row.service.name}`}
                  className="gh-input w-32 font-mono"
                />
              </label>
              <Btn type="submit" variant="secondary" size="sm">
                Save payout
              </Btn>
            </form>
          </div>
          <div className="gh-admin-doctor-service-actions flex flex-wrap gap-2">
            {row.status === "pending" ? (
              <>
                <form action={statusAction}>
                  <input type="hidden" name="serviceDoctorId" value={row.id} />
                  <input type="hidden" name="status" value="active" />
                  <Btn type="submit" variant="primary" size="sm">
                    Approve
                  </Btn>
                </form>
                <form action={statusAction}>
                  <input type="hidden" name="serviceDoctorId" value={row.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <Btn type="submit" variant="ghost" size="sm">
                    Reject
                  </Btn>
                </form>
              </>
            ) : null}
            {row.status === "active" ? (
              <form action={statusAction}>
                <input type="hidden" name="serviceDoctorId" value={row.id} />
                <input type="hidden" name="status" value="disabled" />
                <Btn type="submit" variant="ghost" size="sm">
                  Disable
                </Btn>
              </form>
            ) : null}
            {row.status === "disabled" || row.status === "rejected" ? (
              <form action={statusAction}>
                <input type="hidden" name="serviceDoctorId" value={row.id} />
                <input type="hidden" name="status" value="active" />
                <Btn type="submit" variant="secondary" size="sm">
                  Activate
                </Btn>
              </form>
            ) : null}
            <form action={removeAction}>
              <input type="hidden" name="serviceDoctorId" value={row.id} />
              <ConfirmDeleteButton
                message={`Remove ${row.service.name} from this doctor?`}
                className="gh-btn gh-btn-danger"
                style={{ minHeight: 32, padding: "0 14px", fontSize: 13 }}
              >
                Remove
              </ConfirmDeleteButton>
            </form>
          </div>
        </div>
      </li>
    );
  }

  return (
    <>
      <SetCrumbTitle label={doctor.fullName} />
      <Link
        href={`/admin/doctors/${id}`}
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to doctor
      </Link>

      <PageHeader
        eyebrow={marketSummary}
        title={`Services — ${doctor.fullName}`}
        description="Review doctor-selected services, approve or reject pending requests, and manually assign or remove services."
        actions={
          <>
            <Btn href={`/admin/doctors/${id}/profile-requests`} variant="ghost">
              Profile requests
            </Btn>
            <Btn href={`/admin/doctors/${id}/availability`} variant="ghost">
              Availability
            </Btn>
          </>
        }
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

      <div className="gh-admin-doctor-services-layout grid gap-4">
        <AdminCard>
          <h3 className="m-0 text-base font-bold text-[var(--color-text-primary)]">
            Assigned services ({assignments.length})
          </h3>
          {!servicesResult.ok ? (
            <p className="gh-status-warning mt-3 rounded-md border px-4 py-3 text-sm">
              {servicesResult.message}
            </p>
          ) : assignments.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              No services assigned yet.
            </p>
          ) : (
            <div className="mt-4 grid gap-5">
              {renderedAssignmentGroups.map((group) => (
                <div key={group.country?.id ?? "other"}>
                  <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-2">
                    {group.country ? (
                      <FlagBadge code={group.country.code} size={14} />
                    ) : null}
                    <h4 className="m-0 text-portal-compact font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      {group.country ? group.country.name : "Other markets"}
                    </h4>
                    <span className="text-portal-meta text-[var(--color-text-muted)]">
                      ({group.rows.length})
                    </span>
                  </div>
                  <ul className="gh-admin-doctor-service-list mt-3 grid gap-3">
                    {group.rows.map((row) => renderAssignmentRow(row))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard>
          <h3 className="m-0 text-base font-bold text-[var(--color-text-primary)]">
            Manually assign service
          </h3>
          <p className="mt-1 text-portal-compact text-[var(--color-text-muted)]">
            Admin assignments are active immediately. Pick a service under the
            country it belongs to — this doctor serves{" "}
            {assignableCountries.length === 1
              ? "one market"
              : `${assignableCountries.length} markets`}
            .
          </p>
          <div className="mt-4 grid gap-5">
            {unassignedByCountry.map(({ country, items }) => (
              <div key={country.id}>
                <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-2">
                  <FlagBadge code={country.code} size={14} />
                  <h4 className="m-0 text-portal-compact font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                    {country.name}
                  </h4>
                </div>
                {items.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                    All {country.name} services are already assigned to this
                    doctor.
                  </p>
                ) : (
                  <form
                    action={assignAction}
                    className="gh-admin-doctor-assign-form mt-3 flex flex-wrap gap-3"
                  >
                    <select
                      name="serviceId"
                      required
                      aria-label={`Service to assign in ${country.name}`}
                      className="gh-select min-w-[240px]"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select a service…
                      </option>
                      {items.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({KIND_LABELS[s.kind] ?? s.kind})
                        </option>
                      ))}
                    </select>
                    <Btn type="submit" variant="primary">
                      Assign
                    </Btn>
                  </form>
                )}
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
