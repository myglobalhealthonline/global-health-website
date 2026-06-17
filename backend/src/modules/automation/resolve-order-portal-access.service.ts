import { absoluteSiteUrl } from "../../lib/email/send-email.js";
import { prisma } from "../../db/prisma.js";
import { issuePasswordResetToken } from "../auth/auth.service.js";
import type { PrePaymentEmailPortalAccess } from "./pre-payment-email-template.js";

export type OrderPortalSeed = {
  setPasswordUrl?: string | null;
  tempPassword?: string | null;
};

/** Persist portal links from manual booking so every automation step can include them. */
export async function persistOrderPortalAccess(
  orderId: string,
  seed: OrderPortalSeed,
): Promise<void> {
  const data: {
    patientPortalSetPasswordUrl?: string;
    patientPortalTempPassword?: string | null;
  } = {};

  if (seed.setPasswordUrl?.trim()) {
    data.patientPortalSetPasswordUrl = seed.setPasswordUrl.trim();
  }
  if (seed.tempPassword !== undefined) {
    data.patientPortalTempPassword = seed.tempPassword?.trim() || null;
  }

  if (Object.keys(data).length === 0) return;

  await prisma.order.update({
    where: { id: orderId },
    data,
  });
}

async function issueSetPasswordUrl(userId: string): Promise<string> {
  const inviteToken = await issuePasswordResetToken(userId, {
    ttlMinutes: 7 * 24 * 60,
    isInvite: true,
  });
  return absoluteSiteUrl(
    `/reset-password?token=${encodeURIComponent(inviteToken)}&invite=1`,
  );
}

/** Resolve patient portal links for emails / WhatsApp on any automation step. */
export async function resolveOrderPortalAccess(
  orderId: string,
  opts?: { includeTempPassword?: boolean },
): Promise<PrePaymentEmailPortalAccess | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      email: true,
      fullName: true,
      patientPortalSetPasswordUrl: true,
      patientPortalTempPassword: true,
      patientPortalTempPasswordSent: true,
    },
  });
  if (!order) return null;

  const signInUrl = absoluteSiteUrl("/login");
  let setPasswordUrl = order.patientPortalSetPasswordUrl?.trim() || null;
  let userId = order.userId;

  if (!setPasswordUrl && userId) {
    setPasswordUrl = await issueSetPasswordUrl(userId);
    await prisma.order.update({
      where: { id: orderId },
      data: { patientPortalSetPasswordUrl: setPasswordUrl },
    });
  }

  // Website guest orders (no userId, no persisted setPasswordUrl): provision
  // a portal account so the patient gets a real set-password link in both
  // the appointment confirmation email and WhatsApp message.
  if (!setPasswordUrl && !userId && order.email) {
    try {
      const { upsertPatientProfileByEmail } = await import(
        "../patient-profile/patient-profile.service.js"
      );
      const { userId: newUserId } = await upsertPatientProfileByEmail({
        email: order.email,
        fullName: order.fullName ?? undefined,
      });
      if (newUserId) {
        userId = newUserId;
        await prisma.order.update({ where: { id: orderId }, data: { userId: newUserId } });
        setPasswordUrl = await issueSetPasswordUrl(newUserId);
        await prisma.order.update({
          where: { id: orderId },
          data: { patientPortalSetPasswordUrl: setPasswordUrl },
        });
      }
    } catch {
      // Provisioning failure is non-fatal — fall back to sign-in URL only.
    }
  }

  const includeTemp =
    opts?.includeTempPassword !== false &&
    !order.patientPortalTempPasswordSent &&
    Boolean(order.patientPortalTempPassword?.trim());

  return {
    signInUrl,
    setPasswordUrl: setPasswordUrl ?? signInUrl,
    tempPassword: includeTemp ? order.patientPortalTempPassword!.trim() : null,
  };
}

/** Clear one-time temp password after it has been included in a notification. */
export async function markOrderPortalTempPasswordSent(orderId: string): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { patientPortalTempPasswordSent: true },
  });
}
