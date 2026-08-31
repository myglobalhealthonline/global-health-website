import { cache } from "react";
import { adminRequest } from "./core";

export type AdminJobStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type AdminJobWorkplaceMode = "REMOTE" | "HYBRID" | "ONSITE";
export type AdminJobLocale = "EN" | "PT" | "ES" | "CS" | "RO" | "DE";
export type AdminJobDto = {
  id: string; countryId: string; locale: AdminJobLocale; slug: string; title: string; department: string;
  location: string; workplaceMode: AdminJobWorkplaceMode; employmentType: string;
  minimumExperience: string | null; descriptionHtml: string; status: AdminJobStatus;
  publishedAt: string | null; closesAt: string | null; createdAt: string; updatedAt: string;
  country: { id: string; code: string; name: string; slug: string };
  _count: { applications: number };
};
export type AdminJobListDto = Pick<
  AdminJobDto,
  "id" | "countryId" | "locale" | "slug" | "title" | "department" | "location" |
  "workplaceMode" | "status" | "closesAt" | "updatedAt" | "country" | "_count"
>;
export type AdminJobLocalizationDto = Pick<
  AdminJobDto,
  "id" | "locale" | "title" | "department" | "location" | "employmentType" |
  "minimumExperience" | "descriptionHtml" | "status" | "publishedAt" | "updatedAt"
>;
export type AdminJobDetailDto = AdminJobDto & { localizations: AdminJobLocalizationDto[] };
export type AdminJobInput = {
  countryId: string; locale: AdminJobLocale; slug: string; title: string; department: string;
  location: string; workplaceMode: AdminJobWorkplaceMode; employmentType: string;
  minimumExperience: string | null; descriptionHtml: string; status: AdminJobStatus;
  closesAt: string | null;
};
export type AdminJobGroupInput = Pick<
  AdminJobInput,
  "countryId" | "slug" | "workplaceMode" | "status" | "closesAt"
> & {
  localizations: Array<Pick<
    AdminJobInput,
    "locale" | "title" | "department" | "location" | "employmentType" |
    "minimumExperience" | "descriptionHtml"
  >>;
};
export type AdminApplicationStatus = "NEW" | "REVIEWED";
export type AdminApplicationListDto = {
  id: string; fullName: string; status: AdminApplicationStatus; submittedAt: string;
  reviewedAt: string | null; retentionUntil: string;
  jobListing: { id: string; title: string; country: { id: string; code: string; name: string } };
};
export type AdminApplicationDto = AdminApplicationListDto & {
  email: string; phone: string | null; message: string | null; privacyAcknowledgedAt: string;
  privacyNoticeVersion: string; cvByteSize: number; cvScannedAt: string;
  cvDownloadPath?: string;
  jobListing: AdminApplicationListDto["jobListing"] & { slug: string };
};
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

function queryPath(path: string, query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) if (value) params.set(key, value);
  return params.size > 0 ? `${path}?${params}` : path;
}

export function fetchAdminJobs(query?: Record<string, string | undefined>) {
  return adminRequest<{ items: AdminJobListDto[]; pagination: Pagination; summary: { draft: number; published: number; archived: number } }>(queryPath("/api/admin/jobs", query));
}
export const fetchAdminJob = cache((id: string) => adminRequest<{ job: AdminJobDetailDto }>(`/api/admin/jobs/${encodeURIComponent(id)}`));
export function createAdminJobGroup(body: AdminJobGroupInput) {
  return adminRequest<{ job: AdminJobDetailDto }>("/api/admin/job-groups", { method: "POST", body });
}
export function updateAdminJobGroup(id: string, body: Partial<AdminJobGroupInput>) {
  return adminRequest<{ job: AdminJobDetailDto }>(`/api/admin/job-groups/${encodeURIComponent(id)}`, { method: "PATCH", body });
}
export function fetchRecruitmentHealth() {
  return adminRequest<{ storage: { configured: boolean }; scanner: { configured: boolean; reachable: boolean }; ready: boolean }>("/api/admin/recruitment/health");
}
export function fetchAdminJobApplications(query?: Record<string, string | undefined>) {
  return adminRequest<{ items: AdminApplicationListDto[]; pagination: Pagination }>(queryPath("/api/admin/job-applications", query));
}
export const fetchAdminJobApplication = cache((id: string) => adminRequest<{ application: AdminApplicationDto }>(`/api/admin/job-applications/${encodeURIComponent(id)}`));
export function updateAdminJobApplication(id: string, status: AdminApplicationStatus) {
  return adminRequest<{ application: { id: string; status: AdminApplicationStatus; reviewedAt: string | null } }>(`/api/admin/job-applications/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } });
}
export function purgeAdminJobApplication(id: string, reason: "DATA_SUBJECT_REQUEST" | "ADMIN_CORRECTION") {
  return adminRequest<{ deleted: true }>(`/api/admin/job-applications/${encodeURIComponent(id)}`, { method: "DELETE", body: { reason } });
}
