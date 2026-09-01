import { parseCsv } from "../legacy-migration/lib/contacts-csv.js";

const REQUIRED_COLUMNS = [
  "asset",
  "asset_type",
  "review_domain",
  "reason",
  "claim_guardrail",
  "official_source",
  "priority",
  "reviewer_requirement",
  "status",
  "reviewer_name",
  "reviewer_doctor_id",
  "reviewed_at",
  "approved_sha256",
  "native_reviewer_name",
  "native_reviewer_id",
  "native_reviewed_at",
] as const;

type ClinicalReviewColumn = (typeof REQUIRED_COLUMNS)[number];

export type CzechiaClinicalReviewRecord = Record<ClinicalReviewColumn, string>;

export interface CzechiaClinicalApprovalOptions {
  asset: string;
  approvedSha256: string;
  now?: Date;
}

function recordsFromCsv(csv: string): CzechiaClinicalReviewRecord[] {
  const text = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
  const [rawHeader, ...rows] = parseCsv(text);
  if (!rawHeader) throw new Error("Clinical review register is empty");

  const header = rawHeader.map((column) => column.trim());
  for (const column of REQUIRED_COLUMNS) {
    if (!header.includes(column)) throw new Error(`Clinical review register is missing column ${column}`);
  }

  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row, index) => {
      if (row.length > header.length) {
        throw new Error(`Clinical review register row ${index + 2} has unexpected columns`);
      }
      return Object.fromEntries(
        REQUIRED_COLUMNS.map((column) => [column, (row[header.indexOf(column)] ?? "").trim()]),
      ) as CzechiaClinicalReviewRecord;
    });
}

export function readCzechiaClinicalReviewRecord(
  csv: string,
  asset: string,
): CzechiaClinicalReviewRecord {
  const matches = recordsFromCsv(csv).filter((record) => record.asset === asset);
  if (matches.length === 0) throw new Error(`Clinical review record missing for asset ${asset}`);
  if (matches.length > 1) throw new Error(`Duplicate clinical review records for asset ${asset}`);
  return matches[0];
}

function requireValue(record: CzechiaClinicalReviewRecord, field: ClinicalReviewColumn): string {
  const value = record[field];
  if (!value) throw new Error(`Clinical approval field ${field} is blank for ${record.asset}`);
  return value;
}

function assertReviewedAt(
  record: CzechiaClinicalReviewRecord,
  field: "reviewed_at" | "native_reviewed_at",
  now: Date,
): void {
  const value = requireValue(record, field);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match) {
    throw new Error(`Clinical approval field ${field} must be an RFC 3339 timestamp for ${record.asset}`);
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, offsetHourText, offsetMinuteText] = match;
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = [
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    offsetHourText ?? "0",
    offsetMinuteText ?? "0",
  ].map(Number);
  const daysInMonth = month >= 1 && month <= 12
    ? new Date(Date.UTC(year, month, 0)).getUTCDate()
    : 0;
  if (
    year === 0 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59
    || offsetHour > 23 || offsetMinute > 59
  ) {
    throw new Error(`Clinical approval field ${field} is invalid for ${record.asset}`);
  }

  const reviewedAt = new Date(value);
  if (Number.isNaN(reviewedAt.getTime())) {
    throw new Error(`Clinical approval field ${field} is invalid for ${record.asset}`);
  }
  if (reviewedAt.getTime() > now.getTime()) {
    throw new Error(`Clinical approval field ${field} is in the future for ${record.asset}`);
  }
}

export function assertCzechiaClinicalApproval(
  csv: string,
  options: CzechiaClinicalApprovalOptions,
): CzechiaClinicalReviewRecord {
  const record = readCzechiaClinicalReviewRecord(csv, options.asset);
  if (record.status !== "approved") {
    throw new Error(`Clinical review status is ${record.status || "blank"} for ${record.asset}`);
  }

  const now = options.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Clinical approval comparison time is invalid");
  requireValue(record, "reviewer_name");
  requireValue(record, "reviewer_doctor_id");
  assertReviewedAt(record, "reviewed_at", now);

  if (!/^[a-f0-9]{64}$/i.test(options.approvedSha256)) {
    throw new Error("Expected approvedSha256 must be a SHA-256 hex digest");
  }
  if (!/^[a-f0-9]{64}$/i.test(record.approved_sha256) || record.approved_sha256 !== options.approvedSha256) {
    throw new Error(`Clinical approval field approved_sha256 does not match ${record.asset}`);
  }

  if (record.asset === "/czechia/en" || record.asset.startsWith("/czechia/en/")) {
    requireValue(record, "native_reviewer_name");
    requireValue(record, "native_reviewer_id");
    assertReviewedAt(record, "native_reviewed_at", now);
  }

  return record;
}
