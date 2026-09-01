import { createHash } from "node:crypto";

import { parsePortugalCsv } from "./portugal-seo-metadata-drafts.js";

const REQUIRED_COLUMNS = [
  "page_or_file",
  "topic",
  "risk_level",
  "claims_requiring_review",
  "source_status",
  "reviewer_required",
  "publish_status",
  "notes",
  "reviewer_name",
  "reviewer_doctor_id",
  "clinical_reviewer_professional_body",
  "clinical_reviewer_specialty_id",
  "reviewed_at",
  "official_source_references",
  "approved_sha256",
  "compliance_reviewer_name",
  "compliance_reviewer_id",
  "compliance_reviewed_at",
  "content_owner_name",
  "content_owner_id",
  "content_owner_reviewed_at",
  "fact_register_sha256",
  "credential_subject_doctor_id",
  "delegated_by_doctor_id",
] as const;

type PortugalClinicalReviewColumn = (typeof REQUIRED_COLUMNS)[number];
export type PortugalClinicalReviewRecord = Record<PortugalClinicalReviewColumn, string> & { asset: string };

const FACT_COLUMNS = [
  "URL",
  "slug",
  "display_name",
  "professional_body",
  "registration_number",
  "source_status",
  "official_source",
  "verification_status",
  "notes",
] as const;

type PortugalDoctorFactColumn = (typeof FACT_COLUMNS)[number];
export type PortugalDoctorFactRecord = Record<PortugalDoctorFactColumn, string> & { asset: string };

const OFFICIAL_SOURCE_HOSTS = [
  "gov.pt",
  "dgs.pt",
  "sns.pt",
  "sns24.gov.pt",
  "ers.pt",
  "ordemdosmedicos.pt",
  "ordemdospsicologos.pt",
  "imt-ip.pt",
  "seg-social.pt",
  "dre.pt",
  "infarmed.pt",
  "cnpd.pt",
] as const;

function assetFromPageOrFile(value: string): string {
  const url = value.match(/https?:\/\/\S+$/)?.[0];
  if (url) return new URL(url).pathname;
  if (value.startsWith("/")) return value;
  throw new Error(`Clinical review register cannot resolve asset from ${value}`);
}

function recordsFromCsv(csv: string): PortugalClinicalReviewRecord[] {
  const text = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
  const [rawHeader, ...rows] = parsePortugalCsv(text);
  if (!rawHeader) throw new Error("Clinical review register is empty");
  const header = rawHeader.map((column) => column.trim());
  for (const column of REQUIRED_COLUMNS) {
    if (!header.includes(column)) throw new Error(`Clinical review register is missing column ${column}`);
  }
  return rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row, index) => {
      if (row.length > header.length) {
        throw new Error(`Clinical review register row ${index + 2} has unexpected columns`);
      }
      const record = Object.fromEntries(
        REQUIRED_COLUMNS.map((column) => [column, (row[header.indexOf(column)] ?? "").trim()]),
      ) as Record<PortugalClinicalReviewColumn, string>;
      return { ...record, asset: assetFromPageOrFile(record.page_or_file) };
    });
}

export function readPortugalClinicalReviewRecord(
  csv: string,
  asset: string,
): PortugalClinicalReviewRecord {
  const matches = recordsFromCsv(csv).filter((record) => record.asset === asset);
  if (matches.length === 0) throw new Error(`Clinical review record missing for asset ${asset}`);
  if (matches.length > 1) throw new Error(`Duplicate clinical review records for asset ${asset}`);
  return matches[0];
}

function requireValue(record: PortugalClinicalReviewRecord, field: PortugalClinicalReviewColumn): string {
  const value = record[field];
  if (!value) throw new Error(`Clinical approval field ${field} is blank for ${record.asset}`);
  return value;
}

function assertReviewDate(record: PortugalClinicalReviewRecord, field: PortugalClinicalReviewColumn, now: Date): void {
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
  if (Number.isNaN(reviewedAt.getTime()) || reviewedAt.getTime() > now.getTime()) {
    throw new Error(`Clinical approval field ${field} is invalid for ${record.asset}`);
  }
}

function officialSourceUrls(value: string, label: string): URL[] {
  const urls = value.split(/\s*\|\s*/).filter(Boolean).map((source) => {
    let url: URL;
    try {
      url = new URL(source);
    } catch {
      throw new Error(`${label} must contain HTTPS URLs separated by |`);
    }
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      !OFFICIAL_SOURCE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
    ) {
      throw new Error(`${label} contains a non-official Portugal source`);
    }
    return url;
  });
  if (urls.length === 0) throw new Error(`${label} is blank`);
  return urls;
}

export function readPortugalDoctorFactRecord(csv: string, asset: string): PortugalDoctorFactRecord {
  const text = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
  const [rawHeader, ...rows] = parsePortugalCsv(text);
  if (!rawHeader) throw new Error("Portugal doctor fact register is empty");
  const header = rawHeader.map((column) => column.trim());
  for (const column of FACT_COLUMNS) {
    if (!header.includes(column)) throw new Error(`Portugal doctor fact register is missing column ${column}`);
  }
  const records = rows.filter((row) => row.some((cell) => cell.trim())).map((row, index) => {
    if (row.length > header.length) {
      throw new Error(`Portugal doctor fact register row ${index + 2} has unexpected columns`);
    }
    const record = Object.fromEntries(
      FACT_COLUMNS.map((column) => [column, (row[header.indexOf(column)] ?? "").trim()]),
    ) as Record<PortugalDoctorFactColumn, string>;
    const url = new URL(record.URL);
    const canonicalPath = `/portugal/pt/doctors/${record.slug}`;
    if (
      url.protocol !== "https:" ||
      url.hostname !== "www.myglobalhealth.online" ||
      url.pathname !== canonicalPath ||
      url.search ||
      url.hash
    ) {
      throw new Error(`Doctor fact URL is not the canonical Global Health profile for ${record.slug}`);
    }
    return { ...record, asset: url.pathname };
  });
  const matches = records.filter((record) => record.asset === asset);
  if (matches.length !== 1) throw new Error(`Expected one doctor fact record for ${asset}; found ${matches.length}`);
  return matches[0];
}

export function portugalDoctorFactSha256(record: PortugalDoctorFactRecord): string {
  return createHash("sha256").update(JSON.stringify(
    Object.fromEntries(FACT_COLUMNS.map((column) => [column, record[column]])),
  )).digest("hex");
}

export function assertPortugalClinicalApproval(
  csv: string,
  options: Readonly<{ asset: string; approvedSha256: string; factRegisterCsv?: string; now?: Date }>,
): PortugalClinicalReviewRecord {
  const record = readPortugalClinicalReviewRecord(csv, options.asset);
  if (record.publish_status !== "approved") {
    throw new Error(`Clinical review status is ${record.publish_status || "blank"} for ${record.asset}`);
  }
  requireValue(record, "reviewer_name");
  requireValue(record, "reviewer_doctor_id");
  requireValue(record, "reviewer_required");
  requireValue(record, "clinical_reviewer_professional_body");
  const officialSources = officialSourceUrls(
    requireValue(record, "official_source_references"),
    `Clinical approval field official_source_references for ${record.asset}`,
  );
  const now = options.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Clinical approval comparison time is invalid");
  assertReviewDate(record, "reviewed_at", now);
  if (!/^[a-f0-9]{64}$/i.test(options.approvedSha256)) {
    throw new Error("Expected approvedSha256 must be a SHA-256 hex digest");
  }
  if (record.approved_sha256 !== options.approvedSha256) {
    throw new Error(`Clinical approval field approved_sha256 does not match ${record.asset}`);
  }
  if (record.asset.startsWith("/portugal/pt/doctors/")) {
    requireValue(record, "credential_subject_doctor_id");
    if (!options.factRegisterCsv) throw new Error(`Doctor fact register is required for ${record.asset}`);
    const fact = readPortugalDoctorFactRecord(options.factRegisterCsv, record.asset);
    if (fact.verification_status !== "verified") {
      throw new Error(`Doctor fact verification status is ${fact.verification_status || "blank"} for ${record.asset}`);
    }
    if (!fact.professional_body || !fact.registration_number) {
      throw new Error(`Doctor professional registration is incomplete for ${record.asset}`);
    }
    const factSources = officialSourceUrls(fact.official_source, `Doctor official_source for ${record.asset}`);
    if (!factSources.some((factSource) => officialSources.some((source) => source.href === factSource.href))) {
      throw new Error(`Doctor official source is not included in the clinical approval for ${record.asset}`);
    }
    if (record.fact_register_sha256 !== portugalDoctorFactSha256(fact)) {
      throw new Error(`Clinical approval field fact_register_sha256 does not match ${record.asset}`);
    }
  }
  return record;
}
