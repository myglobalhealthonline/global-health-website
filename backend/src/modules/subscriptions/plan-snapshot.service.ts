import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { buildPlanSnapshot, type PlanForSnapshot, type PlanSnapshot } from "./plan-snapshot.js";

type Tx = Prisma.TransactionClient;

/**
 * Load a plan + its rules into the snapshot input shape. Uses the passed tx
 * when supplied (so a renewal re-snapshot reads the same consistent view).
 */
export async function loadPlanForSnapshot(
  planId: string,
  client: Tx | typeof prisma = prisma,
): Promise<PlanForSnapshot | null> {
  const plan = await client.pricingPlan.findUnique({
    where: { id: planId },
    include: {
      consultationRules: true,
      perkRules: true,
      healthTestRules: true,
    },
  });
  if (!plan) return null;
  return {
    monthlyPriceCents: plan.monthlyPriceCents,
    currencyCode: plan.currencyCode,
    monthlyConsultationCredits: plan.monthlyConsultationCredits,
    wellnessCreditsPerMonth: plan.wellnessCreditsPerMonth,
    familyEnabled: plan.familyEnabled,
    consultationRules: plan.consultationRules.map((r) => ({
      serviceId: r.serviceId,
      isIncluded: r.isIncluded,
      usesCredits: r.usesCredits,
      creditsPerUse: r.creditsPerUse,
      discountMode: r.discountMode,
      discountPercent: r.discountPercent,
      fixedPriceCents: r.fixedPriceCents,
      unlockAfterPaidMonths: r.unlockAfterPaidMonths,
      familyUsable: r.familyUsable,
      isActive: r.isActive,
    })),
    perkRules: plan.perkRules.map((r) => ({
      perkKey: r.perkKey,
      unlockMode: r.unlockMode,
      unlockAfterPaidMonths: r.unlockAfterPaidMonths,
    })),
    healthTestRules: plan.healthTestRules.map((r) => ({
      healthTestId: r.healthTestId,
      requiredWellnessCredits: r.requiredWellnessCredits,
      unlockAfterPaidMonths: r.unlockAfterPaidMonths,
      isActive: r.isActive,
    })),
  };
}

/** Build a fresh snapshot at the given version. Throws if the plan is gone. */
export async function captureSnapshot(
  planId: string,
  snapshotVersion: number,
  client: Tx | typeof prisma = prisma,
): Promise<PlanSnapshot> {
  const planForSnapshot = await loadPlanForSnapshot(planId, client);
  if (!planForSnapshot) {
    throw new Error(`captureSnapshot: plan ${planId} not found`);
  }
  return buildPlanSnapshot(planForSnapshot, snapshotVersion);
}
