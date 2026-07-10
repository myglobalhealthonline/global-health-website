import { prisma } from "../db/prisma.js";

export type LogAccessParams = {
  patientProfileId: string;
  globalHealthNumber?: string | null;
  accessedByUserId: string | null;
  accessedByRole: string;
  accessedResourceType: string;
  accessedResourceId?: string | null;
  accessAction: "VIEW" | "DOWNLOAD" | "UPLOAD" | "EDIT" | "DELETE";
  accessReason?: string | null;
  relatedAppointmentId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * S-008: a PHI access-log write is itself the compliance evidence, so a
 * failure here must never be silent. Callers MUST await this (never
 * fire-and-forget) so a failed write surfaces as a loud error instead of
 * vanishing — see recordCriticalAudit in modules/audit/audit.service.ts for
 * the equivalent pattern applied to AuditLog.
 */
export async function logAccess(params: LogAccessParams): Promise<void> {
  try {
    let accessedByName: string | null = null;
    if (params.accessedByUserId) {
      const user = await prisma.user.findUnique({
        where: { id: params.accessedByUserId },
        select: { fullName: true },
      });
      accessedByName = user?.fullName ?? null;
    }

    await prisma.medicalAccessLog.create({
      data: {
        patientProfileId: params.patientProfileId,
        globalHealthNumber: params.globalHealthNumber ?? null,
        accessedByUserId: params.accessedByUserId,
        accessedByRole: params.accessedByRole,
        accessedByName,
        accessedResourceType: params.accessedResourceType,
        accessedResourceId: params.accessedResourceId ?? null,
        accessAction: params.accessAction,
        accessReason: params.accessReason ?? null,
        relatedAppointmentId: params.relatedAppointmentId ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("[access-log] CRITICAL: failed to record medical access event", {
      patientProfileId: params.patientProfileId,
      accessedResourceType: params.accessedResourceType,
      accessAction: params.accessAction,
      err: err instanceof Error ? err.message : err,
    });
    throw new Error("Medical access log write failed", { cause: err });
  }
}
