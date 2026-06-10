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
  } catch {
    // Log failure must never break the calling endpoint
  }
}
