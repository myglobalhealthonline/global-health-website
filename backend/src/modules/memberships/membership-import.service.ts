import { Prisma, type LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { linkMembershipsForEmail } from "./membership-linking.service.js";
import { issueMembershipCards } from "./membership-card-issue.js";
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
  /** Why the row was REJECTed. Nothing is applied for it. */
  reason?: string;
  /**
   * Things worth an admin's eye that do NOT stop the row (§25). An
   * unrecognised locale, a partner reference repeated inside the file — both
   * are probably data errors, and neither is worth blocking a 200-row import.
   */
  warnings?: string[];
  /**
   * The partner's own member number, from the CSV. NOT a key (§21.5), and no
   * longer the id: `membershipId` is generated at commit, so a preview row has
   * no id to show yet.
   */
  partnerReference: string | null;
  /** Welcome-email language while the row is PENDING (§25). Null = fall back. */
  preferredLocale: LocaleCode | null;
  /** True when committing this row will send a welcome email + card (§41). */
  willEmail: boolean;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: string | null;
  startDate: string;
  endDate: string | null;
  levelId: string | null;
  levelSlug: string | null;
  /**
   * How a dependent names its primary. `primaryMembershipId` still works for a
   * primary who is ALREADY enrolled — an admin can copy their generated id out
   * of the member list — but it cannot name a primary created by this same
   * file, because that id does not exist until commit (§21.5).
   * `primaryEmail` covers that case, and is the same key linking uses
   * everywhere else (§5, assumption 5).
   */
  primaryMembershipId: string | null;
  primaryEmail: string | null;
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
  // The partner's own number. `membershipId` aliases onto it deliberately:
  // every partner file in existence has that column, and since phase 7c the
  // id is ours to generate, so the number in their export IS their reference
  // (§8.1). Silently dropping the column would have thrown away the only
  // thing tying our record back to theirs.
  partnerreference: "partnerReference",
  "partner reference": "partnerReference",
  membershipid: "partnerReference",
  "membership id": "partnerReference",
  memberid: "partnerReference",
  "member id": "partnerReference",
  reference: "partnerReference",
  ref: "partnerReference",
  locale: "locale",
  language: "locale",
  lang: "locale",
  primaryemail: "primaryEmail",
  "primary email": "primaryEmail",
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
    select: {
      id: true,
      slug: true,
      primaryCountryId: true,
      primaryCountry: {
        select: { defaultLocale: true, countryLocales: { select: { locale: true } } },
      },
    },
  });
  if (!plan) throw new MembershipImportError("Membership plan not found");

  // Which languages this plan can actually write in: the primary country's
  // configured locales plus its default (§25). An unrecognised one is a
  // warning, not a rejection — a mistyped language must not cost the admin a
  // 200-row import.
  const supportedLocales = new Set<LocaleCode>([
    plan.primaryCountry.defaultLocale,
    ...plan.primaryCountry.countryLocales.map((l) => l.locale),
  ]);

  const levels = await prisma.membershipLevel.findMany({
    where: { planId: plan.id },
    select: { id: true, slug: true, isDefault: true, familyEnabled: true, maxDependents: true },
  });
  const defaultLevel = levels.find((l) => l.isDefault) ?? levels[0];
  if (!defaultLevel) throw new MembershipImportError("This plan has no levels");

  const table = parseCsv(input.csv);
  if (table.length < 2) throw new MembershipImportError("The file has no data rows");
  const headers = table[0].map(normalizeHeader);
  // `membershipId` is no longer required — it is generated (§21.5). A file
  // that still carries the column is fine: it aliases onto `partnerReference`.
  for (const required of ["email", "firstName", "lastName"]) {
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
  const seenEmails = new Set<string>();
  const seenReferences = new Set<string>();
  // Primaries this file itself creates, keyed by EMAIL — the only handle a
  // dependent can use for a primary whose id does not exist yet (§21.5).
  const filePrimaryEmails = new Set<string>();
  for (const raw of body) {
    if (!cell(raw, "primaryMembershipId") && !cell(raw, "primaryEmail")) {
      filePrimaryEmails.add(normalizeEmail(cell(raw, "email")));
    }
  }
  // Dependents counted per primary across the file, added to what already exists.
  const dependentTally = new Map<string, number>();

  const isDependentRow = (raw: string[]): boolean =>
    Boolean(cell(raw, "primaryMembershipId") || cell(raw, "primaryEmail"));

  // Validate primaries before dependents regardless of the order they appear
  // in, so a dependent listed above its own primary still resolves — the same
  // ordering the commit uses (§8.2). Rows are sorted back into file order at
  // the end, because that is the order the preview table shows.
  const order = [
    ...body.map((_row, i) => i).filter((i) => !isDependentRow(body[i])),
    ...body.map((_row, i) => i).filter((i) => isDependentRow(body[i])),
  ];

  for (const index of order) {
    const raw = body[index];
    const line = index + 2; // 1-based, plus the header row
    const emailRaw = cell(raw, "email");
    const email = normalizeEmail(emailRaw);
    const primaryMembershipId = cell(raw, "primaryMembershipId") || null;
    const primaryEmail = normalizeEmail(cell(raw, "primaryEmail")) || null;
    const levelSlug = cell(raw, "level") || null;
    const partnerReference = cell(raw, "partnerReference") || null;

    const warnings: string[] = [];
    const localeRaw = cell(raw, "locale").toUpperCase();
    let preferredLocale: LocaleCode | null = null;
    if (localeRaw) {
      const candidate = localeRaw as LocaleCode;
      if (supportedLocales.has(candidate)) {
        preferredLocale = candidate;
      } else {
        // Ignored rather than rejected (§25): the row is still a perfectly
        // good member, they just get the plan's default language.
        warnings.push(
          `Locale "${localeRaw}" is not configured for this plan's country — falling back to the default`,
        );
      }
    }
    if (partnerReference && seenReferences.has(partnerReference.toLowerCase())) {
      // Duplicates ACROSS plans are permitted by design (§21.5); inside one
      // file they are almost certainly a copy-paste error. Worth surfacing,
      // not worth blocking the import over.
      warnings.push("This partner reference appears more than once in this file");
    }

    const base = {
      line,
      partnerReference,
      preferredLocale,
      warnings,
      willEmail: false,
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
      primaryEmail,
      relationship: cell(raw, "relationship") || null,
      adminNotes: cell(raw, "notes") || null,
    };
    const reject = (reason: string): void => {
      rows.push({ ...base, startDate: base.startDate || new Date().toISOString(), outcome: "REJECT", reason });
    };

    if (!emailRaw || !EMAIL_RE.test(emailRaw.trim())) {
      reject("Missing or malformed email");
      continue;
    }
    if (!base.firstName || !base.lastName) {
      reject("First and last name are both required");
      continue;
    }
    if (seenEmails.has(email)) {
      reject("Duplicate email within this file");
      continue;
    }

    // Dependent rows inherit level and term; the primary decides both.
    const isDependent = Boolean(primaryMembershipId || primaryEmail);
    let levelId = defaultLevel.id;
    let startDate = parseDate(cell(raw, "startDate")) ?? new Date();
    let endDate = parseDate(cell(raw, "endDate"));

    if (isDependent) {
      // Two ways to name a primary, because the generated id does not exist
      // until commit: `primaryMembershipId` finds someone already enrolled,
      // `primaryEmail` finds someone this same file is creating.
      const primary = await prisma.membershipEnrollment.findFirst({
        where: {
          planId: plan.id,
          status: { not: "REMOVED" },
          ...(primaryMembershipId
            ? { membershipId: { equals: primaryMembershipId, mode: "insensitive" } }
            : { email: { equals: primaryEmail!, mode: "insensitive" } }),
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
        if (!primaryEmail || !filePrimaryEmails.has(primaryEmail)) {
          reject(
            primaryMembershipId
              ? "Primary membership ID not found in this plan — use primaryEmail for a primary created by this file"
              : "Primary email not found in this plan or this file",
          );
          continue;
        }
        // The primary arrives in this same file. Its level and term are the
        // file's for that row; commit applies primaries first (§8.2).
        const primaryRow = rows.find((r) => r.email === primaryEmail);
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
        // Tallied on the RESOLVED primary, so two dependents naming the same
        // person by different handles — one by id, one by email — still count
        // against one cap rather than two.
        const key = primary.id;
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

    // No membership-id collision check any more: the id is generated at
    // commit and checked against the global index there (§21.5), so nothing in
    // the CSV can clash with an existing one. The two §8.3 rejections that
    // covered it are gone with it — a duplicate partner reference inside the
    // file is now a warning, since duplicates are permitted by design.
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
      // `cardIssuedAt` decides whether reviving this person emails them again.
      select: { id: true, cardIssuedAt: true },
    });

    if (live) {
      reject("This email is already enrolled in this plan");
      continue;
    }

    seenEmails.add(email);
    if (partnerReference) seenReferences.add(partnerReference.toLowerCase());

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
      // §41's dedupe, read forward at preview time so the blast radius is
      // honest before the send. A CREATE or LINK row has no enrollment yet, so
      // it always emails; a REVIVE reuses a row that may already have had its
      // card, and reviving does not clear `cardIssuedAt` — so that person gets
      // nothing a second time.
      willEmail: removed ? removed.cardIssuedAt == null : true,
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
    warned: rows.filter((r) => (r.warnings?.length ?? 0) > 0).length,
    /**
     * "Committing will email N members" (§25). NOT the row count: a REJECT
     * applies nothing, and a REVIVE of someone who already has their card
     * sends nothing either. Counting rows would overstate it on every
     * re-import, which is the one number this control exists to get right —
     * it is the whole safety argument for previewing before the send.
     */
    recipients: rows.filter((r) => r.outcome !== "REJECT" && r.willEmail).length,
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
    select: { id: true, slug: true, primaryCountryId: true },
  });
  if (!plan) throw new MembershipImportError("Membership plan not found");

  const stale = Date.now() - batch.createdAt.getTime() > REVALIDATE_AFTER_MS;
  const preview = batch.previewData as unknown as PreviewData;
  const applicable = preview.rows.filter((r) => r.outcome !== "REJECT");

  const emails: string[] = [];
  const skipped: { line: number; reason: string }[] = [];
  /**
   * Rows that BOTH landed and were flagged `willEmail` on the preview (§25).
   *
   * Both conditions matter. `willEmail` alone is the number the admin approved,
   * so re-deriving eligibility here would let the send drift from the count they
   * agreed to — the entire safety argument behind decision 41. But the commit
   * also skips rows the preview could not know about (a primary since removed,
   * an address taken underneath a stale batch), and mailing a card to someone
   * whose enrollment does not exist is worse than not mailing at all.
   */
  const cardRecipients: string[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const claim = await tx.membershipImportBatch.updateMany({
      where: { id: batchId, status: "PREVIEW" },
      data: { status: "COMMITTED", committedAt: new Date() },
    });
    if (claim.count === 0) return null; // someone else claimed it first

    let created = 0;
    let revived = 0;

    // Primaries first: a dependent's primary may be created by this same file.
    //
    // The test is "names a primary by EITHER handle". Keying it on
    // `primaryMembershipId` alone — as it did before `primaryEmail` existed —
    // sorts an email-linked dependent into the primaries group, so it runs
    // before its own primary, finds nothing, and is silently skipped.
    const isDependent = (r: PreviewRow) => Boolean(r.primaryMembershipId || r.primaryEmail);
    const ordered = [...applicable.filter((r) => !isDependent(r)), ...applicable.filter(isDependent)];

    for (const row of ordered) {
      let primaryEnrollmentId: string | null = null;
      if (row.primaryMembershipId || row.primaryEmail) {
        // Resolved here rather than carried from the preview, because a
        // primary created earlier in THIS commit only exists now — its
        // generated id was not knowable when the preview was written.
        const primary = await tx.membershipEnrollment.findFirst({
          where: {
            planId: plan.id,
            status: { not: "REMOVED" },
            ...(row.primaryMembershipId
              ? { membershipId: { equals: row.primaryMembershipId, mode: "insensitive" } }
              : { email: { equals: row.primaryEmail!, mode: "insensitive" } }),
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
          planSlug: plan.slug,
          levelId: row.levelId!,
          countryId: plan.primaryCountryId,
          // No membershipId: generated per row inside (§21.5).
          partnerReference: row.partnerReference ?? null,
          preferredLocale: row.preferredLocale ?? null,
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
        if (row.willEmail) cardRecipients.push(outcome.id);
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
  // account activates immediately, and the linker issues that row's card as
  // part of linking it (§25).
  //
  // The rows this commit is about to card get no §12.1 confirmation from the
  // linker: welcome+card is strictly richer and lands moments later, and two
  // emails a minute apart saying overlapping things is noise (§25). Passed as
  // ids rather than a flag because linking is BY ADDRESS — the same call can
  // attach an enrollment in another plan that this import never touched, and
  // that one's confirmation must still go out.
  const suppressConfirmationFor = new Set(cardRecipients);
  for (const email of emails) {
    await linkMembershipsForEmail(email, { suppressConfirmationFor }).catch(() => undefined);
  }

  // Cards LAST, and deliberately after the link loop.
  //
  // Locale precedence (§25) puts `User.preferredLocale` above the enrollment's
  // own. Before the loop runs, a LINK row's `userId` is still null, so a send
  // placed here would fall through to whatever locale the CSV said — inverting
  // the precedence for exactly the rows it exists to protect. The rule does not
  // imply the ordering, which is how this gets reintroduced.
  //
  // Idempotent by `cardIssuedAt`, so the rows the linker already carded above
  // are skipped rather than mailed twice.
  const cards = await issueMembershipCards(cardRecipients, adminId);

  return {
    claimed: true as const,
    batch: await getMembershipImportBatch(batchId),
    created: result.created,
    revived: result.revived,
    skipped,
    revalidated: stale,
    cardsIssued: cards.issued,
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
