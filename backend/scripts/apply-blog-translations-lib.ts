export type RawDraft = {
  key?: string;
  entity?: string;
  parentId?: string;
  slug?: string;
  field?: string;
  targetLocale?: string;
  draftText?: string;
  sourceText?: string;
  requiresHumanReview?: boolean;
  validationIssues?: string[];
};

export type Draft = {
  parentId: string;
  slug: string;
  field: "title" | "excerpt" | "body" | "seoTitle" | "seoDescription" | "coverAlt";
  targetLocale: string;
  draftText: string;
  sourceText: string;
  requiresHumanReview: boolean;
  validationIssues: string[];
};

export const FIELD_TO_COLUMN: Record<Draft["field"], string> = {
  title: "title",
  excerpt: "excerpt",
  body: "content",
  seoTitle: "seoTitle",
  seoDescription: "seoDesc",
  coverAlt: "coverImageAlt",
};

const ALLOWED_FIELDS = new Set(Object.keys(FIELD_TO_COLUMN));

export type Group = {
  postId: string;
  slug: string;
  targetLocale: string;
  fields: Map<string, Draft>;
};

export type SourcePost = {
  id: string;
  status: string;
  isActive: boolean;
  title: string;
  excerpt: string | null;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  coverAsset: { altText: string | null } | null;
};

export type ExistingTranslation = Record<string, unknown>;

export type GroupPlan = {
  status: "ready" | "no-op" | "orphan" | "inactive" | "stale" | "missing-title";
  applied: Record<string, string>;
  skippedExisting: number;
  skippedFlagged: number;
  staleFields: number;
  reviewFields: number;
};

export function isMeaningful(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim().length > 0;
}

export function normalize(raw: RawDraft, sourceFile: string): Draft | null {
  if (raw.entity !== "blog" || !raw.parentId || !raw.field || !raw.targetLocale || typeof raw.draftText !== "string") {
    return null;
  }
  if (!ALLOWED_FIELDS.has(raw.field)) {
    console.warn(`SKIP unknown blog field "${raw.field}" (${sourceFile})`);
    return null;
  }
  if (typeof raw.sourceText !== "string") {
    throw new Error(`Blog draft is missing sourceText (${sourceFile}, post=${raw.parentId}, field=${raw.field})`);
  }
  return {
    parentId: raw.parentId,
    slug: raw.slug ?? raw.parentId,
    field: raw.field as Draft["field"],
    targetLocale: raw.targetLocale,
    draftText: raw.draftText,
    sourceText: raw.sourceText,
    requiresHumanReview: raw.requiresHumanReview === true,
    validationIssues: raw.validationIssues ?? [],
  };
}

export function groupDrafts(drafts: Draft[]): Map<string, Group> {
  const groups = new Map<string, Group>();
  for (const draft of drafts) {
    const key = `${draft.parentId}:${draft.targetLocale}`;
    const existing = groups.get(key);
    const group = existing ?? {
      postId: draft.parentId,
      slug: draft.slug,
      targetLocale: draft.targetLocale,
      fields: new Map<string, Draft>(),
    };
    const existingField = group.fields.get(draft.field);
    if (existingField && !sameDraft(existingField, draft)) {
      throw new Error(
        `Conflicting blog drafts for post=${draft.parentId} locale=${draft.targetLocale} field=${draft.field}. Refusing to guess which draft to apply.`,
      );
    }
    group.fields.set(draft.field, draft);
    if (!existing) groups.set(key, group);
  }
  return groups;
}

function sameDraft(left: Draft, right: Draft): boolean {
  if (
    left.parentId !== right.parentId ||
    left.slug !== right.slug ||
    left.field !== right.field ||
    left.targetLocale !== right.targetLocale ||
    left.draftText !== right.draftText ||
    left.sourceText !== right.sourceText ||
    left.requiresHumanReview !== right.requiresHumanReview
  ) {
    return false;
  }
  if (left.validationIssues.length !== right.validationIssues.length) return false;
  return left.validationIssues.every((issue, index) => issue === right.validationIssues[index]);
}

function currentSourceValue(post: SourcePost, field: Draft["field"]): string | null {
  if (field === "coverAlt") return post.coverAsset?.altText ?? null;
  if (field === "seoDescription") return post.seoDescription;
  return post[field];
}

export function planGroup(
  group: Group,
  post: SourcePost | undefined,
  existingRow: ExistingTranslation | undefined,
  includeFlagged: boolean,
  allowDraftSource = false,
): GroupPlan {
  const empty = {
    applied: {},
    skippedExisting: 0,
    skippedFlagged: 0,
    staleFields: 0,
    reviewFields: 0,
  };
  if (!post) return { status: "orphan", ...empty };
  const allowedStatus = post.status === "PUBLISHED" || (allowDraftSource && post.status === "DRAFT");
  if (!allowedStatus || !post.isActive) return { status: "inactive", ...empty };

  const candidates: Draft[] = [];
  let skippedExisting = 0;
  let skippedFlagged = 0;
  for (const draft of group.fields.values()) {
    if (draft.validationIssues.length > 0 && !includeFlagged) {
      skippedFlagged++;
      continue;
    }
    const existingValue = existingRow?.[FIELD_TO_COLUMN[draft.field]] as string | null | undefined;
    if (isMeaningful(existingValue)) {
      skippedExisting++;
      continue;
    }
    candidates.push(draft);
  }

  const staleFields = candidates.filter((draft) => currentSourceValue(post, draft.field) !== draft.sourceText).length;
  if (staleFields > 0) {
    return { status: "stale", ...empty, skippedExisting, skippedFlagged, staleFields };
  }

  const applied = Object.fromEntries(candidates.map((draft) => [FIELD_TO_COLUMN[draft.field], draft.draftText]));
  const reviewFields = candidates.filter((draft) => draft.requiresHumanReview).length;
  if (Object.keys(applied).length === 0) {
    return { status: "no-op", ...empty, skippedExisting, skippedFlagged };
  }
  if (!existingRow && !applied.title) {
    return { status: "missing-title", ...empty, skippedExisting, skippedFlagged };
  }
  return { status: "ready", applied, skippedExisting, skippedFlagged, staleFields: 0, reviewFields };
}

export function assertApplySafe(input: {
  dryRun: boolean;
  approveHumanReview: boolean;
  staleGroups: number;
  inactiveGroups: number;
  reviewFields: number;
}): void {
  if (input.dryRun) return;
  if (input.staleGroups > 0 || input.inactiveGroups > 0) {
    throw new Error(
      `Refusing to apply: stale or inactive source groups failed preflight (stale=${input.staleGroups}, inactive/unpublished=${input.inactiveGroups}). No writes were made.`,
    );
  }
  if (input.reviewFields > 0 && !input.approveHumanReview) {
    throw new Error(
      `Refusing to apply ${input.reviewFields} field(s) marked requiresHumanReview without --approve-human-review. No writes were made.`,
    );
  }
}

export function slugCandidate(base: string, suffix = 1): string {
  const resolvedBase = base || "post";
  return suffix === 1 ? resolvedBase : `${resolvedBase}-${suffix}`;
}
