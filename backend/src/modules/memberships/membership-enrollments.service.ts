import {
  Prisma,
  type LocaleCode,
  type MembershipAllowancePool,
  type MembershipMemberType,
  type PrismaClient,
} from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { linkMembershipsForEmail } from "./membership-linking.service.js";
import { issueMembershipCard } from "./membership-card-issue.js";
import { sendMembershipInviteEmail } from "./membership-emails.js";
import { holderEnrollmentId } from "./membership-card.service.js";
import { generateMembershipId } from "./membership-id.service.js";
import type {
  AdminMembershipDependentCreateBody,
  AdminMembershipEnrollmentCreateBody,
  AdminMembershipEnrollmentUpdateBody,
  AdminMembershipEnrollmentsQuery,
} from "../../validations/admin-membership-enrollments.schema.js";

/**
 * Enrollment lifecycle for private membership plans
 * (docs/plans/private-membership-plans-implementation.md §5, phase 2).
 *
 * Uniqueness lives in raw-SQL indexes, not Prisma `@unique` (§3.4/§3.8):
 * `lower("membershipId")` globally, and `(planId, lower(email))` excluding
 * `REMOVED` rows. Every check here therefore compares case-insensitively, and
 * the index is still the last word — the pre-checks exist to return a usable
 * message, not to be the guarantee.
 */

export class MembershipEnrollmentNotFoundError extends Error {
  constructor() {
    super("Membership enrollment not found");
    this.name = "MembershipEnrollmentNotFoundError";
  }
}

export class MembershipEnrollmentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MembershipEnrollmentConflictError";
  }
}

export class MembershipDependentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MembershipDependentError";
  }
}

export class MembershipPlanLevelMismatchError extends Error {
  constructor() {
    super("That level belongs to a different plan");
    this.name = "MembershipPlanLevelMismatchError";
  }
}

type Tx = Prisma.TransactionClient | PrismaClient;

export const enrollmentInclude = {
  plan: { select: { id: true, name: true, slug: true, primaryCountryId: true } },
  level: {
    select: {
      id: true,
      name: true,
      slug: true,
      familyEnabled: true,
      maxDependents: true,
      allowancePool: true,
    },
  },
  user: { select: { id: true, email: true, fullName: true, emailVerifiedAt: true } },
  dependents: {
    select: {
      id: true,
      membershipId: true,
      firstName: true,
      lastName: true,
      email: true,
      relationship: true,
      status: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.MembershipEnrollmentInclude;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Global, case-insensitive (§3.4). `REMOVED` rows are NOT excluded: the unique
 * index has no status predicate, so a removed row still owns its id until a
 * revive of that same row overwrites it.
 */
async function assertMembershipIdFree(
  tx: Tx,
  membershipId: string,
  exceptEnrollmentId?: string,
): Promise<void> {
  const clash = await tx.membershipEnrollment.findFirst({
    where: {
      membershipId: { equals: membershipId.trim(), mode: "insensitive" },
      ...(exceptEnrollmentId ? { id: { not: exceptEnrollmentId } } : {}),
    },
    select: { id: true },
  });
  if (clash) {
    throw new MembershipEnrollmentConflictError(
      `Membership ID "${membershipId}" is already in use`,
    );
  }
}

/** One live enrollment per (plan, email). A `REMOVED` row does not block. */
async function findLiveEnrollmentByEmail(
  tx: Tx,
  planId: string,
  email: string,
  exceptEnrollmentId?: string,
) {
  return tx.membershipEnrollment.findFirst({
    where: {
      planId,
      email: { equals: normalizeEmail(email), mode: "insensitive" },
      status: { not: "REMOVED" },
      ...(exceptEnrollmentId ? { id: { not: exceptEnrollmentId } } : {}),
    },
    select: { id: true, status: true },
  });
}

/** The most recent removed row for this address, which a re-add revives. */
export async function findRemovedEnrollmentByEmail(tx: Tx, planId: string, email: string) {
  return tx.membershipEnrollment.findFirst({
    where: {
      planId,
      email: { equals: normalizeEmail(email), mode: "insensitive" },
      status: "REMOVED",
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
}

export async function resolveLevel(tx: Tx, planId: string, levelId?: string | null) {
  if (levelId) {
    const level = await tx.membershipLevel.findUnique({
      where: { id: levelId },
      select: { id: true, planId: true, familyEnabled: true, maxDependents: true },
    });
    if (!level) throw new MembershipPlanLevelMismatchError();
    if (level.planId !== planId) throw new MembershipPlanLevelMismatchError();
    return level;
  }
  const fallback = await tx.membershipLevel.findFirst({
    where: { planId, isDefault: true },
    select: { id: true, planId: true, familyEnabled: true, maxDependents: true },
  });
  if (!fallback) throw new MembershipPlanLevelMismatchError();
  return fallback;
}

/**
 * Create, or revive the plan's most recent `REMOVED` row for this address.
 *
 * A revive is a full update, not a status flip: the incoming membership id,
 * names, level and term overwrite the old row's (§8.2). A returning member
 * usually comes back with a *new* partner id, and the old one must stop being
 * theirs.
 *
 * Shared by the manual add, the dependent add and the CSV import so all three
 * behave identically — and so the import's `CREATE` / `REVIVE` preview outcomes
 * describe what actually happens at commit.
 */
export async function upsertEnrollmentRow(
  tx: Tx,
  input: {
    planId: string;
    /** The plan's slug — the prefix for a generated id (§21.5). */
    planSlug: string;
    levelId: string;
    countryId: string;
    /**
     * Phase 7c: normally omitted, and generated here. Supplied only where the
     * caller has a specific id to use — the dependent add, whose `-D1` scheme
     * derives from the primary's (decision 43).
     */
    membershipId?: string;
    /** The partner's own member number. Searchable, NOT a key (§21.5). */
    partnerReference?: string | null;
    /** Locale for the welcome email while PENDING (§25). */
    preferredLocale?: LocaleCode | null;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    dateOfBirth?: Date | null;
    startDate: Date;
    endDate?: Date | null;
    memberType?: "PRIMARY" | "DEPENDENT";
    primaryEnrollmentId?: string | null;
    relationship?: string | null;
    adminNotes?: string | null;
    importBatchId?: string | null;
    createdByAdminId?: string | null;
  },
): Promise<{ id: string; outcome: "CREATE" | "REVIVE" }> {
  const email = normalizeEmail(input.email);

  const live = await findLiveEnrollmentByEmail(tx, input.planId, email);
  if (live) {
    throw new MembershipEnrollmentConflictError(
      "That email is already enrolled in this plan",
    );
  }
  const removed = await findRemovedEnrollmentByEmail(tx, input.planId, email);

  const data = {
    planId: input.planId,
    levelId: input.levelId,
    countryId: input.countryId,
    partnerReference: input.partnerReference ?? null,
    preferredLocale: input.preferredLocale ?? null,
    email,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    phone: input.phone ?? null,
    dateOfBirth: input.dateOfBirth ?? null,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    memberType: input.memberType ?? "PRIMARY",
    primaryEnrollmentId: input.primaryEnrollmentId ?? null,
    relationship: input.relationship ?? null,
    adminNotes: input.adminNotes ?? null,
    importBatchId: input.importBatchId ?? null,
    createdByAdminId: input.createdByAdminId ?? null,
  };

  if (removed) {
    // Reset the link too: the address may now belong to a different person.
    // The linker re-attaches it on the next verified login.
    //
    // `membershipId` and `cardIssuedAt` are deliberately NOT in `data`, so a
    // revive keeps both. Before phase 7c the CSV's id overwrote the old one,
    // because a returning member came back with a new PARTNER number — that
    // requirement now lives on `partnerReference`, which does get overwritten
    // above. The generated id is this row's identity, and reissuing it would
    // invalidate a card the same person may still be holding. Keeping
    // `cardIssuedAt` likewise means a revive does not re-email someone who has
    // already had their card (decision 41's dedupe).
    await tx.membershipEnrollment.update({
      where: { id: removed.id },
      data: { ...data, status: "PENDING", userId: null, linkedAt: null, claimedAt: null },
    });
    return { id: removed.id, outcome: "REVIVE" };
  }

  // Generated only on a real create (§21.5). A caller-supplied id is still
  // honoured for the dependent `-D1` scheme, and is checked for collisions the
  // same way — the index is global and case-insensitive, and covers REMOVED
  // rows, so a removed member still owns theirs.
  let membershipId: string;
  if (input.membershipId) {
    membershipId = input.membershipId.trim();
    await assertMembershipIdFree(tx, membershipId);
  } else {
    membershipId = await generateMembershipId(tx, input.planSlug);
  }

  const created = await tx.membershipEnrollment.create({
    data: { ...data, membershipId, status: "PENDING" },
    select: { id: true },
  });
  return { id: created.id, outcome: "CREATE" };
}

export async function listMembershipEnrollments(query: AdminMembershipEnrollmentsQuery) {
  const where: Prisma.MembershipEnrollmentWhereInput = {
    ...(query.planId ? { planId: query.planId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { membershipId: { contains: query.q, mode: "insensitive" } },
            // The partner's own number, searchable alongside the generated id
            // (§26). Staff and the partner's own support desk quote different
            // numbers for the same person, so both have to find them.
            { partnerReference: { contains: query.q, mode: "insensitive" } },
            { email: { contains: query.q, mode: "insensitive" } },
            { firstName: { contains: query.q, mode: "insensitive" } },
            { lastName: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  try {
    const [items, total] = await Promise.all([
      prisma.membershipEnrollment.findMany({
        where,
        include: enrollmentInclude,
        orderBy: [{ createdAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.membershipEnrollment.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  } catch (error) {
    throw normalizeDbError(error, "Membership enrollments are unavailable");
  }
}

export type EnrollmentAllowanceView = {
  benefitId: string;
  /** What the rule covers, for the admin UI: a service name or a kind. */
  target: string;
  allocated: number;
  used: number;
  remaining: number;
};

/**
 * The member's allowance counters, for the detail page's adjust control (§7).
 *
 * Deliberately NOT part of `enrollmentInclude`: that shape is shared with the
 * member LIST, which renders hundreds of rows and has no use for per-benefit
 * counters.
 *
 * A counter that does not exist yet is reported at its full allocation rather
 * than omitted — the row is created lazily on first spend (§3.5), so "no row"
 * means "nothing spent", and an admin looking at a brand-new member must see
 * the units they have rather than an empty panel.
 */
async function loadEnrollmentAllowances(row: {
  id: string;
  levelId: string;
  startDate: Date;
  memberType: MembershipMemberType;
  primaryEnrollmentId: string | null;
  level: { allowancePool: MembershipAllowancePool };
}): Promise<EnrollmentAllowanceView[]> {
  const benefits = await prisma.membershipBenefit.findMany({
    where: { levelId: row.levelId, benefitType: "ALLOWANCE", isActive: true },
    select: {
      id: true,
      allowanceCount: true,
      serviceKind: true,
      service: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (benefits.length === 0) return [];

  // The pool a spend by THIS enrollment lands on: its own under PER_PERSON, the
  // primary's under SHARED. Same key the resolver and the spend both use, so
  // what the admin adjusts is what the member actually draws from.
  const holderId = holderEnrollmentId({
    id: row.id,
    memberType: row.memberType,
    primaryEnrollmentId: row.primaryEnrollmentId,
    level: row.level,
  });
  const balances = await prisma.membershipAllowanceBalance.findMany({
    where: {
      benefitId: { in: benefits.map((benefit) => benefit.id) },
      holderEnrollmentId: holderId,
      termStart: row.startDate,
    },
    select: { benefitId: true, allocated: true, used: true },
  });
  const balanceByBenefit = new Map(balances.map((balance) => [balance.benefitId, balance]));

  return benefits.map((benefit) => {
    const balance = balanceByBenefit.get(benefit.id);
    const allocated = balance?.allocated ?? benefit.allowanceCount ?? 0;
    const used = balance?.used ?? 0;
    return {
      benefitId: benefit.id,
      target: benefit.service?.name ?? benefit.serviceKind ?? "—",
      allocated,
      used,
      remaining: Math.max(0, allocated - used),
    };
  });
}

export async function getMembershipEnrollmentById(id: string) {
  const row = await prisma.membershipEnrollment.findUnique({
    where: { id },
    include: enrollmentInclude,
  });
  if (!row) throw new MembershipEnrollmentNotFoundError();
  return { ...row, allowances: await loadEnrollmentAllowances(row) };
}

export async function createMembershipEnrollment(
  body: AdminMembershipEnrollmentCreateBody,
  actorAdminId: string | null,
) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: body.planId },
    select: { id: true, slug: true, primaryCountryId: true },
  });
  if (!plan) throw new MembershipEnrollmentConflictError("Membership plan not found");
  const level = await resolveLevel(prisma, plan.id, body.levelId ?? null);

  let id: string;
  try {
    const result = await upsertEnrollmentRow(prisma, {
      planId: plan.id,
      planSlug: plan.slug,
      levelId: level.id,
      countryId: plan.primaryCountryId,
      // No membershipId: generated (§21.5). The partner's own number, if they
      // have one, rides along as a searchable reference instead.
      partnerReference: body.partnerReference ?? null,
      preferredLocale: body.preferredLocale ?? null,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone ?? null,
      dateOfBirth: body.dateOfBirth ?? null,
      startDate: body.startDate,
      endDate: body.endDate ?? null,
      adminNotes: body.adminNotes ?? null,
      createdByAdminId: actorAdminId,
    });
    id = result.id;
  } catch (error) {
    if (error instanceof MembershipEnrollmentConflictError) throw error;
    throw normalizeDbError(error, "Membership enrollments are unavailable");
  }

  // A row for an address that already belongs to a VERIFIED account activates
  // immediately; an unverified one stays PENDING until it verifies (§8.2).
  // Suppressed: this row's welcome+card goes out on the next line, and it says
  // everything the §12.1 confirmation would (§25).
  await linkMembershipsForEmail(body.email, { suppressConfirmationFor: new Set([id]) });
  // Card + welcome email (§25). AFTER the link, so a row that just attached to
  // an account is written to in that account's language rather than the one the
  // admin form supplied.
  await issueMembershipCard({ enrollmentId: id, actorAdminId }).catch(() => undefined);
  return getMembershipEnrollmentById(id);
}

export async function updateMembershipEnrollment(
  id: string,
  body: AdminMembershipEnrollmentUpdateBody,
) {
  const existing = await prisma.membershipEnrollment.findUnique({
    where: { id },
    select: {
      id: true,
      planId: true,
      memberType: true,
      email: true,
      startDate: true,
      endDate: true,
    },
  });
  if (!existing) throw new MembershipEnrollmentNotFoundError();

  // A dependent inherits level and term from its primary (§3.4); accepting
  // them here would let the two drift apart silently.
  if (existing.memberType === "DEPENDENT") {
    if (body.levelId || body.startDate || body.endDate !== undefined) {
      throw new MembershipDependentError(
        "A dependent inherits its level and term from the primary member",
      );
    }
  }

  // `membershipId` is deliberately absent, and the update schema no longer
  // accepts it (§21.5). It is generated, printed on the member's card and half
  // of what the claim form checks — editing it invalidates a card already in
  // someone's wallet. Partner-side corrections go to `partnerReference`, which
  // is what an admin actually wants to fix.
  const data: Prisma.MembershipEnrollmentUpdateInput = {};
  if (body.partnerReference !== undefined) data.partnerReference = body.partnerReference;
  if (body.preferredLocale !== undefined) data.preferredLocale = body.preferredLocale;
  if (body.email !== undefined) {
    const email = normalizeEmail(body.email);
    const clash = await findLiveEnrollmentByEmail(prisma, existing.planId, email, id);
    if (clash) {
      throw new MembershipEnrollmentConflictError("That email is already enrolled in this plan");
    }
    if (email !== existing.email) {
      // The address is the linking key, so changing it invalidates the proof of
      // ownership the old link rested on: unlink and let the new address earn it.
      data.email = email;
      data.user = { disconnect: true };
      data.linkedAt = null;
      data.claimedAt = null;
      data.status = "PENDING";
    }
  }
  if (body.firstName !== undefined) data.firstName = body.firstName.trim();
  if (body.lastName !== undefined) data.lastName = body.lastName.trim();
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.dateOfBirth !== undefined) data.dateOfBirth = body.dateOfBirth ?? null;
  if (body.adminNotes !== undefined) data.adminNotes = body.adminNotes;
  if (body.levelId !== undefined) {
    const level = await resolveLevel(prisma, existing.planId, body.levelId);
    data.level = { connect: { id: level.id } };
  }

  const startDate = body.startDate ?? existing.startDate;
  const endDate = body.endDate !== undefined ? (body.endDate ?? null) : existing.endDate;
  if (endDate && endDate < startDate) {
    throw new MembershipEnrollmentConflictError("endDate must not precede startDate");
  }
  if (body.startDate !== undefined) data.startDate = startDate;
  if (body.endDate !== undefined) data.endDate = endDate;

  try {
    await prisma.membershipEnrollment.update({ where: { id }, data });
    // Dependents follow the primary's term (§5.4).
    if (existing.memberType === "PRIMARY" && (body.startDate !== undefined || body.endDate !== undefined)) {
      await prisma.membershipEnrollment.updateMany({
        where: { primaryEnrollmentId: id },
        data: { startDate, endDate },
      });
    }
  } catch (error) {
    throw normalizeDbError(error, "Membership enrollments are unavailable");
  }

  if (data.email) await linkMembershipsForEmail(String(data.email));
  return getMembershipEnrollmentById(id);
}

/** Suspension is reversible and keeps the row; dependents follow the primary. */
export async function suspendMembershipEnrollment(id: string, reason: string | null) {
  const existing = await prisma.membershipEnrollment.findUnique({
    where: { id },
    select: { id: true, status: true, memberType: true, adminNotes: true },
  });
  if (!existing) throw new MembershipEnrollmentNotFoundError();
  if (existing.status === "REMOVED") {
    throw new MembershipEnrollmentConflictError("A removed enrollment cannot be suspended");
  }
  const notes = reason
    ? [existing.adminNotes, `Suspended: ${reason}`].filter(Boolean).join("\n")
    : existing.adminNotes;

  await prisma.membershipEnrollment.update({
    where: { id },
    data: { status: "SUSPENDED", adminNotes: notes },
  });
  if (existing.memberType === "PRIMARY") {
    await prisma.membershipEnrollment.updateMany({
      where: { primaryEnrollmentId: id, status: { not: "REMOVED" } },
      data: { status: "SUSPENDED" },
    });
  }
  return getMembershipEnrollmentById(id);
}

/**
 * Reactivation recomputes the status from the term rather than assuming
 * `ACTIVE`: an unlinked row goes back to `PENDING`, and a lapsed one to
 * `EXPIRED`, so a suspension cannot be used to resurrect a dead term.
 */
export function statusAfterReactivate(row: {
  userId: string | null;
  endDate: Date | null;
}, now = new Date()): "PENDING" | "ACTIVE" | "EXPIRED" {
  if (!row.userId) return "PENDING";
  if (row.endDate && row.endDate < now) return "EXPIRED";
  return "ACTIVE";
}

export async function reactivateMembershipEnrollment(id: string) {
  const existing = await prisma.membershipEnrollment.findUnique({
    where: { id },
    select: { id: true, status: true, userId: true, endDate: true, memberType: true },
  });
  if (!existing) throw new MembershipEnrollmentNotFoundError();
  if (existing.status !== "SUSPENDED") {
    throw new MembershipEnrollmentConflictError("Only a suspended enrollment can be reactivated");
  }
  const status = statusAfterReactivate(existing);
  await prisma.membershipEnrollment.update({ where: { id }, data: { status } });

  if (existing.memberType === "PRIMARY") {
    const dependents = await prisma.membershipEnrollment.findMany({
      where: { primaryEnrollmentId: id, status: "SUSPENDED" },
      select: { id: true, userId: true, endDate: true },
    });
    for (const dependent of dependents) {
      await prisma.membershipEnrollment.update({
        where: { id: dependent.id },
        data: { status: statusAfterReactivate(dependent) },
      });
    }
  }
  return getMembershipEnrollmentById(id);
}

/** Soft delete (§5.1). The row and its history survive; a re-add revives it. */
export async function removeMembershipEnrollment(id: string) {
  const existing = await prisma.membershipEnrollment.findUnique({
    where: { id },
    select: { id: true, memberType: true },
  });
  if (!existing) throw new MembershipEnrollmentNotFoundError();

  await prisma.membershipEnrollment.update({ where: { id }, data: { status: "REMOVED" } });
  if (existing.memberType === "PRIMARY") {
    await prisma.membershipEnrollment.updateMany({
      where: { primaryEnrollmentId: id },
      data: { status: "REMOVED" },
    });
  }
  return getMembershipEnrollmentById(id);
}

/**
 * Dependent membership ids are derived from the primary's (`-D1`, `-D2`, …)
 * and collision-checked, because they share the same global unique index.
 */
export async function generateDependentMembershipId(
  tx: Tx,
  primaryMembershipId: string,
): Promise<string> {
  for (let n = 1; n <= 50; n += 1) {
    const candidate = `${primaryMembershipId}-D${n}`;
    const clash = await tx.membershipEnrollment.findFirst({
      where: { membershipId: { equals: candidate, mode: "insensitive" } },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  throw new MembershipDependentError("Could not allocate a dependent membership ID");
}

export async function addMembershipDependent(
  primaryId: string,
  body: AdminMembershipDependentCreateBody,
  actorAdminId: string | null,
  /**
   * Whether adding this dependent mails them their card (§25). True for the
   * admin path, false for the member-facing one — see `addMemberDependent`.
   * Explicit rather than inferred from `actorAdminId`, because the member path
   * also passes null and the two must not be told apart by accident.
   */
  issueCard = true,
) {
  const primary = await prisma.membershipEnrollment.findUnique({
    where: { id: primaryId },
    select: {
      id: true,
      planId: true,
      levelId: true,
      countryId: true,
      membershipId: true,
      startDate: true,
      endDate: true,
      memberType: true,
      status: true,
      plan: { select: { slug: true } },
      level: { select: { familyEnabled: true, maxDependents: true } },
    },
  });
  if (!primary) throw new MembershipEnrollmentNotFoundError();
  if (primary.memberType !== "PRIMARY") {
    throw new MembershipDependentError("Dependents attach to a primary member, not to a dependent");
  }
  if (!primary.level.familyEnabled || primary.level.maxDependents < 1) {
    throw new MembershipDependentError("This level does not include family cover");
  }

  const existing = await prisma.membershipEnrollment.count({
    where: { primaryEnrollmentId: primaryId, status: { not: "REMOVED" } },
  });
  if (existing >= primary.level.maxDependents) {
    throw new MembershipDependentError(
      `This level covers at most ${primary.level.maxDependents} dependent(s)`,
    );
  }

  const membershipId =
    body.membershipId ?? (await generateDependentMembershipId(prisma, primary.membershipId));

  const result = await upsertEnrollmentRow(prisma, {
    planId: primary.planId,
    planSlug: primary.plan.slug,
    levelId: primary.levelId,
    countryId: primary.countryId,
    // Decision 43 gives a dependent its OWN generated id, and `-D1` IS
    // generated: the unguessability comes from the primary's random suffix,
    // which the dependent inherits. A fully independent id would buy nothing
    // and would destroy the visible family link that support reads off two
    // cards side by side.
    membershipId,
    partnerReference: body.partnerReference ?? null,
    preferredLocale: body.preferredLocale ?? null,
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone ?? null,
    dateOfBirth: body.dateOfBirth ?? null,
    // Inherited, never supplied by the caller (§3.4).
    startDate: primary.startDate,
    endDate: primary.endDate,
    memberType: "DEPENDENT",
    primaryEnrollmentId: primary.id,
    relationship: body.relationship ?? null,
    adminNotes: body.adminNotes ?? null,
    createdByAdminId: actorAdminId,
  });

  // Suppressed only when this call is the one about to card them; the member
  // path leaves the confirmation alone, because its card waits for linking.
  await linkMembershipsForEmail(
    body.email,
    issueCard ? { suppressConfirmationFor: new Set([result.id]) } : {},
  );
  // Dependents get their own card and welcome email (decision 43) — but only
  // when an admin put them there. See `addMemberDependent` for why the member
  // path waits for the account to link instead (§25).
  if (issueCard) {
    await issueMembershipCard({ enrollmentId: result.id, actorAdminId }).catch(() => undefined);
  }
  return getMembershipEnrollmentById(result.id);
}

/**
 * Manual invite (§12.2). Logged either way — `MembershipInviteLog` is how an
 * admin can tell "we never told them" from "we told them and they ignored it".
 */
export async function sendMembershipEnrollmentInvite(id: string, actorAdminId: string | null) {
  const enrollment = await prisma.membershipEnrollment.findUnique({
    where: { id },
    include: {
      plan: { select: { name: true, primaryCountryId: true } },
      level: { select: { name: true } },
    },
  });
  if (!enrollment) throw new MembershipEnrollmentNotFoundError();
  if (enrollment.status === "REMOVED") {
    throw new MembershipEnrollmentConflictError("That enrollment has been removed");
  }

  const result = await sendMembershipInviteEmail({
    to: enrollment.email,
    firstName: enrollment.firstName,
    planName: enrollment.plan.name,
    levelName: enrollment.level.name,
    membershipId: enrollment.membershipId,
    enrollmentId: enrollment.id,
  }).catch((error: unknown) => ({
    ok: false as const,
    message: error instanceof Error ? error.message : "Send failed",
  }));

  const ok = result.ok !== false;
  await prisma.membershipInviteLog.create({
    data: {
      enrollmentId: id,
      email: enrollment.email,
      sentByAdminId: actorAdminId,
      sentAt: ok ? new Date() : null,
      error: ok ? null : ("message" in result ? String(result.message) : "Send failed"),
    },
  });
  return { ok, email: enrollment.email };
}

/* ─────────────────────────────────────────────────────────────
   Member-added dependents (§10, phase 3)
   ───────────────────────────────────────────────────────────── */

/**
 * A dependent the MEMBER created, as opposed to one an admin added or a CSV
 * import produced. There is no flag for it — the distinction is which of the
 * two provenance columns is set, and neither is for the member path:
 *
 *   import      → importBatchId set
 *   admin add   → createdByAdminId set
 *   member add  → both null
 *
 * That is what makes "remove ones they added" (§10) enforceable without
 * another column. If a fourth creation path ever appears, it must set one of
 * these or it silently becomes member-removable.
 */
const MEMBER_ADDED = { createdByAdminId: null, importBatchId: null } as const;

/**
 * Add a dependent to a membership the session user holds. Ownership,
 * `PRIMARY`-ness, family cover and the cap are all re-checked inside
 * `addMembershipDependent`; this wrapper only proves the primary is the
 * caller's before letting them near it.
 */
export async function addMemberDependent(
  userId: string,
  primaryId: string,
  body: { email: string; firstName: string; lastName: string; relationship: string | null },
) {
  const primary = await prisma.membershipEnrollment.findFirst({
    where: { id: primaryId, userId, status: { not: "REMOVED" } },
    select: { id: true },
  });
  // Not "yours" and "does not exist" answer identically — a member must not be
  // able to probe enrollment ids.
  if (!primary) throw new MembershipEnrollmentNotFoundError();

  // `issueCard: false` — this is the one enrollment path that has passed no
  // admin (§25). The address is member-typed, unverified and attacker-chosen,
  // and auto-mailing it would turn the portal into a way to send branded mail
  // with a card image attached to arbitrary addresses; `maxDependents` bounds the
  // volume but not the shape. Decision 43 still holds — the dependent gets
  // their own card, issued by the linker the moment they prove they own the
  // mailbox, which is the same gate §5.2 already applies before the membership
  // grants anything at all.
  return addMembershipDependent(
    primaryId,
    {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      relationship: body.relationship,
    } as AdminMembershipDependentCreateBody,
    null,
    false,
  );
}

/**
 * Remove a dependent the member added themselves. Admin- and import-created
 * dependents are deliberately out of reach: the member did not put them there,
 * and an admin removing them is an audited action with a reason.
 */
export async function removeMemberDependent(userId: string, dependentId: string) {
  const dependent = await prisma.membershipEnrollment.findFirst({
    where: {
      id: dependentId,
      memberType: "DEPENDENT",
      status: { not: "REMOVED" },
      ...MEMBER_ADDED,
      primaryEnrollment: { userId },
    },
    select: { id: true, primaryEnrollmentId: true, membershipId: true },
  });
  if (!dependent) throw new MembershipEnrollmentNotFoundError();

  await prisma.membershipEnrollment.update({
    where: { id: dependent.id },
    data: { status: "REMOVED" },
  });
  return dependent;
}
