import { cache } from "react";
import { apiRequest } from "@/lib/api/client";

export const PUBLIC_JOBS_TAG = "public-jobs";
export const publicJobsTag = (countryCode: string, locale: string) =>
  `${PUBLIC_JOBS_TAG}:${countryCode.toLowerCase()}:${locale.toLowerCase()}`;
export const publicJobTag = (countryCode: string, locale: string, slug: string) =>
  `public-job:${countryCode.toLowerCase()}:${locale.toLowerCase()}:${slug}`;

export type PublicJob = {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  workplaceMode: "REMOTE" | "HYBRID" | "ONSITE";
  employmentType: string;
  minimumExperience: string | null;
  descriptionHtml?: string;
  publishedAt: string;
  closesAt: string | null;
  updatedAt: string;
};

export type PublicJobsResult =
  | { state: "loaded"; jobs: PublicJob[] }
  | { state: "empty"; jobs: [] }
  | { state: "unavailable"; jobs: [] };

const string = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function normalizePublicJob(value: unknown): PublicJob | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const workplaceMode = raw.workplaceMode;
  if (workplaceMode !== "REMOTE" && workplaceMode !== "HYBRID" && workplaceMode !== "ONSITE") {
    return null;
  }
  const job = {
    id: string(raw.id),
    slug: string(raw.slug),
    title: string(raw.title),
    department: string(raw.department),
    location: string(raw.location),
    workplaceMode,
    employmentType: string(raw.employmentType),
    minimumExperience: string(raw.minimumExperience) || null,
    descriptionHtml: string(raw.descriptionHtml) || undefined,
    publishedAt: string(raw.publishedAt),
    closesAt: string(raw.closesAt) || null,
    updatedAt: string(raw.updatedAt),
  } satisfies PublicJob;
  return job.id && job.slug && job.title && job.department && job.location && job.employmentType &&
    job.publishedAt && job.updatedAt ? job : null;
}

export function groupJobsByDepartment(jobs: PublicJob[]) {
  const grouped = new Map<string, PublicJob[]>();
  for (const job of jobs) grouped.set(job.department, [...(grouped.get(job.department) ?? []), job]);
  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([department, rows]) => ({ department, jobs: rows }));
}

export function classifyPublicJobs(value: unknown): PublicJobsResult {
  if (!Array.isArray(value)) return { state: "unavailable", jobs: [] };
  if (value.length === 0) return { state: "empty", jobs: [] };
  const jobs = value
    .map(normalizePublicJob)
    .filter((job): job is PublicJob => job !== null);
  return jobs.length > 0
    ? { state: "loaded", jobs }
    : { state: "unavailable", jobs: [] };
}

export const listPublicJobs = cache(async (
  countryCode: string,
  locale: string,
): Promise<PublicJobsResult> => {
  const params = new URLSearchParams({ countryCode, locale: locale.toUpperCase() });
  const response = await apiRequest<{ jobs?: unknown }>(`/api/public/jobs?${params}`, {
    revalidate: 60,
    tags: [PUBLIC_JOBS_TAG, publicJobsTag(countryCode, locale)],
  });
  if (!response.ok) return { state: "unavailable", jobs: [] };
  return classifyPublicJobs(response.data?.jobs);
});

export const getPublicJob = cache(async (
  countryCode: string,
  locale: string,
  slug: string,
): Promise<{ state: "loaded"; job: PublicJob } | { state: "missing" | "unavailable" }> => {
  const params = new URLSearchParams({ countryCode, locale: locale.toUpperCase() });
  const response = await apiRequest<{ job?: unknown }>(
    `/api/public/jobs/${encodeURIComponent(slug)}?${params}`,
    {
      revalidate: 60,
      tags: [PUBLIC_JOBS_TAG, publicJobsTag(countryCode, locale), publicJobTag(countryCode, locale, slug)],
    },
  );
  if (!response.ok) return { state: response.status === 404 ? "missing" : "unavailable" };
  const job = normalizePublicJob(response.data?.job);
  return job?.descriptionHtml ? { state: "loaded", job } : { state: "unavailable" };
});
