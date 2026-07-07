import type { ServiceKind } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

/** Service kinds doctors may self-select (health tests remain admin-only). */
export const DOCTOR_SELECTABLE_SERVICE_KINDS: ServiceKind[] = [
  "GENERAL",
  "SPECIALIST",
  "PRESCRIPTION",
];

export type ServiceDoctorStatus = "pending" | "active" | "rejected" | "disabled";
export type ServiceDoctorSelectedBy = "admin" | "doctor";

export type DoctorServiceAssignmentDto = {
  id: string;
  serviceId: string;
  status: ServiceDoctorStatus;
  selectedBy: ServiceDoctorSelectedBy;
  isActive: boolean;
  /** Admin-set payout for this doctor+service, in cents. Null = not set. */
  doctorAmountCents: number | null;
};

export type DoctorSelectableServiceDto = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  kind: ServiceKind;
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  assignment: DoctorServiceAssignmentDto | null;
};

function isActiveForStatus(status: ServiceDoctorStatus): boolean {
  return status === "active";
}

async function getDoctorCountryIds(doctorId: string): Promise<string[]> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      countryId: true,
      additionalCountries: {
        where: { active: true },
        select: { countryId: true },
      },
    },
  });
  if (!doctor) return [];
  const ids = new Set<string>([doctor.countryId]);
  for (const row of doctor.additionalCountries) {
    ids.add(row.countryId);
  }
  return Array.from(ids);
}

async function isDoctorServiceSelfSelectApprovalRequired(
  doctorId: string,
): Promise<boolean> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { countryId: true },
  });
  if (!doctor) return true;
  const setting = await prisma.bookingSetting.findUnique({
    where: { countryId: doctor.countryId },
    select: { doctorServiceSelfSelectApproval: true },
  });
  return setting?.doctorServiceSelfSelectApproval ?? true;
}

export async function listDoctorSelectableServices(doctorId: string): Promise<{
  approvalRequired: boolean;
  items: DoctorSelectableServiceDto[];
}> {
  try {
    const countryIds = await getDoctorCountryIds(doctorId);
    if (countryIds.length === 0) {
      return { approvalRequired: true, items: [] };
    }

    const [approvalRequired, services, assignments] = await Promise.all([
      isDoctorServiceSelfSelectApprovalRequired(doctorId),
      prisma.service.findMany({
        where: {
          countryId: { in: countryIds },
          kind: { in: DOCTOR_SELECTABLE_SERVICE_KINDS },
          isActive: true,
        },
        orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          summary: true,
          kind: true,
          durationMinutes: true,
          basePriceCents: true,
          currencyCode: true,
          countryId: true,
          country: { select: { name: true, code: true } },
        },
      }),
      prisma.serviceDoctor.findMany({
        where: { doctorId },
        select: {
          id: true,
          serviceId: true,
          status: true,
          selectedBy: true,
          isActive: true,
          doctorAmountCents: true,
        },
      }),
    ]);

    const assignmentByServiceId = new Map(
      assignments.map((a) => [
        a.serviceId,
        {
          id: a.id,
          serviceId: a.serviceId,
          status: a.status as ServiceDoctorStatus,
          selectedBy: a.selectedBy as ServiceDoctorSelectedBy,
          isActive: a.isActive,
          doctorAmountCents: a.doctorAmountCents,
        },
      ]),
    );

    return {
      approvalRequired,
      items: services.map(({ country, ...s }) => ({
        ...s,
        countryName: country.name,
        countryCode: country.code,
        assignment: assignmentByServiceId.get(s.id) ?? null,
      })),
    };
  } catch (error) {
    throw normalizeDbError(error, "Doctor services data is unavailable");
  }
}

export async function saveDoctorServiceSelections(
  doctorId: string,
  serviceIds: string[],
): Promise<{ approvalRequired: boolean; items: DoctorSelectableServiceDto[] }> {
  try {
    const countryIds = await getDoctorCountryIds(doctorId);
    if (countryIds.length === 0) {
      throw new Error("Doctor profile not found");
    }

    const uniqueIds = Array.from(
      new Set(serviceIds.map((id) => id.trim()).filter(Boolean)),
    );

    const eligibleServices = await prisma.service.findMany({
      where: {
        id: { in: uniqueIds },
        countryId: { in: countryIds },
        kind: { in: DOCTOR_SELECTABLE_SERVICE_KINDS },
        isActive: true,
      },
      select: { id: true },
    });
    const eligibleIds = new Set(eligibleServices.map((s) => s.id));
    const filteredIds = uniqueIds.filter((id) => eligibleIds.has(id));

    const approvalRequired = await isDoctorServiceSelfSelectApprovalRequired(doctorId);
    const initialStatus: ServiceDoctorStatus = approvalRequired ? "pending" : "active";

    await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceDoctor.findMany({
        where: { doctorId },
        select: {
          id: true,
          serviceId: true,
          selectedBy: true,
          status: true,
        },
      });

      const existingByServiceId = new Map(existing.map((r) => [r.serviceId, r]));

      // Remove doctor-initiated selections that were deselected. Admin rows are never deleted by doctor.
      const toRemove = existing.filter(
        (r) =>
          r.selectedBy === "doctor" &&
          !filteredIds.includes(r.serviceId),
      );
      if (toRemove.length > 0) {
        await tx.serviceDoctor.deleteMany({
          where: { id: { in: toRemove.map((r) => r.id) } },
        });
      }

      for (let i = 0; i < filteredIds.length; i++) {
        const serviceId = filteredIds[i]!;
        const row = existingByServiceId.get(serviceId);

        if (!row) {
          await tx.serviceDoctor.create({
            data: {
              serviceId,
              doctorId,
              selectedBy: "doctor",
              status: initialStatus,
              isActive: isActiveForStatus(initialStatus),
              sortOrder: i,
            },
          });
          continue;
        }

        if (row.selectedBy === "admin") {
          // Doctor cannot override admin assignments.
          continue;
        }

        // Re-select after rejection or update pending sort order.
        await tx.serviceDoctor.update({
          where: { id: row.id },
          data: {
            selectedBy: "doctor",
            status: row.status === "active" ? "active" : initialStatus,
            isActive:
              row.status === "active"
                ? true
                : isActiveForStatus(initialStatus),
            sortOrder: i,
          },
        });
      }
    });

    return listDoctorSelectableServices(doctorId);
  } catch (error) {
    throw normalizeDbError(error, "Could not save doctor service selections");
  }
}

export type PendingDoctorServiceRequestDto = {
  /** ServiceDoctor row id. */
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSlug: string;
  serviceId: string;
  serviceName: string;
  serviceKind: ServiceKind;
  countryCode: string;
  countryName: string;
  createdAt: string;
};

/**
 * Pending doctor-initiated service requests awaiting admin approval.
 * Powers the admin alert badge / notification feed. Optionally scoped to
 * a single country (by code) so a country-scoped admin only sees their
 * own queue; omit `countryCode` for the global queue.
 */
export async function listPendingDoctorServiceRequests(opts?: {
  countryCode?: string | null;
}): Promise<{ count: number; items: PendingDoctorServiceRequestDto[] }> {
  try {
    const countryCode = opts?.countryCode?.trim() || null;
    const rows = await prisma.serviceDoctor.findMany({
      where: {
        status: "pending",
        selectedBy: "doctor",
        ...(countryCode
          ? {
              doctor: {
                country: { code: { equals: countryCode, mode: "insensitive" } },
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        doctorId: true,
        serviceId: true,
        createdAt: true,
        doctor: {
          select: {
            fullName: true,
            slug: true,
            country: { select: { code: true, name: true } },
          },
        },
        service: { select: { name: true, kind: true } },
      },
    });

    const items: PendingDoctorServiceRequestDto[] = rows.map((r) => ({
      id: r.id,
      doctorId: r.doctorId,
      doctorName: r.doctor.fullName,
      doctorSlug: r.doctor.slug,
      serviceId: r.serviceId,
      serviceName: r.service.name,
      serviceKind: r.service.kind,
      countryCode: r.doctor.country.code,
      countryName: r.doctor.country.name,
      createdAt: r.createdAt.toISOString(),
    }));

    return { count: items.length, items };
  } catch (error) {
    throw normalizeDbError(
      error,
      "Pending doctor service requests are unavailable",
    );
  }
}

export type AdminDoctorServiceRowDto = {
  id: string;
  serviceId: string;
  doctorId: string;
  status: ServiceDoctorStatus;
  selectedBy: ServiceDoctorSelectedBy;
  isActive: boolean;
  sortOrder: number;
  /** Admin-set payout for this doctor+service, in cents. Null = not set. */
  doctorAmountCents: number | null;
  createdAt: string;
  updatedAt: string;
  service: {
    id: string;
    slug: string;
    name: string;
    kind: ServiceKind;
    durationMinutes: number | null;
    basePriceCents: number | null;
    currencyCode: string | null;
    isActive: boolean;
  };
};

export async function listAdminDoctorServices(
  doctorId: string,
): Promise<AdminDoctorServiceRowDto[]> {
  try {
    const rows = await prisma.serviceDoctor.findMany({
      where: { doctorId },
      orderBy: [{ service: { kind: "asc" } }, { sortOrder: "asc" }],
      include: {
        service: {
          select: {
            id: true,
            slug: true,
            name: true,
            kind: true,
            durationMinutes: true,
            basePriceCents: true,
            currencyCode: true,
            isActive: true,
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      serviceId: r.serviceId,
      doctorId: r.doctorId,
      status: r.status as ServiceDoctorStatus,
      selectedBy: r.selectedBy as ServiceDoctorSelectedBy,
      isActive: r.isActive,
      sortOrder: r.sortOrder,
      doctorAmountCents: r.doctorAmountCents,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      service: r.service,
    }));
  } catch (error) {
    throw normalizeDbError(error, "Doctor services data is unavailable");
  }
}

export async function adminAssignServiceToDoctor(
  doctorId: string,
  serviceId: string,
  doctorAmountCents?: number | null,
): Promise<AdminDoctorServiceRowDto | null> {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: {
        countryId: true,
        additionalCountries: { where: { active: true }, select: { countryId: true } },
      },
    });
    if (!doctor) return null;

    const countryIds = new Set([
      doctor.countryId,
      ...doctor.additionalCountries.map((c) => c.countryId),
    ]);

    const service = await prisma.service.findFirst({
      where: { id: serviceId, countryId: { in: Array.from(countryIds) } },
      select: { id: true },
    });
    if (!service) return null;

    const row = await prisma.serviceDoctor.upsert({
      where: {
        serviceId_doctorId: { serviceId, doctorId },
      },
      create: {
        serviceId,
        doctorId,
        selectedBy: "admin",
        status: "active",
        isActive: true,
        ...(doctorAmountCents !== undefined ? { doctorAmountCents } : {}),
      },
      update: {
        selectedBy: "admin",
        status: "active",
        isActive: true,
        ...(doctorAmountCents !== undefined ? { doctorAmountCents } : {}),
      },
      include: {
        service: {
          select: {
            id: true,
            slug: true,
            name: true,
            kind: true,
            durationMinutes: true,
            basePriceCents: true,
            currencyCode: true,
            isActive: true,
          },
        },
      },
    });

    return {
      id: row.id,
      serviceId: row.serviceId,
      doctorId: row.doctorId,
      status: row.status as ServiceDoctorStatus,
      selectedBy: row.selectedBy as ServiceDoctorSelectedBy,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      doctorAmountCents: row.doctorAmountCents,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      service: row.service,
    };
  } catch (error) {
    throw normalizeDbError(error, "Could not assign service to doctor");
  }
}

export async function adminUpdateDoctorService(
  doctorId: string,
  serviceDoctorId: string,
  updates: {
    status?: ServiceDoctorStatus;
    doctorAmountCents?: number | null;
  },
): Promise<AdminDoctorServiceRowDto | null> {
  try {
    const existing = await prisma.serviceDoctor.findFirst({
      where: { id: serviceDoctorId, doctorId },
    });
    if (!existing) return null;

    const row = await prisma.serviceDoctor.update({
      where: { id: serviceDoctorId },
      data: {
        ...(updates.status !== undefined
          ? { status: updates.status, isActive: isActiveForStatus(updates.status) }
          : {}),
        ...(updates.doctorAmountCents !== undefined
          ? { doctorAmountCents: updates.doctorAmountCents }
          : {}),
      },
      include: {
        service: {
          select: {
            id: true,
            slug: true,
            name: true,
            kind: true,
            durationMinutes: true,
            basePriceCents: true,
            currencyCode: true,
            isActive: true,
          },
        },
      },
    });

    return {
      id: row.id,
      serviceId: row.serviceId,
      doctorId: row.doctorId,
      status: row.status as ServiceDoctorStatus,
      selectedBy: row.selectedBy as ServiceDoctorSelectedBy,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      doctorAmountCents: row.doctorAmountCents,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      service: row.service,
    };
  } catch (error) {
    throw normalizeDbError(error, "Could not update doctor service assignment");
  }
}

export async function adminRemoveDoctorService(
  doctorId: string,
  serviceDoctorId: string,
): Promise<boolean> {
  try {
    const result = await prisma.serviceDoctor.deleteMany({
      where: { id: serviceDoctorId, doctorId },
    });
    return result.count > 0;
  } catch (error) {
    throw normalizeDbError(error, "Could not remove doctor service assignment");
  }
}
