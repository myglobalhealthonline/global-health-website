import "server-only";

import type { PublicationIssue } from "@/lib/content/publication-validation";

/**
 * Encodes editorial validation issues for a URL query segment (base64url JSON).
 */
export function encodeEditorialIssuesForQuery(issues: PublicationIssue[]): string {
  return Buffer.from(JSON.stringify(issues), "utf8").toString("base64url");
}

/**
 * Decodes editorial issues from the `editorialIssues` search param.
 */
export function decodeEditorialIssuesFromQuery(raw: string | undefined): PublicationIssue[] {
  if (!raw?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PublicationIssue =>
        Boolean(item) &&
        typeof item === "object" &&
        "message" in item &&
        typeof (item as PublicationIssue).message === "string",
    );
  } catch {
    return [];
  }
}
