import {
  JobApplicationStatus,
  JobListingStatus,
  LocaleCode,
  Prisma,
  type JobListing,
} from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { isMediaStorageConfigured } from "../../services/object-storage.js";
import { sanitizeCareerHtml } from "../../utils/sanitize-html.js";
import { OUTBOX_KIND_RECRUITMENT_APPLICATION_NOTIFICATION } from "../outbox/outbox.js";
import {
  addCalendarMonths,
  type AdminJobGroupInput,
  type AdminJobGroupPatch,
  type ApplicationFields,
  isAllowedJobTransition,
} from "./recruitment.schema.js";

export class RecruitmentValidationError extends Error {}
export class RecruitmentNotReadyError extends Error {}
export class RecruitmentConflictError extends Error {}
export class JobClosedError extends Error {}

const publicJobSelect = {
  id: true,
  locale: true,
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

function localeRank(locale: JobListing["locale"], requested: JobListing["locale"], fallback: JobListing["locale"]): number {
  if (locale === requested) return 0;
  if (locale === fallback) return 1;
  return 2;
}

function selectPreferredPublicJobs<T extends { slug: string; locale: JobListing["locale"] }>(
  jobs: T[],
  requested: JobListing["locale"],
  fallback: JobListing["locale"],
): T[] {
  const selected = new Map<string, T>();
  for (const job of jobs) {
    const current = selected.get(job.slug);
    const jobRank = localeRank(job.locale, requested, fallback);
    const currentRank = current ? localeRank(current.locale, requested, fallback) : Number.POSITIVE_INFINITY;
    if (!current || jobRank < currentRank || (jobRank === currentRank && job.locale.localeCompare(current.locale) < 0)) {
      selected.set(job.slug, job);
    }
  }
  return [...selected.values()];
}

function getActivePublicCountry(countryCode: string) {
  return prisma.country.findUnique({
    where: { code: countryCode },
    select: { id: true, isActive: true, defaultLocale: true },
  });
}

const adminJobInclude = {
  country: { select: { id: true, code: true, name: true, slug: true, defaultLocale: true } },
  _count: { select: { applications: true } },
} satisfies Prisma.JobListingInclude;

const adminJobListSelect = {
  id: true,
  countryId: true,
  locale: true,
  slug: true,
  title: true,
  department: true,
  location: true,
  workplaceMode: true,
  status: true,
  closesAt: true,
  updatedAt: true,
  country: { select: { id: true, code: true, name: true, slug: true, defaultLocale: true } },
  _count: { select: { applications: true } },
} satisfies Prisma.JobListingSelect;

const adminJobLocalizationSelect = {
  id: true,
  locale: true,
  title: true,
  department: true,
  location: true,
  employmentType: true,
  minimumExperience: true,
  descriptionHtml: true,
  status: true,
  publishedAt: true,
  updatedAt: true,
} satisfies Prisma.JobListingSelect;

function publicOpenWhere(now = new Date()): Prisma.JobListingWhereInput {
  return {
    status: JobListingStatus.PUBLISHED,
    country: { isActive: true },
    OR: [{ closesAt: null }, { closesAt: { gt: now } }],
  };
}

function sanitizeDescription(input: string): string {
  const sanitized = sanitizeCareerHtml(input) ?? "";
  if (!sanitized.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim()) {
    throw new RecruitmentValidationError("Job description must contain readable text");
  }
  return sanitized;
}

function assertPublishSettings(
  status: JobListingStatus,
  closesAt: Date | null | undefined,
  now: Date,
): void {
  if (status !== JobListingStatus.PUBLISHED) return;
  if (closesAt && closesAt <= now) {
    throw new RecruitmentValidationError("Closing time must be in the future when publishing");
  }
  if (!env.CLAMAV_HOST || !isMediaStorageConfigured()) {
    throw new RecruitmentNotReadyError("Recruitment intake is not configured");
  }
}

async function getAdminCountryLocales(countryId: string) {
  const country = await prisma.country.findUnique({
    where: { id: countryId },
    select: {
      id: true,
      isActive: true,
      defaultLocale: true,
      countryLocales: { select: { locale: true } },
    },
  });
  if (!country?.isActive) throw new RecruitmentValidationError("Country not found or inactive");
  return {
    defaultLocale: country.defaultLocale,
    locales: new Set([country.defaultLocale, ...country.countryLocales.map(({ locale }) => locale)]),
  };
}

export async function listPublicJobs(countryCode: string, locale: JobListing["locale"]) {
  const country = await getActivePublicCountry(countryCode);
  if (!country?.isActive) return [];
  const localePriority = [locale, country.defaultLocale, ...Object.values(LocaleCode)]
    .filter((candidate, index, values) => values.indexOf(candidate) === index);
  const jobs: Prisma.JobListingGetPayload<{ select: typeof publicJobSelect }>[] = [];
  for (const candidateLocale of localePriority) {
    if (jobs.length === 200) break;
    const excludedSlugs = jobs.map((job) => job.slug);
    jobs.push(...await prisma.jobListing.findMany({
      where: {
        ...publicOpenWhere(),
        countryId: country.id,
        locale: candidateLocale,
        ...(excludedSlugs.length ? { slug: { notIn: excludedSlugs } } : {}),
      },
      select: publicJobSelect,
      orderBy: [{ department: "asc" }, { publishedAt: "desc" }, { title: "asc" }],
      take: 200 - jobs.length,
    }));
  }
  return jobs
    .sort((left, right) => left.department.localeCompare(right.department) ||
      (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0) ||
      left.title.localeCompare(right.title))
    .slice(0, 200);
}

export async function getPublicJob(slug: string, countryCode: string, locale: JobListing["locale"]) {
  const country = await getActivePublicCountry(countryCode);
  if (!country?.isActive) return null;
  const jobs = await prisma.jobListing.findMany({
    where: { ...publicOpenWhere(), countryId: country.id, slug },
    select: { ...publicJobSelect, descriptionHtml: true },
    orderBy: [{ publishedAt: "desc" }, { locale: "asc" }],
    take: 20,
  });
  return selectPreferredPublicJobs(jobs, locale, country.defaultLocale)[0] ?? null;
}

export async function getOpenJobById(id: string) {
  return prisma.jobListing.findFirst({ where: { ...publicOpenWhere(), id }, select: { id: true } });
}

type AdminJobsQuery = {
  countryId?: string;
  locale?: JobListing["locale"];
  status?: JobListingStatus;
  search?: string;
  page: number;
  pageSize: number;
};

function adminJobsSqlWhere(query: AdminJobsQuery, includeStatus: boolean) {
  const conditions = [
    query.countryId ? Prisma.sql`"countryId" = ${query.countryId}` : null,
    query.locale ? Prisma.sql`"locale" = CAST(${query.locale} AS "LocaleCode")` : null,
    query.search ? Prisma.sql`(
      "title" ILIKE ${`%${query.search}%`} OR
      "department" ILIKE ${`%${query.search}%`} OR
      "location" ILIKE ${`%${query.search}%`}
    )` : null,
    includeStatus && query.status
      ? Prisma.sql`"status" = CAST(${query.status} AS "JobListingStatus")`
      : null,
  ].filter((condition): condition is Prisma.Sql => condition !== null);
  return conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
}

export async function listAdminJobs(query: AdminJobsQuery) {
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
  const skip = (query.page - 1) * query.pageSize;
  const [pageGroups, countRows] = await prisma.$transaction([
    prisma.jobListing.groupBy({
      by: ["countryId", "slug"],
      where,
      _max: { updatedAt: true },
      orderBy: [{ _max: { updatedAt: "desc" } }, { countryId: "asc" }, { slug: "asc" }],
      skip,
      take: query.pageSize,
    }),
    prisma.$queryRaw<Array<{ total: number; draft: number; published: number; archived: number }>>(Prisma.sql`
      WITH matching AS (
        SELECT DISTINCT "countryId", "slug"
        FROM "JobListing"
        ${adminJobsSqlWhere(query, true)}
      ), summary_groups AS (
        SELECT "countryId", "slug", MIN("status"::text) AS "status"
        FROM "JobListing"
        ${adminJobsSqlWhere(query, false)}
        GROUP BY "countryId", "slug"
      )
      SELECT
        (SELECT COUNT(*)::int FROM matching) AS "total",
        COUNT(*) FILTER (WHERE "status" = 'DRAFT')::int AS "draft",
        COUNT(*) FILTER (WHERE "status" = 'PUBLISHED')::int AS "published",
        COUNT(*) FILTER (WHERE "status" = 'ARCHIVED')::int AS "archived"
      FROM summary_groups
    `),
  ]);
  const pageOrder = new Map(pageGroups.map((group, index) => [`${group.countryId}:${group.slug}`, index]));
  const pageRows = pageGroups.length ? await prisma.jobListing.findMany({
    where: { OR: pageGroups.map(({ countryId, slug }) => ({ countryId, slug })) },
    select: adminJobListSelect,
  }) : [];

  function groupRows(rows: typeof pageRows) {
    const groups = new Map<string, typeof pageRows>();
    for (const row of rows) {
      const key = `${row.countryId}:${row.slug}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups.values()].map((group) => {
      const search = query.search?.toLowerCase();
      const canonical = (query.locale ? group.find(({ locale }) => locale === query.locale) : undefined) ??
        (search ? group.find((row) => [row.title, row.department, row.location]
          .some((value) => value.toLowerCase().includes(search))) : undefined) ??
        group.find(({ locale, country }) => locale === country.defaultLocale) ?? group[0];
      return {
        ...canonical,
        _count: { applications: group.reduce((total, row) => total + row._count.applications, 0) },
      };
    }).sort((left, right) =>
      (pageOrder.get(`${left.countryId}:${left.slug}`) ?? 0) -
      (pageOrder.get(`${right.countryId}:${right.slug}`) ?? 0));
  }

  const counts = countRows[0] ?? { total: 0, draft: 0, published: 0, archived: 0 };
  return {
    items: groupRows(pageRows),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total: counts.total,
      totalPages: Math.ceil(counts.total / query.pageSize),
    },
    summary: { draft: counts.draft, published: counts.published, archived: counts.archived },
  };
}

export function getAdminJob(id: string) {
  return prisma.jobListing.findUnique({ where: { id }, include: adminJobInclude });
}

export async function getAdminJobGroup(id: string) {
  const job = await getAdminJob(id);
  if (!job) return null;
  const localizations = await prisma.jobListing.findMany({
    where: { countryId: job.countryId, slug: job.slug },
    select: adminJobLocalizationSelect,
    orderBy: { locale: "asc" },
  });
  return { ...job, localizations };
}

export async function createAdminJobGroup(input: AdminJobGroupInput, actorUserId: string | null) {
  const country = await getAdminCountryLocales(input.countryId);
  const submittedLocales = new Set(input.localizations.map(({ locale }) => locale));
  if (!submittedLocales.has(country.defaultLocale)) {
    throw new RecruitmentValidationError("The country default locale is required");
  }
  for (const locale of submittedLocales) {
    if (!country.locales.has(locale)) {
      throw new RecruitmentValidationError("Locale is not enabled for this country");
    }
  }
  const now = new Date();
  assertPublishSettings(input.status, input.closesAt, now);
  return prisma.$transaction(async (tx) => {
    const jobs = [];
    for (const localization of input.localizations) {
      jobs.push(await tx.jobListing.create({
        data: {
          countryId: input.countryId,
          slug: input.slug,
          workplaceMode: input.workplaceMode,
          status: input.status,
          closesAt: input.closesAt ?? null,
          publishedAt: input.status === JobListingStatus.PUBLISHED ? now : null,
          ...localization,
          minimumExperience: localization.minimumExperience ?? null,
          descriptionHtml: sanitizeDescription(localization.descriptionHtml),
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
        },
        include: adminJobInclude,
      }));
    }
    const canonical = jobs.find(({ locale }) => locale === country.defaultLocale) ?? jobs[0];
    if (!canonical) throw new RecruitmentConflictError("Could not create job localizations");
    return {
      ...canonical,
      localizations: jobs.map((job) => ({
        id: job.id,
        locale: job.locale,
        title: job.title,
        department: job.department,
        location: job.location,
        employmentType: job.employmentType,
        minimumExperience: job.minimumExperience,
        descriptionHtml: job.descriptionHtml,
        status: job.status,
        publishedAt: job.publishedAt,
        updatedAt: job.updatedAt,
      })),
    };
  });
}

export async function updateAdminJobGroup(id: string, patch: AdminJobGroupPatch, actorUserId: string | null) {
  const anchor = await prisma.jobListing.findUnique({ where: { id } });
  if (!anchor) return null;
  const siblings = await prisma.jobListing.findMany({
    where: { countryId: anchor.countryId, slug: anchor.slug },
    orderBy: { locale: "asc" },
  });
  if (!siblings.length) return null;

  const countryId = patch.countryId ?? anchor.countryId;
  const slug = patch.slug ?? anchor.slug;
  const workplaceMode = patch.workplaceMode ?? anchor.workplaceMode;
  const status = patch.status ?? anchor.status;
  const closesAt = patch.closesAt === undefined ? anchor.closesAt : patch.closesAt;
  if (
    siblings.some(({ publishedAt }) => publishedAt) &&
    (countryId !== anchor.countryId || slug !== anchor.slug)
  ) {
    throw new RecruitmentValidationError("Country and slug cannot change after publication");
  }
  for (const sibling of siblings) {
    if (!isAllowedJobTransition(sibling.status, status)) {
      throw new RecruitmentValidationError("This job status transition is not allowed");
    }
  }

  let defaultLocale = anchor.locale;
  if (patch.localizations || countryId !== anchor.countryId || slug !== anchor.slug) {
    const country = await getAdminCountryLocales(countryId);
    defaultLocale = country.defaultLocale;
    const existingLocales = new Set(siblings.map(({ locale }) => locale));
    const effectiveLocales = new Set([
      ...siblings.map(({ locale }) => locale),
      ...(patch.localizations?.map(({ locale }) => locale) ?? []),
    ]);
    if (!effectiveLocales.has(country.defaultLocale)) {
      throw new RecruitmentValidationError("The country default locale is required");
    }
    for (const locale of effectiveLocales) {
      const existingLocale = countryId === anchor.countryId && existingLocales.has(locale);
      if (!existingLocale && !country.locales.has(locale)) {
        throw new RecruitmentValidationError("Locale is not enabled for this country");
      }
    }
  }

  const now = new Date();
  if (status === JobListingStatus.PUBLISHED && siblings.some(({ publishedAt }) => !publishedAt)) {
    assertPublishSettings(status, closesAt, now);
  }
  const publishedAt = siblings.find((job) => job.publishedAt)?.publishedAt ??
    (status === JobListingStatus.PUBLISHED ? now : null);
  const localizationByLocale = new Map(
    patch.localizations?.map((localization) => [localization.locale, localization]) ?? [],
  );

  return prisma.$transaction(async (tx) => {
    for (const sibling of siblings) {
      const localization = localizationByLocale.get(sibling.locale);
      const updatedAt = new Date(Math.max(now.getTime(), sibling.updatedAt.getTime() + 1));
      const updated = await tx.jobListing.updateMany({
        where: { id: sibling.id, updatedAt: sibling.updatedAt, status: sibling.status },
        data: {
          countryId,
          slug,
          workplaceMode,
          status,
          closesAt: closesAt ?? null,
          publishedAt: sibling.publishedAt ?? publishedAt,
          ...(localization ? {
            title: localization.title,
            department: localization.department,
            location: localization.location,
            employmentType: localization.employmentType,
            minimumExperience: localization.minimumExperience ?? null,
            descriptionHtml: sanitizeDescription(localization.descriptionHtml),
          } : {}),
          updatedByUserId: actorUserId,
          updatedAt,
        },
      });
      if (updated.count !== 1) {
        throw new RecruitmentConflictError("This job changed while you were editing");
      }
      localizationByLocale.delete(sibling.locale);
    }

    for (const localization of localizationByLocale.values()) {
      await tx.jobListing.create({
        data: {
          countryId,
          slug,
          workplaceMode,
          status,
          closesAt: closesAt ?? null,
          publishedAt,
          ...localization,
          minimumExperience: localization.minimumExperience ?? null,
          descriptionHtml: sanitizeDescription(localization.descriptionHtml),
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
        },
      });
    }

    const jobs = await tx.jobListing.findMany({
      where: { countryId, slug },
      include: adminJobInclude,
      orderBy: { locale: "asc" },
    });
    const canonical = jobs.find(({ locale }) => locale === defaultLocale) ?? jobs[0];
    if (!canonical) throw new RecruitmentConflictError("This job changed while you were editing");
    return {
      previousStatus: anchor.status,
      job: {
        ...canonical,
        localizations: jobs.map((job) => ({
          id: job.id,
          locale: job.locale,
          title: job.title,
          department: job.department,
          location: job.location,
          employmentType: job.employmentType,
          minimumExperience: job.minimumExperience,
          descriptionHtml: job.descriptionHtml,
          status: job.status,
          publishedAt: job.publishedAt,
          updatedAt: job.updatedAt,
        })),
      },
    };
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
      select: { id: true, locale: true },
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
        metadata: {
          jobListingId: job.id,
          jobLocale: job.locale,
          privacyNoticeLocale: args.fields.privacyNoticeLocale,
        },
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
  const jobGroup = query.jobId
    ? await prisma.jobListing.findUnique({
        where: { id: query.jobId },
        select: { countryId: true, slug: true },
      })
    : null;
  if (query.jobId && !jobGroup) {
    return { items: [], pagination: { page: query.page, pageSize: query.pageSize, total: 0, totalPages: 0 } };
  }
  if (jobGroup && query.countryId && jobGroup.countryId !== query.countryId) {
    return { items: [], pagination: { page: query.page, pageSize: query.pageSize, total: 0, totalPages: 0 } };
  }
  const jobListing = {
    ...(jobGroup ?? {}),
    ...(query.countryId ? { countryId: query.countryId } : {}),
  };
  const where: Prisma.JobApplicationWhereInput = {
    ...(Object.keys(jobListing).length ? { jobListing } : {}),
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
