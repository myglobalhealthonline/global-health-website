import { Prisma, type PerkGrantStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

export class PerkGrantNotFoundError extends Error {
  constructor() {
    super("Perk grant not found");
    this.name = "PerkGrantNotFoundError";
  }
}

const perkGrantInclude = {
  subscription: {
    select: {
      id: true,
      countryCode: true,
      status: true,
      paidMonthsCount: true,
      user: { select: { id: true, email: true, fullName: true } },
      plan: { select: { id: true, name: true, slug: true } },
    },
  },
} satisfies Prisma.SubscriptionPerkGrantInclude;

export type AdminPerkGrantRecord = Prisma.SubscriptionPerkGrantGetPayload<{
  include: typeof perkGrantInclude;
}>;

/** Pending-approval queue (§36.13) — per-subscriber perk grants by status. */
export async function listPerkGrants(status: PerkGrantStatus): Promise<AdminPerkGrantRecord[]> {
  try {
    return await prisma.subscriptionPerkGrant.findMany({
      where: { status },
      orderBy: { createdAt: "asc" },
      include: perkGrantInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Perk grants are unavailable");
  }
}

/**
 * Approve a per-subscriber perk grant (NOT plan-wide — §36.13). Idempotent: an
 * already-approved grant is returned unchanged. Returns the updated record.
 */
export async function approvePerkGrant(
  id: string,
  adminId: string | null,
): Promise<AdminPerkGrantRecord> {
  const grant = await prisma.subscriptionPerkGrant.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!grant) throw new PerkGrantNotFoundError();

  if (grant.status === "APPROVED") {
    return prisma.subscriptionPerkGrant.findUniqueOrThrow({ where: { id }, include: perkGrantInclude });
  }

  try {
    return await prisma.subscriptionPerkGrant.update({
      where: { id },
      data: { status: "APPROVED", approvedByAdminId: adminId, approvedAt: new Date() },
      include: perkGrantInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Perk grants are unavailable");
  }
}
