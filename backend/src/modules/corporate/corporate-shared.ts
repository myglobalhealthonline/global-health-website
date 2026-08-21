import { randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  CorporateBeneficiary,
  CorporateBeneficiaryStatus,
  CorporateCompany,
  CorporateEmployee,
  CorporateEmployeeStatus,
  CorporatePlan,
} from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { errorResponse } from "../../utils/response.js";

/** Employee statuses that count toward the annual bill (everyone the
 *  company has committed to, i.e. not draft rows and not removed). */
export const BILLABLE_EMPLOYEE_STATUSES: CorporateEmployeeStatus[] = [
  "INVITED",
  "INVITE_SENT",
  "INVITE_FAILED",
  "REGISTERED",
  "PROFILE_INCOMPLETE",
  "PROFILE_COMPLETE",
  "PREASSESSMENT_PENDING",
  "PREASSESSMENT_BOOKED",
  "ACTIVE",
  "SUSPENDED",
];

export type CompanyWithPlan = CorporateCompany & { plan: CorporatePlan };

declare module "fastify" {
  interface FastifyRequest {
    /** Set by `requireCorporateAdmin` — the company this login administers. */
    corporateCompany?: CompanyWithPlan;
  }
}

/**
 * Fastify preHandler for /api/corporate/* (corporate portal). Requires
 * `requireAuth` to have run first. Loads the company whose adminUserId
 * is the authed user and stashes it on the request. 403s for every
 * other role — all scoping below this point is by company id.
 */
export async function requireCorporateAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = request.authUser;
  if (!auth || auth.role !== "CORPORATE_ADMIN") {
    void reply.status(403).send(errorResponse("Corporate admin role required"));
    return;
  }
  const company = await prisma.corporateCompany.findUnique({
    where: { adminUserId: auth.sub },
    include: { plan: true },
  });
  if (!company) {
    void reply.status(403).send(errorResponse("No corporate company linked to this account"));
    return;
  }
  request.corporateCompany = company;
}

/** True when the company itself can currently confer benefits. Both ends of
 *  the contract window count — a contract dated to start next quarter must
 *  not hand out discounts today. */
export function companyIsLive(company: {
  status: string;
  contractStartAt?: Date | null;
  contractEndAt: Date | null;
}): boolean {
  const now = Date.now();
  return (
    company.status === "ACTIVE" &&
    (!company.contractStartAt || company.contractStartAt.getTime() <= now) &&
    (!company.contractEndAt || company.contractEndAt.getTime() > now)
  );
}

export type ActiveMembership = {
  memberType: "EMPLOYEE" | "BENEFICIARY";
  employeeId?: string;
  beneficiaryId?: string;
  company: CompanyWithPlan;
};

/**
 * Resolve the ACTIVE corporate membership for a platform user, if any.
 * Used by the discount engine at pricing time — checks member status,
 * company status, and contract window (§2.4 of the plan doc). Employee
 * membership wins when a user is somehow both.
 */
export async function getActiveMembershipForUser(
  userId: string,
): Promise<ActiveMembership | null> {
  const [employee, beneficiary] = await Promise.all([
    prisma.corporateEmployee.findFirst({
      where: { userId, status: "ACTIVE" },
      include: { company: { include: { plan: true } } },
    }),
    prisma.corporateBeneficiary.findFirst({
      // A beneficiary's benefit is derived from their employee's — a
      // beneficiary row left/put ACTIVE under a SUSPENDED or REMOVED employee
      // kept its 10% and its card, which is exactly what suspending the
      // employee was meant to stop.
      where: { userId, status: "ACTIVE", employee: { status: "ACTIVE" } },
      include: { company: { include: { plan: true } } },
    }),
  ]);
  if (employee && companyIsLive(employee.company)) {
    return { memberType: "EMPLOYEE", employeeId: employee.id, company: employee.company };
  }
  if (beneficiary && companyIsLive(beneficiary.company)) {
    return {
      memberType: "BENEFICIARY",
      beneficiaryId: beneficiary.id,
      company: beneficiary.company,
    };
  }
  return null;
}

/**
 * Same resolution as `getActiveMembershipForUser`, keyed on the printed benefit
 * card number instead of a platform login. This is what the booking form's
 * coverage picker needs: the patient declares "I am covered by company X, card
 * 1234" before any account link exists, and the card is the only handle they
 * have. Every other gate is unchanged — card status + validity window, member
 * status (a beneficiary still derives from a live employee), company status and
 * contract window — so a card cannot buy a benefit the login could not.
 *
 * `linkedUserId` is the account the card resolves to, when it resolves to one,
 * and `linkedEmail` the address on the member's row. The caller uses them to
 * decide whether the declaration still needs a human to verify it, and
 * `linkedUserId` also counts annual-limit usage.
 */
export async function getActiveMembershipByCardNumber(
  cardNumber: string,
): Promise<
  (ActiveMembership & { linkedUserId: string | null; linkedEmail: string | null }) | null
> {
  const trimmed = cardNumber.trim();
  if (!trimmed) return null;
  const card = await prisma.corporateBenefitCard.findFirst({
    where: {
      cardNumber: { equals: trimmed, mode: "insensitive" },
      status: "ACTIVE",
      validUntil: { gt: new Date() },
    },
    select: {
      memberType: true,
      employee: {
        select: {
          id: true,
          userId: true,
          email: true,
          status: true,
          company: { include: { plan: true } },
        },
      },
      beneficiary: {
        select: {
          id: true,
          userId: true,
          email: true,
          status: true,
          employee: { select: { status: true } },
          company: { include: { plan: true } },
        },
      },
    },
  });
  if (!card) return null;

  const employee = card.employee;
  if (employee && employee.status === "ACTIVE" && companyIsLive(employee.company)) {
    return {
      memberType: "EMPLOYEE",
      employeeId: employee.id,
      company: employee.company,
      linkedUserId: employee.userId,
      linkedEmail: employee.email,
    };
  }
  const beneficiary = card.beneficiary;
  if (
    beneficiary &&
    beneficiary.status === "ACTIVE" &&
    beneficiary.employee?.status === "ACTIVE" &&
    companyIsLive(beneficiary.company)
  ) {
    return {
      memberType: "BENEFICIARY",
      beneficiaryId: beneficiary.id,
      company: beneficiary.company,
      linkedUserId: beneficiary.userId,
      linkedEmail: beneficiary.email,
    };
  }
  return null;
}

/**
 * Any (not necessarily ACTIVE) employee membership for a user — the
 * onboarding surfaces need pre-active rows too. Returns the most
 * recently created when several exist (shouldn't happen in practice).
 */
export async function getEmployeeMembershipForUser(userId: string): Promise<
  | (CorporateEmployee & {
      company: CompanyWithPlan;
      beneficiaries: CorporateBeneficiary[];
    })
  | null
> {
  return prisma.corporateEmployee.findFirst({
    where: { userId, status: { notIn: ["REMOVED"] } },
    include: {
      company: { include: { plan: true } },
      beneficiaries: { where: { status: { notIn: ["REMOVED"] } }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBeneficiaryMembershipForUser(userId: string): Promise<
  (CorporateBeneficiary & { company: CompanyWithPlan }) | null
> {
  return prisma.corporateBeneficiary.findFirst({
    where: { userId, status: { notIn: ["REMOVED"] } },
    include: { company: { include: { plan: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Locale segment for a member-facing booking deep link (`/{country}/{lang}/…`).
 * The member's own account preference wins; otherwise the company country's
 * admin-configured default. Hardcoding "en" sent Czech and Portuguese
 * employees an English booking page.
 */
export async function memberBookingLocale(
  userId: string | null | undefined,
  countryCode: string,
): Promise<string> {
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferredLocale: true },
    });
    if (user?.preferredLocale) return user.preferredLocale.toLowerCase();
  }
  const country = await prisma.country.findUnique({
    where: { code: countryCode.toLowerCase() },
    select: { defaultLocale: true },
  });
  return (country?.defaultLocale ?? "EN").toLowerCase();
}

// ─── Status machine ─────────────────────────────────────────────────────────

const EMPLOYEE_TRANSITIONS: Record<CorporateEmployeeStatus, CorporateEmployeeStatus[]> = {
  DRAFT: ["INVITED", "REMOVED"],
  INVITED: ["INVITE_SENT", "INVITE_FAILED", "REGISTERED", "REMOVED"],
  INVITE_SENT: ["INVITE_FAILED", "REGISTERED", "REMOVED", "INVITE_SENT"],
  INVITE_FAILED: ["INVITE_SENT", "REGISTERED", "REMOVED"],
  REGISTERED: ["PROFILE_INCOMPLETE", "PROFILE_COMPLETE", "PREASSESSMENT_PENDING", "REMOVED", "SUSPENDED"],
  PROFILE_INCOMPLETE: ["PROFILE_COMPLETE", "PREASSESSMENT_PENDING", "REMOVED", "SUSPENDED"],
  PROFILE_COMPLETE: ["PREASSESSMENT_PENDING", "REMOVED", "SUSPENDED"],
  PREASSESSMENT_PENDING: ["PREASSESSMENT_BOOKED", "ACTIVE", "REMOVED", "SUSPENDED"],
  PREASSESSMENT_BOOKED: ["ACTIVE", "PREASSESSMENT_PENDING", "REMOVED", "SUSPENDED"],
  ACTIVE: ["SUSPENDED", "REMOVED"],
  SUSPENDED: ["ACTIVE", "REMOVED"],
  REMOVED: [],
};

const BENEFICIARY_TRANSITIONS: Record<CorporateBeneficiaryStatus, CorporateBeneficiaryStatus[]> = {
  INVITED: ["INVITE_SENT", "INVITE_FAILED", "REGISTERED", "REMOVED"],
  INVITE_SENT: ["INVITE_FAILED", "REGISTERED", "REMOVED", "INVITE_SENT"],
  INVITE_FAILED: ["INVITE_SENT", "REGISTERED", "REMOVED"],
  REGISTERED: ["PROFILE_INCOMPLETE", "ACTIVE", "REMOVED", "SUSPENDED"],
  PROFILE_INCOMPLETE: ["ACTIVE", "REMOVED", "SUSPENDED"],
  ACTIVE: ["SUSPENDED", "REMOVED"],
  SUSPENDED: ["ACTIVE", "REMOVED"],
  REMOVED: [],
};

export function canTransitionEmployee(
  from: CorporateEmployeeStatus,
  to: CorporateEmployeeStatus,
): boolean {
  return EMPLOYEE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionBeneficiary(
  from: CorporateBeneficiaryStatus,
  to: CorporateBeneficiaryStatus,
): boolean {
  return BENEFICIARY_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Benefit cards ──────────────────────────────────────────────────────────

/** Crockford-ish base32 (no 0/O/1/I) — readable + phone-dictation safe. */
const CARD_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

export function generateCardNumber(): string {
  const bytes = randomBytes(10);
  let out = "GHC-";
  for (let i = 0; i < 10; i += 1) {
    out += CARD_ALPHABET[(bytes[i] as number) % CARD_ALPHABET.length];
  }
  return out;
}

/**
 * Issue (or re-activate) the benefit card for a member. Idempotent —
 * an existing card is re-activated + revalidated instead of duplicated.
 * validUntil = company.contractEndAt when set, else +1 year.
 */
export async function issueBenefitCard(opts: {
  memberType: "EMPLOYEE" | "BENEFICIARY";
  employeeId?: string;
  beneficiaryId?: string;
  company: { contractEndAt: Date | null };
}): Promise<void> {
  const validUntil =
    opts.company.contractEndAt ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const whereMember =
    opts.memberType === "EMPLOYEE"
      ? { employeeId: opts.employeeId as string }
      : { beneficiaryId: opts.beneficiaryId as string };
  const existing = await prisma.corporateBenefitCard.findUnique({ where: whereMember });
  if (existing) {
    await prisma.corporateBenefitCard.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", validUntil },
    });
    return;
  }
  // Retry once on the (astronomically unlikely) cardNumber collision — and
  // ONLY on that. Swallowing every error here would silently retry a genuine
  // failure (bad FK, dead connection) and then report success.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await prisma.corporateBenefitCard.create({
        data: {
          cardNumber: generateCardNumber(),
          memberType: opts.memberType,
          employeeId: opts.memberType === "EMPLOYEE" ? opts.employeeId : undefined,
          beneficiaryId: opts.memberType === "BENEFICIARY" ? opts.beneficiaryId : undefined,
          validUntil,
        },
      });
      return;
    } catch (error) {
      const isUniqueCollision = (error as { code?: string })?.code === "P2002";
      if (attempt === 1 || !isUniqueCollision) throw error;
    }
  }
}

/** Suspend/expire the member's card to mirror a membership change. */
export async function syncCardStatus(opts: {
  employeeId?: string;
  beneficiaryId?: string;
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
}): Promise<void> {
  const where = opts.employeeId
    ? { employeeId: opts.employeeId }
    : { beneficiaryId: opts.beneficiaryId as string };
  await prisma.corporateBenefitCard.updateMany({ where, data: { status: opts.status } });
}

// ─── Billing ────────────────────────────────────────────────────────────────

export async function computeBillingSummary(company: CompanyWithPlan): Promise<{
  employeeCount: number;
  pricePerEmployeeCents: number;
  totalAnnualCents: number;
  /** Currency of the CONTRACT (the plan row) — what the totals above are in. */
  currencyCode: string;
  /** Currency any fiscal document for this company is actually minted in —
   *  the company's country, same source `generateCorporateSubscriptionInvoice`
   *  uses. Differs from `currencyCode` whenever a plan is sold outside its own
   *  currency zone (an EUR plan on a BR company), and a form that labels the
   *  contract total with the document's currency under-bills by the FX gap. */
  documentCurrencyCode: string;
}> {
  const [employeeCount, country] = await Promise.all([
    prisma.corporateEmployee.count({
      where: { companyId: company.id, status: { in: BILLABLE_EMPLOYEE_STATUSES } },
    }),
    prisma.country.findUnique({
      where: { code: company.countryCode.toLowerCase() },
      select: { currency: { select: { code: true } } },
    }),
  ]);
  return {
    employeeCount,
    pricePerEmployeeCents: company.plan.annualPricePerEmployeeCents,
    totalAnnualCents: employeeCount * company.plan.annualPricePerEmployeeCents,
    currencyCode: company.plan.currencyCode,
    documentCurrencyCode: country?.currency.code ?? company.plan.currencyCode,
  };
}

/** Profile-completeness rule shared by accept + recompute paths. */
export function isEmployeeProfileComplete(employee: {
  dateOfBirth: Date | null;
  phone: string | null;
  addressLine1: string | null;
}): boolean {
  return Boolean(employee.dateOfBirth && employee.phone && employee.addressLine1);
}

export function isBeneficiaryProfileComplete(beneficiary: {
  dateOfBirth: Date | null;
  phone: string | null;
}): boolean {
  return Boolean(beneficiary.dateOfBirth && beneficiary.phone);
}
