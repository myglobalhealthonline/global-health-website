import type {
  AdminJobInput,
  AdminJobLocale,
  AdminJobStatus,
  AdminJobWorkplaceMode,
} from "@/lib/admin/admin-api";

const JOB_LOCALES = ["EN", "PT", "ES", "CS", "RO", "DE"] as const;
const JOB_WORKPLACE_MODES = ["REMOTE", "HYBRID", "ONSITE"] as const;
const JOB_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

const isJobLocale = (value: string): value is AdminJobLocale =>
  JOB_LOCALES.some((locale) => locale === value);
const isJobWorkplaceMode = (value: string): value is AdminJobWorkplaceMode =>
  JOB_WORKPLACE_MODES.some((mode) => mode === value);
const isJobStatus = (value: string): value is AdminJobStatus =>
  JOB_STATUSES.some((status) => status === value);

function parseLocale(value: string) {
  const normalized = value.toUpperCase();
  if (!isJobLocale(normalized)) throw new Error("Invalid locale");
  return normalized;
}

function parseWorkplaceMode(value: string) {
  if (!isJobWorkplaceMode(value)) throw new Error("Invalid workplaceMode");
  return value;
}

function parseStatus(value: string) {
  if (!isJobStatus(value)) throw new Error("Invalid status");
  return value;
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
export function slugifyJobTitle(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}
export function parseJobForm(form: FormData): AdminJobInput {
  const rawClosing = text(form, "closesAt");
  return {
    countryId: text(form, "countryId"), locale: parseLocale(text(form, "locale")),
    slug: text(form, "slug"), title: text(form, "title"), department: text(form, "department"),
    location: text(form, "location"), workplaceMode: parseWorkplaceMode(text(form, "workplaceMode")),
    employmentType: text(form, "employmentType"), minimumExperience: text(form, "minimumExperience") || null,
    descriptionHtml: text(form, "descriptionHtml"), status: parseStatus(text(form, "status")),
    closesAt: rawClosing ? new Date(`${rawClosing}:00Z`).toISOString() : null,
  };
}
export function validateJobInput(value: AdminJobInput): string | null {
  if (!value.countryId || !value.locale || !value.title || !value.slug || !value.department || !value.location || !value.employmentType) return "Complete all required fields.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) return "Slug must contain lowercase letters, numbers, and hyphens only.";
  if (!value.descriptionHtml.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim()) return "Add a job description.";
  return null;
}
