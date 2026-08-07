import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { linkMembershipsForEmail } from "./membership-linking.service.js";
import { sendMembershipInviteEmail } from "./membership-emails.js";
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
  plan: { select: { id: true, name: true, slug: true, countryId: true } },
  level: { select: { id: true, name: true, slug: true, familyEnabled: true, maxDependents: true } },
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
      select: { id: true, planId: true, countryId: true, familyEnabled: true, maxDependents: true },
    });
    if (!level) throw new MembershipPlanLevelMismatchError();
    if (level.planId !== planId) throw new MembershipPlanLevelMismatchError();
    return level;
  }
  const fallback = await tx.membershipLevel.findFirst({
    where: { planId, isDefault: true },
    select: { id: true, planId: true, countryId: true, familyEnabled: true, maxDependents: true },
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
    levelId: string;
    countryId: string;
    membershipId: string;
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
  const membershipId = input.membershipId.trim();

  const live = await findLiveEnrollmentByEmail(tx, input.planId, email);
  if (live) {
    throw new MembershipEnrollmentConflictError(
      "That email is already enrolled in this plan",
    );
  }
  const removed = await findRemovedEnrollmentByEmail(tx, input.planId, email);
  await assertMembershipIdFree(tx, membershipId, removed?.id);

  const data = {
    planId: input.planId,
    levelId: input.levelId,
    countryId: input.countryId,
    membershipId,
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
    await tx.membershipEnrollment.update({
      where: { id: removed.id },
      data: { ...data, status: "PENDING", userId: null, linkedAt: null, claimedAt: null },
    });
    return { id: removed.id, outcome: "REVIVE" };
  }

  const created = await tx.membershipEnrollment.create({
    data: { ...data, status: "PENDING" },
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

export async function getMembershipEnrollmentById(id: string) {
  const row = await prisma.membershipEnrollment.findUnique({
    where: { id },
    include: enrollmentInclude,
  });
  if (!row) throw new MembershipEnrollmentNotFoundError();
  return row;
}

export async function createMembershipEnrollment(
  body: AdminMembershipEnrollmentCreateBody,
  actorAdminId: string | null,
) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: body.planId },
    select: { id: true, countryId: true },
  });
  if (!plan) throw new MembershipEnrollmentConflictError("Membership plan not found");
  const level = await resolveLevel(prisma, plan.id, body.levelId ?? null);

  let id: string;
  try {
    const result = await upsertEnrollmentRow(prisma, {
      planId: plan.id,
      levelId: level.id,
      countryId: plan.countryId,
      membershipId: body.membershipId,
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
  await linkMembershipsForEmail(body.email);
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

  const data: Prisma.MembershipEnrollmentUpdateInput = {};
  if (body.membershipId !== undefined) {
    await assertMembershipIdFree(prisma, body.membershipId, id);
    data.membershipId = body.membershipId.trim();
  }
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
    levelId: primary.levelId,
    countryId: primary.countryId,
    membershipId,
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

  await linkMembershipsForEmail(body.email);
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
      plan: { select: { name: true, countryId: true } },
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
    countryId: enrollment.plan.countryId,
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

  return addMembershipDependent(
    primaryId,
    {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      relationship: body.relationship,
    } as AdminMembershipDependentCreateBody,
    null,
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
