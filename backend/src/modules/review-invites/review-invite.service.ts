import { createHash } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { createReviewCampaignForAppointment, scheduleReviewCampaigns } from "./review-campaign.service.js";
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const createReviewInviteForAppointment = createReviewCampaignForAppointment;
export async function trustpilotInvitesUsedThisMonth(now = new Date()) {
 return prisma.reviewInvite.count({where:{channel:"TRUSTPILOT",dispatchError:null,dispatchedAt:{gte:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1))}}});
}
// Compatibility endpoint: legacy AFS is retired, never release its historical backlog.
export async function dispatchDueTrustpilotInvites(now = new Date()) {
 const result = await scheduleReviewCampaigns(now);
 return { scanned:result.scanned,sent:0,retrying:0,skipped:0,quotaRemaining:0,queued:result.queued };
}
export async function getReviewInviteByToken(token: string) {
  const capability = await prisma.reviewInviteToken.findUnique({ where: { tokenHash: hashToken(token) } });
  return prisma.reviewInvite.findUnique({
    where: capability ? { id: capability.inviteId } : { tokenHash: hashToken(token) },
    include: {
      appointment: {
        select: { id: true, fullName: true, countryCode: true },
      },
    },
  });
}

export async function submitReviewInvite(
  token: string,
  ratings: {
    overallSatisfaction: number;
    doctorProfessionalism: number;
    communicationClarity: number;
    timelinessOfService: number;
    valueForMoney: number;
    likeliness: number;
    bookingExperience: number;
  },
) {
  const invite = await getReviewInviteByToken(token);
  if (!invite) return { ok: false as const, message: "Review not found" };
  if (invite.submittedAt) return { ok: false as const, message: "Review already submitted" };
  if (invite.expiresAt < new Date()) {
    return { ok: false as const, message: "Review link has expired" };
  }

  await prisma.reviewInvite.update({
    where: { id: invite.id },
    data: {
      ...ratings,
      submittedAt: new Date(),
    },
  });
  return { ok: true as const };
}
