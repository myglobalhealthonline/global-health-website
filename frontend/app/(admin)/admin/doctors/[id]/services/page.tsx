import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  adminAssignServiceToDoctor,
  adminRemoveDoctorService,
  approveRejectDoctorService,
  fetchAdminDoctorById,
  fetchAdminDoctorServices,
  fetchAdminServices,
  type AdminDoctorServiceAssignmentDto,
} from "@/lib/admin/admin-api";
import { AdminCard, Btn, PageHeader, Pill } from "../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../_components/confirm-delete-button";

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
    redirect(
      `/admin/doctors/${id}/services?success=${encodeURIComponent("Assignment removed")}`,
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

  const catalogResult = await fetchAdminServices({
    countryId: doctor.countryId,
    pageSize: "200",
  });
  const catalog = catalogResult.ok ? catalogResult.data.items : [];
  const unassigned = catalog.filter((s) => !assignedServiceIds.has(s.id));

  return (
    <>
      <Link
        href={`/admin/doctors/${id}`}
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to doctor
      </Link>

      <PageHeader
        eyebrow={doctor.country.name}
        title={`Services — ${doctor.fullName}`}
        description="Review doctor-selected services, approve or reject pending requests, and manually assign or remove services."
        actions={
          <Btn href={`/admin/doctors/${id}/availability`} variant="ghost">
            Availability
          </Btn>
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

      <div className="grid gap-4">
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
            <ul className="mt-4 grid gap-3">
              {assignments.map((row) => (
                <li
                  key={row.id}
                  className="rounded-[var(--radius-card-sm)] border border-[var(--color-border-subtle)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="m-0 text-[15px] font-semibold text-[var(--color-text-primary)]">
                        {row.service.name}
                      </p>
                      <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
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
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.status === "pending" ? (
                        <>
                          <form action={statusAction}>
                            <input
                              type="hidden"
                              name="serviceDoctorId"
                              value={row.id}
                            />
                            <input type="hidden" name="status" value="active" />
                            <Btn type="submit" variant="primary" size="sm">
                              Approve
                            </Btn>
                          </form>
                          <form action={statusAction}>
                            <input
                              type="hidden"
                              name="serviceDoctorId"
                              value={row.id}
                            />
                            <input type="hidden" name="status" value="rejected" />
                            <Btn type="submit" variant="ghost" size="sm">
                              Reject
                            </Btn>
                          </form>
                        </>
                      ) : null}
                      {row.status === "active" ? (
                        <form action={statusAction}>
                          <input
                            type="hidden"
                            name="serviceDoctorId"
                            value={row.id}
                          />
                          <input type="hidden" name="status" value="disabled" />
                          <Btn type="submit" variant="ghost" size="sm">
                            Disable
                          </Btn>
                        </form>
                      ) : null}
                      {row.status === "disabled" || row.status === "rejected" ? (
                        <form action={statusAction}>
                          <input
                            type="hidden"
                            name="serviceDoctorId"
                            value={row.id}
                          />
                          <input type="hidden" name="status" value="active" />
                          <Btn type="submit" variant="secondary" size="sm">
                            Activate
                          </Btn>
                        </form>
                      ) : null}
                      <form action={removeAction}>
                        <input
                          type="hidden"
                          name="serviceDoctorId"
                          value={row.id}
                        />
                        <ConfirmDeleteButton message={`Remove ${row.service.name} from this doctor?`}>
                          Remove
                        </ConfirmDeleteButton>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard>
          <h3 className="m-0 text-base font-bold text-[var(--color-text-primary)]">
            Manually assign service
          </h3>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Admin assignments are active immediately. Health tests and other
            service kinds can be assigned here too.
          </p>
          {unassigned.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              All country services are already assigned to this doctor.
            </p>
          ) : (
            <form action={assignAction} className="mt-4 flex flex-wrap gap-3">
              <select
                name="serviceId"
                required
                aria-label="Service to assign"
                className="min-w-[240px] rounded-md border border-[var(--color-border-subtle)] bg-transparent px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Select a service…
                </option>
                {unassigned.map((s) => (
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
        </AdminCard>
      </div>
    </>
  );
}
