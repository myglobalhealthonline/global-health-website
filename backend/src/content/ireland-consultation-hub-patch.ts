export const IRELAND_HUB_CONTENT_VERSION =
  "IE-CONSULTATION-HUBS-2026-08-25" as const;

export function assertIrelandHubApplyAuthorized(input: Readonly<{
  apply: boolean;
  confirmation: string | undefined;
}>): void {
  if (input.apply && input.confirmation !== IRELAND_HUB_CONTENT_VERSION) {
    throw new Error(
      `Refusing to write. Re-run with --apply --confirm=${IRELAND_HUB_CONTENT_VERSION} after reviewing the dry-run.`,
    );
  }
}

export function assertIrelandHubPageWritable(page: Readonly<{
  pageKey: string;
  status: string;
  isActive: boolean;
}>): void {
  if (page.status !== "PUBLISHED" || !page.isActive) {
    throw new Error(
      `${page.pageKey} has status=${page.status} isActive=${page.isActive}; refusing to patch it.`,
    );
  }
}

export function buildOptimisticPageWhere(
  snapshot: Readonly<{ id: string; updatedAt: Date }>,
): {
  id: string;
  updatedAt: Date;
  status: "PUBLISHED";
  isActive: true;
} {
  return {
    id: snapshot.id,
    updatedAt: snapshot.updatedAt,
    status: "PUBLISHED",
    isActive: true,
  };
}

export function buildOptimisticTranslationWhere(
  snapshot: Readonly<{ id: string; updatedAt: Date }>,
): { id: string; updatedAt: Date } {
  return { id: snapshot.id, updatedAt: snapshot.updatedAt };
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeJson(item));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeJson(item)]),
    );
  }
  return value;
}

export function jsonValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizeJson(left)) === JSON.stringify(normalizeJson(right));
}
