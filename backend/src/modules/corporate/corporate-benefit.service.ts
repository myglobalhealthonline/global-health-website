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

/** What a member's plan gives them, resolved for their company's country.
 *  Purely for display on /account/corporate — the authoritative discount is
 *  still `resolveCorporateDiscount` at pricing time. */
export type MemberBenefits = {
  discounts: { label: string; discountPercent: number }[];
  includedServices: {
    id: string;
    name: string;
    description: string | null;
    role: string;
    durationMinutes: number;
    doctorId: string;
  }[];
};

const SERVICE_KIND_LABEL: Record<string, string> = {
  GENERAL: "GP consultations",
  SPECIALIST: "Specialist consultations",
};

/**
 * Plan benefit rules (discounts on the public catalogue) + the plan's own
 * free corporate consultations. Discount labels still resolve against the
 * company country's Service rows, because that is what checkout discounts;
 * the consultations are plan-owned rows with no catalogue involvement.
 * Rules on kinds checkout does not discount are dropped rather than advertised
 * — see the GENERAL/SPECIALIST guard in `resolveCorporateDiscount`.
 */
export async function resolveMemberBenefits(input: {
  planId: string;
  countryCode: string;
  memberType: "EMPLOYEE" | "BENEFICIARY";
}): Promise<MemberBenefits> {
  const countryCode = input.countryCode.toLowerCase();
  const [rules, planServices] = await Promise.all([
    prisma.corporateBenefitRule.findMany({
      where: { corporatePlanId: input.planId, isActive: true },
      include: { service: { select: { slug: true, kind: true } } },
    }),
    prisma.corporatePlanService.findMany({
      where: {
        corporatePlanId: input.planId,
        isActive: true,
        OR: [{ countryCode: null }, { countryCode }],
      },
      select: {
        id: true,
        name: true,
        description: true,
        role: true,
        durationMinutes: true,
        doctorId: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const pinnedSlugs = Array.from(
    new Set(rules.flatMap((r) => (r.service ? [r.service.slug] : []))),
  );
  const localRows = pinnedSlugs.length
    ? await prisma.service.findMany({
        where: {
          slug: { in: pinnedSlugs },
          isActive: true,
          visibility: "PUBLIC",
          country: { code: countryCode },
        },
        select: { slug: true, name: true },
      })
    : [];
  const bySlug = new Map(localRows.map((s) => [s.slug, s]));

  const discounts = rules
    .filter((r) => r.discountPercent > 0)
    .filter((r) => input.memberType !== "BENEFICIARY" || r.appliesToBeneficiaries)
    .flatMap((r) => {
      const kind = r.service?.kind ?? r.serviceKind;
      if (kind !== "GENERAL" && kind !== "SPECIALIST") return [];
      const label = r.service
        ? (bySlug.get(r.service.slug)?.name ?? r.service.slug)
        : SERVICE_KIND_LABEL[kind];
      return [{ label, discountPercent: r.discountPercent }];
    });

  return { discounts, includedServices: planServices };
}

export type CorporateBookabilityResult =
  | { ok: true; requestId?: string; employeeId?: string }
  | {
      ok: false;
      message: string;
      /** True only when the requester actually belongs to some corporate company.
       *  Callers answer 403 + `message` for those people (they need to know WHY
       *  their own benefit was refused) and a bare 404 for everyone else, so a
       *  corporate consultation is not an existence oracle for any logged-in
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
 * Server-side gate for booking a CorporatePlanService from the member portal.
 * Corporate consultations are not Service rows and are never reachable from
 * the storefront, so this is the ONLY booking path they have.
 *
 * PRE_ASSESSMENT: requester must be a not-yet-active employee of a live
 * company; when the company pins a pre-assessment doctor, that pin wins over
 * the plan's assigned doctor.
 *
 * ILLNESS_BENEFIT / FIT_FOR_WORK: an open CorporateServiceRequest for this
 * consultation is consumed when one exists; the booking is not blocked when
 * none does (these consultations are free and unlimited for members).
 *
 * INCLUDED: any active member of the plan.
 */
export async function assertCorporateServiceBookable(input: {
  userId: string | null | undefined;
  corporateServiceId: string;
  isAdmin?: boolean;
}): Promise<CorporateBookabilityResult> {
  if (input.isAdmin) return { ok: true };
  if (!input.userId) {
    return { ok: false, message: "Sign in to book this consultation", isMember: false };
  }
  const userId = input.userId;

  const corporateService = await prisma.corporatePlanService.findFirst({
    where: { id: input.corporateServiceId, isActive: true },
    select: { id: true, corporatePlanId: true, countryCode: true, role: true },
  });
  if (!corporateService) {
    return { ok: false, message: "Consultation not found", isMember: false };
  }

  const notEligible = async (message: string) => ({
    ok: false as const,
    message,
    isMember: await holdsCorporateMembership(userId),
  });
  const companyScope = {
    planId: corporateService.corporatePlanId,
    ...(corporateService.countryCode ? { countryCode: corporateService.countryCode } : {}),
  };

  if (corporateService.role === "PRE_ASSESSMENT") {
    // Onboarding-only: the employee is mid-onboarding, so no ACTIVE membership
    // exists yet and `getActiveMembershipForUser` cannot answer for them.
    const employee = await prisma.corporateEmployee.findFirst({
      where: {
        userId,
        status: { in: ["PROFILE_COMPLETE", "PREASSESSMENT_PENDING", "PREASSESSMENT_BOOKED"] },
        company: companyScope,
      },
      include: { company: true },
    });
    if (!employee || !companyIsLive(employee.company)) {
      return notEligible("This consultation is only available during corporate onboarding");
    }
    return { ok: true, employeeId: employee.id };
  }

  // `getActiveMembershipForUser` already rejects non-live companies.
  const membership = await getActiveMembershipForUser(userId);
  if (!membership) {
    return notEligible("This consultation is only available to active corporate members");
  }
  if (membership.company.planId !== corporateService.corporatePlanId) {
    return notEligible("This consultation is not part of your company's plan");
  }
  if (
    corporateService.countryCode &&
    corporateService.countryCode !== membership.company.countryCode
  ) {
    return notEligible("This consultation is not offered in your company's country");
  }

  // Consume an open company request when there is one. Its absence is not a
  // refusal — these consultations carry no usage limit.
  const request = await prisma.corporateServiceRequest.findFirst({
    where: {
      corporateServiceId: corporateService.id,
      status: { in: ["REQUESTED", "EMPLOYEE_NOTIFIED"] },
      employee: { userId, status: { notIn: ["REMOVED", "SUSPENDED"] } },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, employeeId: true },
  });
  return {
    ok: true,
    ...(request ? { requestId: request.id, employeeId: request.employeeId } : {}),
  };
}
