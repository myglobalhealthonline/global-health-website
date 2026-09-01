import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  parsePortugalCsv,
  type PortugalSeoMetadataDraft,
  type PortugalSeoTargetKind,
} from "./portugal-seo-metadata-drafts.js";

export type PortugalRemainingAssetKind = "doctor" | "page_content" | "seo_landing" | "blog";

export type PortugalSeoRemainingDraft = PortugalSeoMetadataDraft & Readonly<{
  assetKind: PortugalRemainingAssetKind;
  assetPath: string;
}>;

const BLOCKED_STATUS = "drafted; blocked pending clinical or credential review";

function target(path: string): Readonly<{
  assetKind: PortugalRemainingAssetKind;
  targetKind: PortugalSeoTargetKind;
  slug: string;
}> {
  const pageKey = new Map([
    ["/portugal/pt/doctors", "DOCTORS_INDEX"],
    ["/portugal/pt/gp-consultation-online", "GENERAL_CONSULTATION"],
    ["/portugal/pt/see-a-specialist", "SPECIALIST_CONSULTATION"],
  ]).get(path);
  if (pageKey) return { assetKind: "page_content", targetKind: "page", slug: pageKey };

  const doctor = /^\/portugal\/pt\/doctors\/([^/]+)$/.exec(path);
  if (doctor) return { assetKind: "doctor", targetKind: "doctor", slug: doctor[1]! };

  const landing = /^\/portugal\/pt\/health\/([^/]+)$/.exec(path);
  if (landing) return { assetKind: "seo_landing", targetKind: "landing", slug: landing[1]! };

  const blog = /^\/portugal\/pt\/blog\/([^/]+)$/.exec(path);
  if (blog) return { assetKind: "blog", targetKind: "blog", slug: blog[1]! };

  throw new Error(`Unsupported remaining Portugal SEO target ${path}`);
}

export function parsePortugalSeoRemainingDrafts(csv: string): PortugalSeoRemainingDraft[] {
  const [rawHeader, ...rows] = parsePortugalCsv(csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv);
  if (!rawHeader) throw new Error("Portugal page-by-page completion matrix is empty");
  const header = rawHeader.map((column) => column.trim());
  const required = [
    "URL",
    "primary keyword",
    "secondary keywords",
    "original title",
    "optimized title",
    "original meta description",
    "optimized meta description",
    "implementation status",
  ];
  for (const column of required) {
    if (!header.includes(column)) throw new Error(`Portugal page-by-page completion matrix is missing ${column}`);
  }

  const value = (row: string[], column: string) => (row[header.indexOf(column)] ?? "").trim();
  return rows
    .filter((row) => value(row, "implementation status") === BLOCKED_STATUS)
    .map((row) => {
      const url = value(row, "URL");
      const parsedUrl = new URL(url);
      if (
        parsedUrl.protocol !== "https:" ||
        parsedUrl.hostname !== "www.myglobalhealth.online" ||
        !parsedUrl.pathname.startsWith("/portugal/pt/") ||
        parsedUrl.search ||
        parsedUrl.hash
      ) {
        throw new Error(`Remaining Portugal SEO URL is not canonical: ${url}`);
      }
      const resolvedTarget = target(parsedUrl.pathname);
      return {
        asset: parsedUrl.pathname,
        assetPath: parsedUrl.pathname,
        assetKind: resolvedTarget.assetKind,
        url,
        locale: "PT" as const,
        targetKind: resolvedTarget.targetKind,
        slug: resolvedTarget.slug,
        primaryKeyword: value(row, "primary keyword"),
        secondaryKeywords: value(row, "secondary keywords")
          .split("|")
          .map((keyword) => keyword.trim())
          .filter(Boolean),
        originalTitle: value(row, "original title"),
        originalDescription: value(row, "original meta description"),
        proposedTitle: value(row, "optimized title"),
        proposedDescription: value(row, "optimized meta description"),
        disposition: "proposed" as const,
      };
    });
}

export function loadPortugalSeoRemainingDrafts(): PortugalSeoRemainingDraft[] {
  const matrix = resolve(__dirname, "../../../seo/portugal/page-by-page-completion-matrix.csv");
  return parsePortugalSeoRemainingDrafts(readFileSync(matrix, "utf8"));
}

export function portugalRemainingApprovalSha256(draft: PortugalSeoRemainingDraft): string {
  return createHash("sha256").update(JSON.stringify({
    assetKind: draft.assetKind,
    assetPath: draft.assetPath,
    locale: draft.locale,
    targetKind: draft.targetKind,
    slug: draft.slug,
    primaryKeyword: draft.primaryKeyword,
    secondaryKeywords: draft.secondaryKeywords,
    proposedTitle: draft.proposedTitle,
    proposedDescription: draft.proposedDescription,
  })).digest("hex");
}

export function portugalRemainingConfirmationToken(draft: PortugalSeoRemainingDraft): string {
  return `PT-SEO-${portugalRemainingApprovalSha256(draft).slice(0, 12).toUpperCase()}`;
}
