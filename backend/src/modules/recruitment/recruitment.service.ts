import {
  JobApplicationStatus,
  JobListingStatus,
  Prisma,
  type JobListing,
} from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { isMediaStorageConfigured } from "../../services/object-storage.js";
import { sanitizeRichHtml } from "../../utils/sanitize-html.js";
import { OUTBOX_KIND_RECRUITMENT_APPLICATION_NOTIFICATION } from "../outbox/outbox.js";
import {
  addCalendarMonths,
  adminJobCreateBodySchema,
  type AdminJobInput,
  type AdminJobPatch,
  type ApplicationFields,
  isAllowedJobTransition,
} from "./recruitment.schema.js";

export class RecruitmentValidationError extends Error {}
export class RecruitmentNotReadyError extends Error {}
export class RecruitmentConflictError extends Error {}
export class JobClosedError extends Error {}

const publicJobSelect = {
  id: true,
  slug: true,
  title: true,
  department: true,
  location: true,
  workplaceMode: true,
  employmentType: true,
  minimumExperience: true,
  publishedAt: true,
  closesAt: true,
  updatedAt: true,
} satisfies Prisma.JobListingSelect;

const adminJobInclude = {
  country: { select: { id: true, code: true, name: true, slug: true } },
  _count: { select: { applications: true } },
} satisfies Prisma.JobListingInclude;

function publicOpenWhere(now = new Date()): Prisma.JobListingWhereInput {
  return {
    status: JobListingStatus.PUBLISHED,
    country: { isActive: true },
    OR: [{ closesAt: null }, { closesAt: { gt: now } }],
  };
}

function sanitizeDescription(input: string): string {
  const sanitized = sanitizeRichHtml(input) ?? "";
  if (!sanitized.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim()) {
    throw new RecruitmentValidationError("Job description must contain readable text");
  }
  return sanitized;
}

async function assertCountryLocale(countryId: string, locale: JobListing["locale"]): Promise<void> {
  const country = await prisma.country.findUnique({
    where: { id: countryId },
    select: { id: true, isActive: true, defaultLocale: true },
  });
  if (!country?.isActive) throw new RecruitmentValidationError("Country not found or inactive");
  if (country.defaultLocale === locale) return;
  const localeRow = await prisma.countryLocale.findUnique({
    where: { countryId_locale: { countryId, locale } },
    select: { id: true },
  });
  if (!localeRow) throw new RecruitmentValidationError("Locale is not enabled for this country");
}

function assertPublishReady(input: AdminJobInput, now: Date): void {
  if (input.status !== JobListingStatus.PUBLISHED) return;
  if (input.closesAt && input.closesAt <= now) {
    throw new RecruitmentValidationError("Closing time must be in the future when publishing");
  }
  if (!env.CLAMAV_HOST || !isMediaStorageConfigured()) {
    throw new RecruitmentNotReadyError("Recruitment intake is not configured");
  }
}

export async function listPublicJobs(countryCode: string, locale: JobListing["locale"]) {
  return prisma.jobListing.findMany({
    where: { ...publicOpenWhere(), country: { code: countryCode, isActive: true }, locale },
    select: publicJobSelect,
    orderBy: [{ department: "asc" }, { publishedAt: "desc" }, { title: "asc" }],
    take: 200,
  });
}

export async function getPublicJob(slug: string, countryCode: string, locale: JobListing["locale"]) {
  return prisma.jobListing.findFirst({
    where: { ...publicOpenWhere(), slug, country: { code: countryCode, isActive: true }, locale },
    select: { ...publicJobSelect, descriptionHtml: true },
  });
}

export async function getOpenJobById(id: string) {
  return prisma.jobListing.findFirst({ where: { ...publicOpenWhere(), id }, select: { id: true } });
}

export async function listAdminJobs(query: {
  countryId?: string;
  locale?: JobListing["locale"];
  status?: JobListingStatus;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const baseWhere: Prisma.JobListingWhereInput = {
    ...(query.countryId ? { countryId: query.countryId } : {}),
    ...(query.locale ? { locale: query.locale } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: "insensitive" } },
            { department: { contains: query.search, mode: "insensitive" } },
            { location: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const where = { ...baseWhere, ...(query.status ? { status: query.status } : {}) };
  const [total, items, counts] = await prisma.$transaction([
    prisma.jobListing.count({ where }),
    prisma.jobListing.findMany({
      where,
      include: adminJobInclude,
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.jobListing.groupBy({
      by: ["status"],
      where: baseWhere,
      orderBy: { status: "asc" },
      _count: { status: true },
    }),
  ]);
  const summary = { draft: 0, published: 0, archived: 0 };
  for (const row of counts) {
    const count = typeof row._count === "object" ? (row._count.status ?? 0) : 0;
    summary[row.status.toLowerCase() as keyof typeof summary] = count;
  }
  return {
    items,
    pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    summary,
  };
}

export function getAdminJob(id: string) {
  return prisma.jobListing.findUnique({ where: { id }, include: adminJobInclude });
}

export async function createAdminJob(input: AdminJobInput, actorUserId: string | null) {
  await assertCountryLocale(input.countryId, input.locale);
  const now = new Date();
  assertPublishReady(input, now);
  return prisma.jobListing.create({
    data: {
      ...input,
      minimumExperience: input.minimumExperience ?? null,
      closesAt: input.closesAt ?? null,
      descriptionHtml: sanitizeDescription(input.descriptionHtml),
      publishedAt: input.status === JobListingStatus.PUBLISHED ? now : null,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
    include: adminJobInclude,
  });
}

export async function updateAdminJob(id: string, patch: AdminJobPatch, actorUserId: string | null) {
  const existing = await prisma.jobListing.findUnique({ where: { id } });
  if (!existing) return null;
  const parsed = adminJobCreateBodySchema.safeParse({
    countryId: patch.countryId ?? existing.countryId,
    locale: patch.locale ?? existing.locale,
    slug: patch.slug ?? existing.slug,
    title: patch.title ?? existing.title,
    department: patch.department ?? existing.department,
    location: patch.location ?? existing.location,
    workplaceMode: patch.workplaceMode ?? existing.workplaceMode,
    employmentType: patch.employmentType ?? existing.employmentType,
    minimumExperience:
      patch.minimumExperience === undefined ? existing.minimumExperience : patch.minimumExperience,
    descriptionHtml: patch.descriptionHtml ?? existing.descriptionHtml,
    status: patch.status ?? existing.status,
    closesAt: patch.closesAt === undefined ? existing.closesAt : patch.closesAt,
  });
  if (!parsed.success) throw new RecruitmentValidationError(parsed.error.issues[0]?.message ?? "Invalid job");
  const target = parsed.data;
  if (!isAllowedJobTransition(existing.status, target.status)) {
    throw new RecruitmentValidationError("This job status transition is not allowed");
  }
  if (
    existing.publishedAt &&
    (target.countryId !== existing.countryId || target.locale !== existing.locale || target.slug !== existing.slug)
  ) {
    throw new RecruitmentValidationError("Country, locale, and slug cannot change after publication");
  }
  await assertCountryLocale(target.countryId, target.locale);
  const now = new Date();
  if (!existing.publishedAt && target.status === JobListingStatus.PUBLISHED) assertPublishReady(target, now);
  const updatedAt = new Date(Math.max(now.getTime(), existing.updatedAt.getTime() + 1));
  const data = {
    ...target,
    minimumExperience: target.minimumExperience ?? null,
    closesAt: target.closesAt ?? null,
    descriptionHtml: sanitizeDescription(target.descriptionHtml),
    publishedAt:
      !existing.publishedAt && target.status === JobListingStatus.PUBLISHED ? now : existing.publishedAt,
    updatedByUserId: actorUserId,
    updatedAt,
  };
  return prisma.$transaction(async (tx) => {
    const updated = await tx.jobListing.updateMany({
      where: { id, updatedAt: existing.updatedAt, status: existing.status },
      data,
    });
    if (updated.count !== 1) {
      throw new RecruitmentConflictError("This job changed while you were editing");
    }
    const job = await tx.jobListing.findUnique({ where: { id }, include: adminJobInclude });
    if (!job) throw new RecruitmentConflictError("This job changed while you were editing");
    return job;
  });
}

export async function createApplicationAfterUpload(args: {
  jobId: string;
  fields: ApplicationFields;
  cvStorageKey: string;
  cvByteSize: number;
  now?: Date;
}) {
  const now = args.now ?? new Date();
  return prisma.$transaction(async (tx) => {
    const job = await tx.jobListing.findFirst({
      where: { ...publicOpenWhere(now), id: args.jobId },
      select: { id: true },
    });
    if (!job) throw new JobClosedError("Job is no longer open");
    const application = await tx.jobApplication.create({
      data: {
        jobListingId: job.id,
        fullName: args.fields.fullName,
        email: args.fields.email,
        phone: args.fields.phone ?? null,
        message: args.fields.message ?? null,
        privacyAcknowledgedAt: now,
        privacyNoticeVersion: env.RECRUITMENT_PRIVACY_NOTICE_VERSION,
        cvStorageKey: args.cvStorageKey,
        cvByteSize: args.cvByteSize,
        cvScannedAt: now,
        submittedAt: now,
        retentionUntil: addCalendarMonths(now, env.RECRUITMENT_RETENTION_MONTHS),
      },
      select: { id: true },
    });
    await tx.outbox.create({
      data: {
        kind: OUTBOX_KIND_RECRUITMENT_APPLICATION_NOTIFICATION,
        idempotencyKey: `${OUTBOX_KIND_RECRUITMENT_APPLICATION_NOTIFICATION}:${application.id}`,
        payload: { applicationId: application.id },
      },
    });
    await tx.auditLog.create({
      data: {
        actorRole: "PUBLIC",
        action: "JOB_APPLICATION_RECEIVED",
        entityType: "JobApplication",
        entityId: application.id,
        metadata: { jobListingId: job.id },
      },
    });
    return application;
  });
}

export async function listAdminApplications(query: {
  countryId?: string;
  jobId?: string;
  status?: JobApplicationStatus;
  submittedFrom?: Date;
  submittedTo?: Date;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.JobApplicationWhereInput = {
    ...(query.jobId ? { jobListingId: query.jobId } : {}),
    ...(query.countryId ? { jobListing: { countryId: query.countryId } } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.submittedFrom || query.submittedTo
      ? { submittedAt: { ...(query.submittedFrom ? { gte: query.submittedFrom } : {}), ...(query.submittedTo ? { lt: query.submittedTo } : {}) } }
      : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.jobApplication.count({ where }),
    prisma.jobApplication.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        retentionUntil: true,
        jobListing: { select: { id: true, title: true, country: { select: { id: true, code: true, name: true } } } },
      },
      orderBy: { submittedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { items, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
}

export function getAdminApplication(id: string) {
  return prisma.jobApplication.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      message: true,
      status: true,
      privacyAcknowledgedAt: true,
      privacyNoticeVersion: true,
      cvByteSize: true,
      cvScannedAt: true,
      submittedAt: true,
      reviewedAt: true,
      retentionUntil: true,
      jobListing: { select: { id: true, title: true, slug: true, country: { select: { id: true, code: true, name: true } } } },
    },
  });
}

export function getApplicationForCv(id: string) {
  return prisma.jobApplication.findUnique({
    where: { id },
    select: { id: true, cvStorageKey: true, jobListing: { select: { id: true, slug: true } } },
  });
}

export async function setApplicationStatus(
  id: string,
  status: JobApplicationStatus,
  audit: { actorUserId: string | null; actorRole: string },
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.jobApplication.findUnique({
      where: { id },
      select: { id: true, status: true, reviewedAt: true },
    });
    if (!existing) return null;
    if (existing.status === status) return existing;
    const application = await tx.jobApplication.update({
      where: { id },
      data: { status, reviewedAt: status === JobApplicationStatus.REVIEWED ? new Date() : null },
      select: { id: true, status: true, reviewedAt: true },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: audit.actorUserId,
        actorRole: audit.actorRole,
        action: "JOB_APPLICATION_STATUS_CHANGED",
        entityType: "JobApplication",
        entityId: id,
        metadata: { previousStatus: existing.status, newStatus: status },
      },
    });
    return application;
  });
}

export async function purgeApplicationRow(
  id: string,
  reason: string,
  audit: { actorUserId: string | null; actorRole: string },
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const deleted = await tx.jobApplication.deleteMany({ where: { id } });
    if (deleted.count !== 1) return false;
    await tx.auditLog.create({
      data: {
        actorUserId: audit.actorUserId,
        actorRole: audit.actorRole,
        action: "JOB_APPLICATION_PURGED",
        entityType: "JobApplication",
        entityId: id,
        metadata: { reason },
      },
    });
    return true;
  });
}
