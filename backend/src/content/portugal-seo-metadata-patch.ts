import { assertPortugalClinicalApproval } from "./portugal-clinical-approval.js";
import {
  portugalSeoApprovalSha256,
  portugalSeoConfirmationToken,
  type PortugalSeoMetadataDraft,
} from "./portugal-seo-metadata-drafts.js";
import {
  portugalRemainingApprovalSha256,
  portugalRemainingConfirmationToken,
  type PortugalSeoRemainingDraft,
} from "./portugal-seo-remaining-drafts.js";

type PortugalSeoApplyOptions = Readonly<{
  apply: boolean;
  draft: PortugalSeoMetadataDraft;
  registerCsv: string;
  factRegisterCsv: string;
  approvedHash: string | null;
  confirmation: string | null;
  reviewerDoctorId: string | null;
  reviewedAt: string | null;
  databaseUrl: string | undefined;
  confirmationDatabase: string | null;
  now?: Date;
}>;

export function portugalSeoDraftApprovalSha256(draft: PortugalSeoMetadataDraft): string {
  return "assetKind" in draft
    ? portugalRemainingApprovalSha256(draft as PortugalSeoRemainingDraft)
    : portugalSeoApprovalSha256(draft);
}

export function portugalSeoDraftConfirmationToken(draft: PortugalSeoMetadataDraft): string {
  return "assetKind" in draft
    ? portugalRemainingConfirmationToken(draft as PortugalSeoRemainingDraft)
    : portugalSeoConfirmationToken(draft);
}

export function assertPortugalSeoApplyAuthorized(options: PortugalSeoApplyOptions): ReturnType<typeof assertPortugalClinicalApproval> | null {
  if (!options.apply) return null;
  if (options.draft.disposition === "retain_current") {
    throw new Error(`${options.draft.asset} retains its current metadata`);
  }
  if (options.draft.targetKind === "tool") {
    throw new Error(`${options.draft.asset} is managed in a static runtime source`);
  }
  const expectedConfirmation = portugalSeoDraftConfirmationToken(options.draft);
  if (options.confirmation !== expectedConfirmation) {
    throw new Error("Portugal SEO confirmation token does not match the selected draft");
  }

  let databaseIdentity: string;
  try {
    databaseIdentity = portugalDatabaseIdentity(options.databaseUrl ?? "");
  } catch {
    throw new Error("DATABASE_URL must contain a valid PostgreSQL database identity");
  }
  if (options.confirmationDatabase !== databaseIdentity) {
    throw new Error("Confirmed database identity does not match DATABASE_URL");
  }

  const expectedHash = portugalSeoDraftApprovalSha256(options.draft);
  if (options.approvedHash !== expectedHash) {
    throw new Error("Approved SHA-256 does not match the selected Portugal SEO draft");
  }
  const record = assertPortugalClinicalApproval(options.registerCsv, {
    asset: options.draft.asset,
    approvedSha256: expectedHash,
    factRegisterCsv: options.factRegisterCsv,
    now: options.now,
  });
  if (record.reviewer_doctor_id !== options.reviewerDoctorId) {
    throw new Error("Clinical reviewer doctor ID does not match the approval register");
  }
  if (record.reviewed_at.slice(0, 10) !== options.reviewedAt) {
    throw new Error("Clinical review date does not match the approval register");
  }
  return record;
}

export function portugalDatabaseIdentity(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL is not PostgreSQL");
  }
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (!url.hostname || !databaseName || databaseName.includes("/")) {
    throw new Error("DATABASE_URL is missing host or database name");
  }
  const schema = url.searchParams.get("schema");
  return `${url.protocol}//${url.hostname}:${url.port || "5432"}/${databaseName}${
    schema ? `?schema=${encodeURIComponent(schema)}` : ""
  }`;
}
