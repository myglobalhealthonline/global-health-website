import type { ServiceKind } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { percentDiscountAmountCents } from "../subscriptions/pricing-resolver.js";
import {
  companyIsLive,
  getActiveMembershipForUser,
} from "./corporate-shared.js";

export type CorporateDiscount = {
  discountPercent: number;
  discountCents: number;
  companyId: string;
  companyName: string;
  planName: string;
  memberType: "EMPLOYEE" | "BENEFICIARY";
};

/**
 * Corporate benefit engine — the ONLY place discount eligibility is
 * decided. Called from checkout pricing (inside the Order tx) and the
 * cart/benefit preview endpoints. Returns null when no discount
 * applies. Never trusts client input: membership, company status,
 * contract window, and rule matching are all resolved from the DB here.
 */
export async function resolveCorporateDiscount(input: {
  userId: string | null | undefined;
  serviceId: string;
  serviceKind: ServiceKind;
  baseCents: number;
}): Promise<CorporateDiscount | null> {
  if (!input.userId || input.baseCents <= 0) return null;
  // Same kinds the batch (checkout) resolver covers. Without this, a rule on
  // another ServiceKind would show a discount in the benefit picker that
  // checkout then refuses to apply.
  if (input.serviceKind !== "GENERAL" && input.serviceKind !== "SPECIALIST") return null;
  const membership = await getActiveMembershipForUser(input.userId);
  if (!membership) return null;

  const rules = await prisma.corporateBenefitRule.findMany({
    where: { corporatePlanId: membership.company.planId, isActive: true },
  });
  // Pinned-service rule wins over kind rule.
  const rule =
    rules.find((r) => r.serviceId === input.serviceId) ??
    rules.find((r) => !r.serviceId && r.serviceKind === input.serviceKind);
  if (!rule) return null;
  if (membership.memberType === "BENEFICIARY" && !rule.appliesToBeneficiaries) return null;
  if (rule.discountPercent <= 0) return null;

  const discountCents = percentDiscountAmountCents(input.baseCents, rule.discountPercent);
  if (discountCents <= 0) return null;
  return {
    discountPercent: rule.discountPercent,
    discountCents,
    companyId: membership.company.id,
    companyName: membership.company.name,
    planName: membership.company.plan.name,
    memberType: membership.memberType,
  };
}

/**
 * Batch sibling for checkout: resolve discounts for many order lines
 * with one membership + one rules query. `client` lets the checkout tx
 * read through its own transaction handle.
 */
export async function resolveCorporateDiscountsForItems(
  client: {
    service: { findMany: (args: never) => Promise<{ id: string; kind: ServiceKind }[]> };
  },
  input: {
    userId: string | null | undefined;
    items: { id: string; serviceId: string | null; kind: string; baseCents: number }[];
  },
): Promise<Map<string, CorporateDiscount>> {
  const out = new Map<string, CorporateDiscount>();
  if (!input.userId) return out;
  const consultationItems = input.items.filter(
    (i) =>
      (i.kind === "GENERAL_CONSULTATION" || i.kind === "SPECIALIST_CONSULTATION") &&
      i.serviceId &&
      i.baseCents > 0,
  );
  if (consultationItems.length === 0) return out;

  const membership = await getActiveMembershipForUser(input.userId);
  if (!membership) return out;
  const rules = await prisma.corporateBenefitRule.findMany({
    where: { corporatePlanId: membership.company.planId, isActive: true },
  });
  if (rules.length === 0) return out;

  const serviceIds = Array.from(new Set(consultationItems.map((i) => i.serviceId as string)));
  const services = await client.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, kind: true },
  } as never);
  const kindById = new Map(services.map((s) => [s.id, s.kind]));

  for (const item of consultationItems) {
    const serviceKind = kindById.get(item.serviceId as string);
    if (!serviceKind) continue;
    const rule =
      rules.find((r) => r.serviceId === item.serviceId) ??
      rules.find((r) => !r.serviceId && r.serviceKind === serviceKind);
    if (!rule) continue;
    if (membership.memberType === "BENEFICIARY" && !rule.appliesToBeneficiaries) continue;
    if (rule.discountPercent <= 0) continue;
    const discountCents = percentDiscountAmountCents(item.baseCents, rule.discountPercent);
    if (discountCents <= 0) continue;
    out.set(item.id, {
      discountPercent: rule.discountPercent,
      discountCents,
      companyId: membership.company.id,
      companyName: membership.company.name,
      planName: membership.company.plan.name,
      memberType: membership.memberType,
    });
  }
  return out;
}

export type CorporateBookabilityResult =
  | { ok: true; requestId?: string; employeeId?: string; pinnedDoctorId?: string | null }
  | {
      ok: false;
      message: string;
      /** True only when the requester actually belongs to some corporate company.
       *  Callers answer 403 + `message` for those people (they need to know WHY
       *  their own benefit was refused) and a bare 404 for everyone else, so a
       *  private corporate service is not an existence oracle for any logged-in
       *  patient — only for the members it already exists for. */
      isMember: boolean;
    };

/** Any non-removed corporate membership for this user, employee or beneficiary.
 *  Only consulted on the refusal path, so it costs nothing in the happy case. */
async function holdsCorporateMembership(userId: string): Promise<boolean> {
  const [employee, beneficiary] = await Promise.all([
    prisma.corporateEmployee.count({ where: { userId, status: { not: "REMOVED" } } }),
    prisma.corporateBeneficiary.count({ where: { userId, status: { not: "REMOVED" } } }),
  ]);
  return employee + beneficiary > 0;
}

/**
 * Server-side gate for booking a non-PUBLIC service (cart add +
 * direct appointment create). PUBLIC services never reach this.
 *
 * CORPORATE_ONLY (pre-assessment): requester must be a not-yet-active
 * corporate employee of a live company; when the company pins a
 * pre-assessment doctor, the booking must use that doctor.
 *
 * CORPORATE_REQUEST_ONLY: requester must be the employee of an OPEN
 * CorporateServiceRequest for this exact service.
 */
export async function assertCorporateServiceBookable(input: {
  userId: string | null | undefined;
  serviceId: string;
  visibility: "CORPORATE_ONLY" | "CORPORATE_REQUEST_ONLY" | "ADMIN_ONLY";
  doctorId?: string | null;
  /** True when the caller is actually creating a booking (cart add, appointment
   *  create). A pinned pre-assessment doctor is then REQUIRED, not merely
   *  "not contradicted" — a booking that names no doctor slipped the pin.
   *  Read-only visibility checks (the service-detail lookup) leave it off:
   *  they carry no doctor and must not 404 an otherwise eligible member. */
  bookingIntent?: boolean;
  /** Country of the service being booked. When given, the requester's company
   *  must be in that country — the corporate services are seeded per country,
   *  and nothing else stopped a PT employee booking the CZ row of their own
   *  company's service. */
  serviceCountryCode?: string | null;
  isAdmin?: boolean;
}): Promise<CorporateBookabilityResult> {
  if (input.isAdmin) return { ok: true };
  if (input.visibility === "ADMIN_ONLY") {
    return { ok: false, message: "Service not found", isMember: false };
  }
  if (!input.userId) {
    return { ok: false, message: "Sign in to book this service", isMember: false };
  }
  const userId = input.userId;

  const companyCountry = input.serviceCountryCode
    ? { company: { countryCode: input.serviceCountryCode.toLowerCase() } }
    : {};

  if (input.visibility === "CORPORATE_ONLY") {
    const employee = await prisma.corporateEmployee.findFirst({
      where: {
        userId: input.userId,
        status: { in: ["PROFILE_COMPLETE", "PREASSESSMENT_PENDING", "PREASSESSMENT_BOOKED"] },
        ...companyCountry,
      },
      include: { company: { include: { plan: true } } },
    });
    if (!employee || !companyIsLive(employee.company)) {
      return {
        ok: false,
        message: "This consultation is only available during corporate onboarding",
        isMember: await holdsCorporateMembership(userId),
      };
    }
    const pinned = employee.company.preAssessmentDoctorId;
    if (pinned && input.doctorId !== pinned && (input.bookingIntent || input.doctorId)) {
      return {
        ok: false,
        message: "Pre-assessment consultations must be booked with your company's assigned doctor",
        // An employee row was found, so this requester is unambiguously a member.
        isMember: true,
      };
    }
    return { ok: true, employeeId: employee.id, pinnedDoctorId: pinned ?? null };
  }

  // CORPORATE_REQUEST_ONLY
  const request = await prisma.corporateServiceRequest.findFirst({
    where: {
      serviceId: input.serviceId,
      status: { in: ["REQUESTED", "EMPLOYEE_NOTIFIED"] },
      employee: {
        userId: input.userId,
        status: { notIn: ["REMOVED", "SUSPENDED"] },
        ...companyCountry,
      },
    },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });
  if (!request || !companyIsLive(request.company)) {
    return {
      ok: false,
      message: "This consultation requires an open request from your company",
      isMember: await holdsCorporateMembership(userId),
    };
  }
  return { ok: true, requestId: request.id, employeeId: request.employeeId };
}
