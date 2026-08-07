import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { linkMembershipsForEmail } from "./membership-linking.service.js";
import {
  MembershipEnrollmentConflictError,
  normalizeEmail,
  upsertEnrollmentRow,
} from "./membership-enrollments.service.js";

/**
 * CSV import for private membership plans (§8), phase 2.
 *
 * Preview writes NOTHING to `MembershipEnrollment`: it parses, validates and
 * stores the outcome on the batch. Commit re-reads that server-side
 * `previewData` — never a client payload — so the rows applied are the rows an
 * admin approved, not whatever the browser sends back.
 */

export const MEMBERSHIP_IMPORT_ROW_CAP = 2000;
/** Older than this and commit re-validates: levels, emails and ids may have moved. */
const REVALIDATE_AFTER_MS = 24 * 60 * 60 * 1000;

export class MembershipImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MembershipImportError";
  }
}

export class MembershipImportNotFoundError extends Error {
  constructor() {
    super("Import batch not found");
    this.name = "MembershipImportNotFoundError";
  }
}

export type ImportOutcome = "CREATE" | "REVIVE" | "LINK" | "REJECT";

export type PreviewRow = {
  line: number;
  outcome: ImportOutcome;
  reason?: string;
  membershipId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: string | null;
  startDate: string;
  endDate: string | null;
  levelId: string | null;
  levelSlug: string | null;
  primaryMembershipId: string | null;
  relationship: string | null;
  adminNotes: string | null;
  /** Set on REVIVE so the commit report can say which row is being reused. */
  existingEnrollmentId?: string;
};

export type PreviewData = {
  rows: PreviewRow[];
  headers: string[];
};

// ─── CSV parsing ─────────────────────────────────────────────────────────────

/**
 * Minimal RFC 4180 reader: quoted fields, escaped `""`, embedded commas and
 * newlines, CRLF, and a UTF-8 BOM. Deliberately not a dependency — a partner
 * member list is a flat export, and the whole grammar is thirty lines.
 */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r") {
      i += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop trailing blank lines, which every spreadsheet export ends with.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const HEADER_ALIASES: Record<string, string> = {
  membershipid: "membershipId",
  "membership id": "membershipId",
  email: "email",
  firstname: "firstName",
  "first name": "firstName",
  lastname: "lastName",
  "last name": "lastName",
  level: "level",
  phone: "phone",
  dateofbirth: "dateOfBirth",
  "date of birth": "dateOfBirth",
  dob: "dateOfBirth",
  startdate: "startDate",
  "start date": "startDate",
  enddate: "endDate",
  "end date": "endDate",
  notes: "notes",
  primarymembershipid: "primaryMembershipId",
  "primary membership id": "primaryMembershipId",
  relationship: "relationship",
};

function normalizeHeader(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return HEADER_ALIASES[key] ?? HEADER_ALIASES[key.replace(/\s/g, "")] ?? raw.trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** `YYYY-MM-DD` or anything Date can parse; returns null when blank/invalid. */
function parseDate(raw: string | undefined): Date | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ─── Preview ─────────────────────────────────────────────────────────────────

export async function previewMembershipImport(input: {
  planId: string;
  fileName: string;
  csv: string;
  adminId: string | null;
}) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: input.planId },
    select: { id: true, countryId: true },
  });
  if (!plan) throw new MembershipImportError("Membership plan not found");

  const levels = await prisma.membershipLevel.findMany({
    where: { planId: plan.id },
    select: { id: true, slug: true, isDefault: true, familyEnabled: true, maxDependents: true },
  });
  const defaultLevel = levels.find((l) => l.isDefault) ?? levels[0];
  if (!defaultLevel) throw new MembershipImportError("This plan has no levels");

  const table = parseCsv(input.csv);
  if (table.length < 2) throw new MembershipImportError("The file has no data rows");
  const headers = table[0].map(normalizeHeader);
  for (const required of ["membershipId", "email", "firstName", "lastName"]) {
    if (!headers.includes(required)) {
      throw new MembershipImportError(`Missing required column: ${required}`);
    }
  }
  const body = table.slice(1);
  if (body.length > MEMBERSHIP_IMPORT_ROW_CAP) {
    throw new MembershipImportError(
      `This file has ${body.length} rows; the limit is ${MEMBERSHIP_IMPORT_ROW_CAP}. Please split it.`,
    );
  }

  const cell = (row: string[], key: string): string => {
    const index = headers.indexOf(key);
    return index === -1 ? "" : (row[index] ?? "").trim();
  };

  const rows: PreviewRow[] = [];
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  // Primaries this file itself creates, so a dependent can point at one.
  const fileMembershipIds = new Set<string>();
  for (const raw of body) {
    fileMembershipIds.add(cell(raw, "membershipId").toLowerCase());
  }
  // Dependents counted per primary across the file, added to what already exists.
  const dependentTally = new Map<string, number>();

  // Validate primaries before dependents regardless of the order they appear
  // in, so a dependent listed above its own primary still resolves — the same
  // ordering the commit uses (§8.2). Rows are sorted back into file order at
  // the end, because that is the order the preview table shows.
  const order = [
    ...body.map((_row, i) => i).filter((i) => !cell(body[i], "primaryMembershipId")),
    ...body.map((_row, i) => i).filter((i) => Boolean(cell(body[i], "primaryMembershipId"))),
  ];

  for (const index of order) {
    const raw = body[index];
    const line = index + 2; // 1-based, plus the header row
    const membershipId = cell(raw, "membershipId");
    const emailRaw = cell(raw, "email");
    const email = normalizeEmail(emailRaw);
    const primaryMembershipId = cell(raw, "primaryMembershipId") || null;
    const levelSlug = cell(raw, "level") || null;

    const base = {
      line,
      membershipId,
      email,
      firstName: cell(raw, "firstName"),
      lastName: cell(raw, "lastName"),
      phone: cell(raw, "phone") || null,
      dateOfBirth: parseDate(cell(raw, "dateOfBirth"))?.toISOString() ?? null,
      startDate: "",
      endDate: null as string | null,
      levelId: null as string | null,
      levelSlug,
      primaryMembershipId,
      relationship: cell(raw, "relationship") || null,
      adminNotes: cell(raw, "notes") || null,
    };
    const reject = (reason: string): void => {
      rows.push({ ...base, startDate: base.startDate || new Date().toISOString(), outcome: "REJECT", reason });
    };

    if (!membershipId || membershipId.length < 3) {
      reject("Missing or too-short membership ID");
      continue;
    }
    if (!emailRaw || !EMAIL_RE.test(emailRaw.trim())) {
      reject("Missing or malformed email");
      continue;
    }
    if (!base.firstName || !base.lastName) {
      reject("First and last name are both required");
      continue;
    }
    if (seenIds.has(membershipId.toLowerCase())) {
      reject("Duplicate membership ID within this file");
      continue;
    }
    if (seenEmails.has(email)) {
      reject("Duplicate email within this file");
      continue;
    }

    // Dependent rows inherit level and term; the primary decides both.
    const isDependent = Boolean(primaryMembershipId);
    let levelId = defaultLevel.id;
    let startDate = parseDate(cell(raw, "startDate")) ?? new Date();
    let endDate = parseDate(cell(raw, "endDate"));

    if (isDependent) {
      const primary = await prisma.membershipEnrollment.findFirst({
        where: {
          planId: plan.id,
          membershipId: { equals: primaryMembershipId!, mode: "insensitive" },
          status: { not: "REMOVED" },
        },
        select: {
          id: true,
          levelId: true,
          startDate: true,
          endDate: true,
          level: { select: { familyEnabled: true, maxDependents: true } },
        },
      });
      if (!primary) {
        if (!fileMembershipIds.has(primaryMembershipId!.toLowerCase())) {
          reject("Primary membership ID not found in this plan or this file");
          continue;
        }
        // The primary arrives in this same file. Its level and term are the
        // file's for that row; commit applies primaries first (§8.2).
        const primaryRow = rows.find(
          (r) => r.membershipId.toLowerCase() === primaryMembershipId!.toLowerCase(),
        );
        if (!primaryRow || primaryRow.outcome === "REJECT") {
          reject("The primary member's row was rejected");
          continue;
        }
        levelId = primaryRow.levelId ?? defaultLevel.id;
        startDate = new Date(primaryRow.startDate);
        endDate = primaryRow.endDate ? new Date(primaryRow.endDate) : null;
      } else {
        if (!primary.level.familyEnabled || primary.level.maxDependents < 1) {
          reject("The primary member's level does not include family cover");
          continue;
        }
        const already = await prisma.membershipEnrollment.count({
          where: { primaryEnrollmentId: primary.id, status: { not: "REMOVED" } },
        });
        const key = primaryMembershipId!.toLowerCase();
        const inFile = dependentTally.get(key) ?? 0;
        if (already + inFile >= primary.level.maxDependents) {
          reject(`Over the level's limit of ${primary.level.maxDependents} dependent(s)`);
          continue;
        }
        dependentTally.set(key, inFile + 1);
        levelId = primary.levelId;
        startDate = primary.startDate;
        endDate = primary.endDate;
      }
    } else if (levelSlug) {
      const level = levels.find((l) => l.slug.toLowerCase() === levelSlug.toLowerCase());
      if (!level) {
        reject(`Unknown level "${levelSlug}"`);
        continue;
      }
      levelId = level.id;
    }

    if (endDate && endDate < startDate) {
      reject("End date is before the start date");
      continue;
    }

    // Global, case-insensitive, and NOT limited to live rows: a REMOVED row
    // still owns its membership id until the revive of that same row
    // overwrites it (§8.2).
    const idHolder = await prisma.membershipEnrollment.findFirst({
      where: { membershipId: { equals: membershipId, mode: "insensitive" } },
      select: { id: true, planId: true, email: true, status: true },
    });
    const live = await prisma.membershipEnrollment.findFirst({
      where: {
        planId: plan.id,
        email: { equals: email, mode: "insensitive" },
        status: { not: "REMOVED" },
      },
      select: { id: true },
    });
    const removed = await prisma.membershipEnrollment.findFirst({
      where: { planId: plan.id, email: { equals: email, mode: "insensitive" }, status: "REMOVED" },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    if (live) {
      reject("This email is already enrolled in this plan");
      continue;
    }
    if (idHolder && idHolder.id !== removed?.id) {
      reject("This membership ID already belongs to another enrollment");
      continue;
    }

    seenIds.add(membershipId.toLowerCase());
    seenEmails.add(email);

    // LINK requires a VERIFIED account. An unverified one imports as PENDING
    // and links when it verifies — the import is exactly the path an attacker
    // controls, since they choose the email (§8.2/§5.2).
    const verifiedUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, emailVerifiedAt: { not: null } },
      select: { id: true },
    });

    rows.push({
      ...base,
      levelId,
      startDate: startDate.toISOString(),
      endDate: endDate ? endDate.toISOString() : null,
      outcome: removed ? "REVIVE" : verifiedUser ? "LINK" : "CREATE",
      ...(removed ? { existingEnrollmentId: removed.id } : {}),
    });
  }

  rows.sort((a, b) => a.line - b.line);
  const previewData: PreviewData = { rows, headers };
  const counts = summarize(rows);

  try {
    return await prisma.membershipImportBatch.create({
      data: {
        planId: plan.id,
        fileName: input.fileName.slice(0, 255),
        uploadedByAdminId: input.adminId,
        status: "PREVIEW",
        rowCount: rows.length,
        createdCount: counts.create + counts.link,
        revivedCount: counts.revive,
        rejectedCount: counts.reject,
        previewData: previewData as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership import is unavailable");
  }
}

export function summarize(rows: PreviewRow[]) {
  return {
    create: rows.filter((r) => r.outcome === "CREATE").length,
    link: rows.filter((r) => r.outcome === "LINK").length,
    revive: rows.filter((r) => r.outcome === "REVIVE").length,
    reject: rows.filter((r) => r.outcome === "REJECT").length,
  };
}

export async function getMembershipImportBatch(batchId: string) {
  const batch = await prisma.membershipImportBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new MembershipImportNotFoundError();
  return batch;
}

// ─── Commit / cancel ─────────────────────────────────────────────────────────

/**
 * Claim the batch atomically, then apply it in the same transaction.
 *
 * The `WHERE status = 'PREVIEW'` claim is the whole concurrency story: a
 * double-clicked commit, a retry, or a racing cancel produces exactly one
 * winner, and the loser gets the batch's current state instead of a second
 * application. Because the claim and the apply share one transaction, a
 * mid-apply failure rolls the status back to `PREVIEW` too — there is no state
 * where the batch reads COMMITTED but only half the rows landed.
 */
export async function commitMembershipImport(batchId: string, adminId: string | null) {
  const batch = await getMembershipImportBatch(batchId);
  if (batch.status !== "PREVIEW") {
    return { claimed: false as const, batch };
  }

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: batch.planId },
    select: { id: true, countryId: true },
  });
  if (!plan) throw new MembershipImportError("Membership plan not found");

  const stale = Date.now() - batch.createdAt.getTime() > REVALIDATE_AFTER_MS;
  const preview = batch.previewData as unknown as PreviewData;
  const applicable = preview.rows.filter((r) => r.outcome !== "REJECT");

  const emails: string[] = [];
  const skipped: { line: number; reason: string }[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const claim = await tx.membershipImportBatch.updateMany({
      where: { id: batchId, status: "PREVIEW" },
      data: { status: "COMMITTED", committedAt: new Date() },
    });
    if (claim.count === 0) return null; // someone else claimed it first

    let created = 0;
    let revived = 0;

    // Primaries first: a dependent's primary may be created by this same file.
    const ordered = [
      ...applicable.filter((r) => !r.primaryMembershipId),
      ...applicable.filter((r) => r.primaryMembershipId),
    ];

    for (const row of ordered) {
      let primaryEnrollmentId: string | null = null;
      if (row.primaryMembershipId) {
        const primary = await tx.membershipEnrollment.findFirst({
          where: {
            planId: plan.id,
            membershipId: { equals: row.primaryMembershipId, mode: "insensitive" },
            status: { not: "REMOVED" },
          },
          select: { id: true },
        });
        if (!primary) {
          skipped.push({ line: row.line, reason: "Primary member no longer exists" });
          continue;
        }
        primaryEnrollmentId = primary.id;
      }

      try {
        const outcome = await upsertEnrollmentRow(tx, {
          planId: plan.id,
          levelId: row.levelId!,
          countryId: plan.countryId,
          membershipId: row.membershipId,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          phone: row.phone,
          dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
          startDate: new Date(row.startDate),
          endDate: row.endDate ? new Date(row.endDate) : null,
          memberType: primaryEnrollmentId ? "DEPENDENT" : "PRIMARY",
          primaryEnrollmentId,
          relationship: row.relationship,
          adminNotes: row.adminNotes,
          importBatchId: batchId,
          createdByAdminId: adminId,
        });
        if (outcome.outcome === "REVIVE") revived += 1;
        else created += 1;
        emails.push(row.email);
      } catch (error) {
        // Re-validation is why this is a skip, not a failure: a batch left in
        // PREVIEW for a day can have had its emails and ids taken underneath it
        // (§8.2). One bad row must not discard the other 1,999.
        if (error instanceof MembershipEnrollmentConflictError) {
          skipped.push({ line: row.line, reason: error.message });
          continue;
        }
        throw error;
      }
    }

    await tx.membershipImportBatch.update({
      where: { id: batchId },
      data: { createdCount: created, revivedCount: revived },
    });
    return { created, revived };
  });

  if (!result) {
    return { claimed: false as const, batch: await getMembershipImportBatch(batchId) };
  }

  // Outside the transaction: a row whose address already belongs to a verified
  // account activates immediately, and that also sends its confirmation email.
  for (const email of emails) {
    await linkMembershipsForEmail(email).catch(() => undefined);
  }

  return {
    claimed: true as const,
    batch: await getMembershipImportBatch(batchId),
    created: result.created,
    revived: result.revived,
    skipped,
    revalidated: stale,
  };
}

/** Same claim, opposite terminal state — it can never cancel a claimed commit. */
export async function cancelMembershipImport(batchId: string) {
  const batch = await getMembershipImportBatch(batchId);
  if (batch.status !== "PREVIEW") {
    return { claimed: false as const, batch };
  }
  const claim = await prisma.membershipImportBatch.updateMany({
    where: { id: batchId, status: "PREVIEW" },
    data: { status: "CANCELLED" },
  });
  return {
    claimed: claim.count === 1,
    batch: await getMembershipImportBatch(batchId),
  };
}
