import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type PortugalSeoTargetKind = "home" | "service" | "doctor" | "tool";

export type PortugalSeoMetadataDraft = Readonly<{
  asset: string;
  url: string;
  locale: "PT";
  targetKind: PortugalSeoTargetKind;
  slug: string;
  primaryKeyword: string;
  secondaryKeywords: readonly string[];
  originalTitle: string;
  originalDescription: string;
  proposedTitle: string | null;
  proposedDescription: string | null;
  disposition: "proposed" | "retain_current";
}>;

export function parsePortugalCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  if (quoted) throw new Error("Portugal completion matrix contains an unterminated quote");
  return rows;
}

function target(url: string): Pick<PortugalSeoMetadataDraft, "asset" | "targetKind" | "slug"> {
  const path = new URL(url).pathname;
  if (path === "/portugal/pt") return { asset: path, targetKind: "home", slug: "HOME" };
  const match = /^\/portugal\/pt\/(services|doctors|tools)\/([^/]+)$/.exec(path);
  if (!match) throw new Error(`Unsupported Portugal SEO target ${url}`);
  const targetKind = match[1] === "services"
    ? "service"
    : match[1] === "doctors"
      ? "doctor"
      : "tool";
  return { asset: path, targetKind, slug: match[2] };
}

export function parsePortugalSeoMetadataDrafts(csv: string): PortugalSeoMetadataDraft[] {
  const [rawHeader, ...rows] = parsePortugalCsv(csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv);
  if (!rawHeader) throw new Error("Portugal completion matrix is empty");
  const header = rawHeader.map((column) => column.trim());
  const required = [
    "URL",
    "primary keyword",
    "secondary keywords",
    "original title",
    "optimized title",
    "original meta description",
    "optimized meta description",
  ];
  for (const column of required) {
    if (!header.includes(column)) throw new Error(`Portugal completion matrix is missing ${column}`);
  }

  const value = (row: string[], column: string) => (row[header.indexOf(column)] ?? "").trim();
  return rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => {
      const url = value(row, "URL");
      const optimizedTitle = value(row, "optimized title");
      const optimizedDescription = value(row, "optimized meta description");
      const retainCurrent = optimizedTitle.startsWith("RETER ") || optimizedDescription.startsWith("RETER ");
      return {
        ...target(url),
        url,
        locale: "PT" as const,
        primaryKeyword: value(row, "primary keyword"),
        secondaryKeywords: value(row, "secondary keywords")
          .split("|")
          .map((keyword) => keyword.trim())
          .filter(Boolean),
        originalTitle: value(row, "original title"),
        originalDescription: value(row, "original meta description"),
        proposedTitle: retainCurrent ? null : optimizedTitle,
        proposedDescription: retainCurrent ? null : optimizedDescription,
        disposition: retainCurrent ? "retain_current" as const : "proposed" as const,
      };
    });
}

export function loadPortugalSeoMetadataDrafts(): PortugalSeoMetadataDraft[] {
  const matrix = resolve(__dirname, "../../../seo/portugal/content-completion-matrix.csv");
  return parsePortugalSeoMetadataDrafts(readFileSync(matrix, "utf8"));
}

function approvalPayload(draft: PortugalSeoMetadataDraft): string {
  return JSON.stringify({
    asset: draft.asset,
    url: draft.url,
    locale: draft.locale,
    targetKind: draft.targetKind,
    slug: draft.slug,
    primaryKeyword: draft.primaryKeyword,
    secondaryKeywords: draft.secondaryKeywords,
    proposedTitle: draft.proposedTitle,
    proposedDescription: draft.proposedDescription,
    disposition: draft.disposition,
  });
}

export function portugalSeoApprovalSha256(draft: PortugalSeoMetadataDraft): string {
  return createHash("sha256").update(approvalPayload(draft)).digest("hex");
}

export function portugalSeoConfirmationToken(draft: PortugalSeoMetadataDraft): string {
  return `PT-SEO-${portugalSeoApprovalSha256(draft).slice(0, 12).toUpperCase()}`;
}
