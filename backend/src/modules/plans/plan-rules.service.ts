import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { PlanNotFoundError } from "./plans.service.js";
import type {
  AdminConsultationRuleBody,
  AdminPerkRuleBody,
  AdminHealthTestRuleBody,
} from "../../validations/admin-plans.schema.js";

export class RuleServiceNotFoundError extends Error {
  constructor() {
    super("Service not found");
    this.name = "RuleServiceNotFoundError";
  }
}

export class RulePrescriptionExcludedError extends Error {
  constructor() {
    super("Prescription services cannot be linked to a subscription plan");
    this.name = "RulePrescriptionExcludedError";
  }
}

export class RuleCrossCountryError extends Error {
  constructor(message = "Service belongs to a different country than the plan") {
    super(message);
    this.name = "RuleCrossCountryError";
  }
}

export class RuleServiceInactiveError extends Error {
  constructor() {
    super("Inactive services cannot be linked to a subscription plan");
    this.name = "RuleServiceInactiveError";
  }
}

export class RuleHealthTestNotFoundError extends Error {
  constructor() {
    super("Health test not found");
    this.name = "RuleHealthTestNotFoundError";
  }
}

const consultationRuleInclude = {
  service: {
    select: { id: true, name: true, slug: true, kind: true, basePriceCents: true, currencyCode: true },
  },
} satisfies Prisma.PlanConsultationRuleInclude;

const healthTestRuleInclude = {
  healthTest: { select: { id: true, title: true, slug: true, priceCents: true, currencyCode: true } },
} satisfies Prisma.HealthTestKitRedemptionRuleInclude;

async function loadPlanCountry(planId: string): Promise<string> {
  const plan = await prisma.pricingPlan.findUnique({ where: { id: planId }, select: { countryId: true } });
  if (!plan) throw new PlanNotFoundError();
  return plan.countryId;
}

// ─── Consultation rules ──────────────────────────────────────────────────────

export async function listConsultationRules(planId: string) {
  await loadPlanCountry(planId);
  try {
    return await prisma.planConsultationRule.findMany({
      where: { planId },
      orderBy: { createdAt: "asc" },
      include: consultationRuleInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Plan rules are unavailable");
  }
}

/**
 * Upsert a consultation rule keyed (planId, serviceId). Enforces the §36.10/
 * §36.11 guards in app-logic for a clean error (the two composite FKs are the
 * structural guarantee): the Service must exist, be in the plan's country, and
 * NOT be a PRESCRIPTION service.
 */
export async function setConsultationRule(planId: string, body: AdminConsultationRuleBody) {
  const planCountryId = await loadPlanCountry(planId);
  const service = await prisma.service.findUnique({
    where: { id: body.serviceId },
    select: { id: true, countryId: true, kind: true, isActive: true },
  });
  if (!service) throw new RuleServiceNotFoundError();
  if (service.kind === "PRESCRIPTION") throw new RulePrescriptionExcludedError();
  if (service.countryId !== planCountryId) throw new RuleCrossCountryError();
  if (!service.isActive) throw new RuleServiceInactiveError();

  const data = {
    isIncluded: body.isIncluded,
    usesCredits: body.usesCredits,
    creditsPerUse: body.creditsPerUse,
    discountMode: body.discountMode,
    discountPercent: body.discountMode === "PERCENT" ? body.discountPercent ?? null : null,
    fixedPriceCents: body.discountMode === "FIXED" ? body.fixedPriceCents ?? null : null,
    unlockAfterPaidMonths: body.unlockAfterPaidMonths,
    familyUsable: body.familyUsable,
    isActive: body.isActive,
  };

  try {
    return await prisma.planConsultationRule.upsert({
      where: { planId_serviceId: { planId, serviceId: body.serviceId } },
      create: { planId, countryId: planCountryId, serviceId: body.serviceId, ...data },
      update: data,
      include: consultationRuleInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Plan rules are unavailable");
  }
}

/**
 * Hard-delete a consultation rule. Safe for existing subscribers: pricing +
 * grants read the frozen `planSnapshot` (D18), never the live rule, and no
 * other table FK-references this row. To keep a service on the plan but mark it
 * unavailable, save a rule with `isActive=false` instead of removing it.
 * Returns false if absent.
 */
export async function deleteConsultationRule(planId: string, serviceId: string): Promise<boolean> {
  const rule = await prisma.planConsultationRule.findUnique({
    where: { planId_serviceId: { planId, serviceId } },
    select: { id: true },
  });
  if (!rule) return false;
  await prisma.planConsultationRule.delete({ where: { id: rule.id } });
  return true;
}

// ─── Perk rules ──────────────────────────────────────────────────────────────

export async function listPerkRules(planId: string) {
  await loadPlanCountry(planId);
  return prisma.planPerkRule.findMany({ where: { planId }, orderBy: { perkKey: "asc" } });
}

export async function setPerkRule(planId: string, body: AdminPerkRuleBody) {
  await loadPlanCountry(planId);
  const data = {
    unlockMode: body.unlockMode,
    unlockAfterPaidMonths:
      body.unlockMode === "AFTER_PAID_MONTHS" ? body.unlockAfterPaidMonths ?? null : null,
  };
  try {
    return await prisma.planPerkRule.upsert({
      where: { planId_perkKey: { planId, perkKey: body.perkKey } },
      create: { planId, perkKey: body.perkKey, ...data },
      update: data,
    });
  } catch (error) {
    throw normalizeDbError(error, "Plan perks are unavailable");
  }
}

/** PlanPerkRule has no isActive column; deleting plan config is safe because
 *  existing subscribers read their snapshot, not the live rule (§36.16). */
export async function deletePerkRule(planId: string, perkKey: AdminPerkRuleBody["perkKey"]): Promise<boolean> {
  const rule = await prisma.planPerkRule.findUnique({
    where: { planId_perkKey: { planId, perkKey } },
    select: { id: true },
  });
  if (!rule) return false;
  await prisma.planPerkRule.delete({ where: { id: rule.id } });
  return true;
}

// ─── Health-test redemption rules ────────────────────────────────────────────

export async function listHealthTestRules(planId: string) {
  await loadPlanCountry(planId);
  return prisma.healthTestKitRedemptionRule.findMany({
    where: { planId },
    orderBy: { createdAt: "asc" },
    include: healthTestRuleInclude,
  });
}

export async function setHealthTestRule(planId: string, body: AdminHealthTestRuleBody) {
  const planCountryId = await loadPlanCountry(planId);
  const healthTest = await prisma.healthTest.findUnique({
    where: { id: body.healthTestId },
    select: { id: true, countryId: true },
  });
  if (!healthTest) throw new RuleHealthTestNotFoundError();
  if (healthTest.countryId !== planCountryId) {
    throw new RuleCrossCountryError("Health test belongs to a different country than the plan");
  }

  const data = {
    requiredWellnessCredits: body.requiredWellnessCredits,
    unlockAfterPaidMonths: body.unlockAfterPaidMonths,
    isActive: body.isActive,
  };
  try {
    return await prisma.healthTestKitRedemptionRule.upsert({
      where: { planId_healthTestId: { planId, healthTestId: body.healthTestId } },
      create: { planId, healthTestId: body.healthTestId, ...data },
      update: data,
      include: healthTestRuleInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Plan redemption rules are unavailable");
  }
}

/**
 * Hard-delete a health-test redemption rule. Same safety rationale as
 * {@link deleteConsultationRule}: subscribers read the snapshot, nothing
 * FK-references this row. Returns false if absent.
 */
export async function deleteHealthTestRule(planId: string, healthTestId: string): Promise<boolean> {
  const rule = await prisma.healthTestKitRedemptionRule.findUnique({
    where: { planId_healthTestId: { planId, healthTestId } },
    select: { id: true },
  });
  if (!rule) return false;
  await prisma.healthTestKitRedemptionRule.delete({ where: { id: rule.id } });
  return true;
}
