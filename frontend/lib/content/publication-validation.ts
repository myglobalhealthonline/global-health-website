import type { AdminDoctorDto, AdminServiceDto, AdminBlogPostDto, AdminContentPageDto } from "@/lib/admin/admin-api";
import type { PublicDoctorRecord } from "@/lib/content/get-public-doctors";
import type { PublicServiceRecord } from "@/lib/content/get-public-services";

const BLOCKED_PATTERNS = [
  /\bTODO\b/i,
  /\bplaceholder\b/i,
  /\bmigration\b/i,
  /\badapter\b/i,
  /\btemplate-driven\b/i,
  /\badmin-managed\b/i,
  /\bfuture-managed\b/i,
  /\bseeded\b/i,
  /\bfallback\b/i,
  /\bmock\b/i,
  /\bpending\b/i,
  /\blegacy compatibility\b/i,
];

function hasBlockedCopy(value: string | null | undefined) {
  if (!value) return false;
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(value));
}

function hasAnyBlockedCopy(values: Array<string | null | undefined>) {
  return values.some((value) => hasBlockedCopy(value));
}

type PublicationIssue = {
  field: string;
  message: string;
  severity: "error" | "warning";
};

type PublicationValidationResult = {
  ready: boolean;
  shouldNoindex: boolean;
  requiresEditorialReview: boolean;
  issues: PublicationIssue[];
};

function buildResult(issues: PublicationIssue[]): PublicationValidationResult {
  const hasError = issues.some((issue) => issue.severity === "error");
  return {
    ready: !hasError,
    shouldNoindex: hasError,
    requiresEditorialReview: issues.length > 0,
    issues,
  };
}

export function validatePublicServiceRecord(service: Pick<PublicServiceRecord, "kind" | "name" | "summary" | "heroTitle" | "heroDescription" | "detailBody" | "durationMinutes" | "basePriceCents" | "currencyCode">): PublicationValidationResult {
  const issues: PublicationIssue[] = [];
  const title = service.heroTitle ?? service.name;
  const description = service.heroDescription ?? service.summary;
  const body = service.detailBody ?? service.summary;

  if (!title || title.trim().length < 10) {
    issues.push({ field: "heroTitle", message: "Missing specific public title.", severity: "error" });
  }
  if (!description || description.trim().length < 30) {
    issues.push({ field: "heroDescription", message: "Missing specific service description.", severity: "error" });
  }
  if (!body || body.trim().length < 120) {
    issues.push({ field: "detailBody", message: "Missing detailed clinical service body.", severity: "error" });
  }
  if (service.durationMinutes == null) {
    issues.push({ field: "durationMinutes", message: "Missing service duration.", severity: "error" });
  }
  if (service.basePriceCents == null || !service.currencyCode) {
    issues.push({ field: "pricing", message: "Missing public starting price or currency.", severity: "error" });
  }
  if (!body || !/emergency|urgent|severe|chest pain|breathing/i.test(body)) {
    issues.push({ field: "emergency", message: "Missing emergency or urgent-care warning.", severity: "error" });
  }
  if (!body || !/online|in-person|cannot be handled|not suitable/i.test(body)) {
    issues.push({ field: "limitations", message: "Missing online-care limitations.", severity: "error" });
  }
  if ((service.kind === "GENERAL" || service.kind === "SPECIALIST" || service.kind === "PRESCRIPTION") && (!body || !/prescription|referral|certificate|sick note|clinically appropriate/i.test(body))) {
    issues.push({ field: "boundaries", message: "Missing prescription, referral, or certificate boundary language.", severity: "error" });
  }
  if (hasAnyBlockedCopy([title, description, body])) {
    issues.push({ field: "copy", message: "Contains blocked internal or placeholder language.", severity: "error" });
  }

  return buildResult(issues);
}

export function validatePublicDoctorRecord(doctor: Pick<PublicDoctorRecord, "fullName" | "title" | "bio" | "languages" | "specialties" | "imcRegistration" | "medicalRegistrationUrl" | "qualifications"> & { qualifications?: string[] }): PublicationValidationResult {
  const issues: PublicationIssue[] = [];

  if (!doctor.fullName.trim()) {
    issues.push({ field: "fullName", message: "Missing doctor name.", severity: "error" });
  }
  if (!doctor.title.trim()) {
    issues.push({ field: "title", message: "Missing doctor title.", severity: "error" });
  }
  if (!doctor.bio || doctor.bio.trim().length < 120) {
    issues.push({ field: "bio", message: "Missing detailed public doctor bio.", severity: "error" });
  }
  if (!doctor.imcRegistration && !doctor.medicalRegistrationUrl) {
    issues.push({ field: "credentials", message: "Missing registration number or verification URL.", severity: "error" });
  }
  if (!doctor.languages || doctor.languages.length === 0) {
    issues.push({ field: "languages", message: "Missing doctor languages.", severity: "warning" });
  }
  if (!doctor.specialties || doctor.specialties.length === 0) {
    issues.push({ field: "specialties", message: "Missing doctor specialties.", severity: "warning" });
  }
  if (hasAnyBlockedCopy([doctor.bio, doctor.title, ...(doctor.qualifications ?? [])])) {
    issues.push({ field: "copy", message: "Contains blocked internal or placeholder language.", severity: "error" });
  }

  return buildResult(issues);
}

export function validateAdminServicePayload(service: Pick<AdminServiceDto, "kind" | "name" | "summary" | "heroTitle" | "heroDescription" | "detailBody" | "durationMinutes" | "basePriceCents" | "currencyCode" | "isActive">): PublicationValidationResult {
  return validatePublicServiceRecord({
    kind: service.kind,
    name: service.name,
    summary: service.summary,
    heroTitle: service.heroTitle,
    heroDescription: service.heroDescription,
    detailBody: service.detailBody,
    durationMinutes: service.durationMinutes,
    basePriceCents: service.basePriceCents,
    currencyCode: service.currencyCode,
  });
}

export function validateAdminDoctorPayload(doctor: Pick<AdminDoctorDto, "fullName" | "title" | "bio" | "languages" | "imcRegistration" | "medicalRegistrationUrl" | "qualifications"> & { specialties: string[] }): PublicationValidationResult {
  return validatePublicDoctorRecord({
    fullName: doctor.fullName,
    title: doctor.title,
    bio: doctor.bio,
    languages: doctor.languages,
    specialties: doctor.specialties,
    imcRegistration: doctor.imcRegistration ?? undefined,
    medicalRegistrationUrl: doctor.medicalRegistrationUrl ?? undefined,
    qualifications: doctor.qualifications,
  });
}

export function validateAdminBlogPayload(post: {
  title: string;
  excerpt: string | null;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  authorDisplayName: string | null;
  updatedAt: string | null;
  category: string | null;
  status: "DRAFT" | "PUBLISHED";
}): PublicationValidationResult {
  const issues: PublicationIssue[] = [];
  if (!post.title.trim()) issues.push({ field: "title", message: "Missing title.", severity: "error" });
  if (!post.excerpt || post.excerpt.trim().length < 30) issues.push({ field: "excerpt", message: "Missing excerpt.", severity: "error" });
  if (!post.body.trim() || post.body.trim().length < 250) issues.push({ field: "body", message: "Missing full article body.", severity: "error" });
  if (!post.authorDisplayName?.trim()) issues.push({ field: "authorDisplayName", message: "Missing author name.", severity: "error" });
  if (!post.category?.trim()) issues.push({ field: "category", message: "Missing category.", severity: "error" });
  if (!post.seoTitle?.trim()) issues.push({ field: "seoTitle", message: "Missing SEO title.", severity: "error" });
  if (!post.seoDescription?.trim()) issues.push({ field: "seoDescription", message: "Missing SEO description.", severity: "error" });
  if (!post.updatedAt?.trim()) issues.push({ field: "updatedAt", message: "Missing review or update date.", severity: "error" });
  if (hasAnyBlockedCopy([post.title, post.excerpt, post.body, post.seoTitle, post.seoDescription])) {
    issues.push({ field: "copy", message: "Contains blocked internal or placeholder language.", severity: "error" });
  }
  return buildResult(issues);
}

export function validateAdminContentPagePayload(page: {
  title: string;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  lastReviewedAt: string | null;
  status: "DRAFT" | "PUBLISHED";
}): PublicationValidationResult {
  const issues: PublicationIssue[] = [];
  if (!page.title.trim()) issues.push({ field: "title", message: "Missing title.", severity: "error" });
  if (!page.body.trim() || page.body.trim().length < 120) issues.push({ field: "body", message: "Missing complete page body.", severity: "error" });
  if (!page.seoTitle?.trim()) issues.push({ field: "seoTitle", message: "Missing SEO title.", severity: "error" });
  if (!page.seoDescription?.trim()) issues.push({ field: "seoDescription", message: "Missing SEO description.", severity: "error" });
  if (!page.lastReviewedAt?.trim()) issues.push({ field: "lastReviewedAt", message: "Missing review date.", severity: "error" });
  if (hasAnyBlockedCopy([page.title, page.body, page.seoTitle, page.seoDescription])) {
    issues.push({ field: "copy", message: "Contains blocked internal or placeholder language.", severity: "error" });
  }
  return buildResult(issues);
}

export function detectDuplicateTextIssues(
  current: { id?: string; title?: string | null; description?: string | null },
  existing: Array<{ id?: string; title?: string | null; description?: string | null }>,
): PublicationIssue[] {
  const normalizedTitle = current.title?.trim().toLowerCase();
  const normalizedDescription = current.description?.trim().toLowerCase();
  const issues: PublicationIssue[] = [];

  if (normalizedTitle) {
    const titleDuplicate = existing.find(
      (item) => item.id !== current.id && item.title?.trim().toLowerCase() === normalizedTitle,
    );
    if (titleDuplicate) {
      issues.push({ field: "title", message: "Duplicate title detected.", severity: "error" });
    }
  }

  if (normalizedDescription) {
    const descriptionDuplicate = existing.find(
      (item) => item.id !== current.id && item.description?.trim().toLowerCase() === normalizedDescription,
    );
    if (descriptionDuplicate) {
      issues.push({ field: "description", message: "Duplicate description detected.", severity: "error" });
    }
  }

  return issues;
}
