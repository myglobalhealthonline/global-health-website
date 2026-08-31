import type {
  AdminJobGroupInput,
  AdminJobLocale,
  AdminJobStatus,
  AdminJobWorkplaceMode,
} from "@/lib/admin/admin-api";

const JOB_LOCALES = ["EN", "PT", "ES", "CS", "RO", "DE"] as const;
const JOB_WORKPLACE_MODES = ["REMOTE", "HYBRID", "ONSITE"] as const;
const JOB_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const LOCALE_LABELS: Record<AdminJobLocale, string> = {
  EN: "English",
  PT: "Português",
  ES: "Español",
  CS: "Čeština",
  RO: "Română",
  DE: "Deutsch",
};

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
const readableHtml = (value: string) => value.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();

export type ParsedJobForm = AdminJobGroupInput & { defaultLocale: AdminJobLocale };

export function slugifyJobTitle(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

export function parseJobForm(form: FormData): ParsedJobForm {
  const rawClosing = text(form, "closesAt");
  const locales = [...new Set(form.getAll("translationLocale").map((value) => parseLocale(String(value))))];
  const localizations = locales.flatMap((locale) => {
    const prefix = `tr_${locale}_`;
    const localization = {
      locale,
      title: text(form, `${prefix}title`),
      department: text(form, `${prefix}department`),
      location: text(form, `${prefix}location`),
      employmentType: text(form, `${prefix}employmentType`),
      minimumExperience: text(form, `${prefix}minimumExperience`) || null,
      descriptionHtml: text(form, `${prefix}descriptionHtml`),
    };
    const hasContent = Boolean(
      localization.title || localization.department || localization.location ||
      localization.employmentType || localization.minimumExperience ||
      readableHtml(localization.descriptionHtml),
    );
    return hasContent
      ? [localization]
      : [];
  });

  return {
    countryId: text(form, "countryId"),
    defaultLocale: parseLocale(text(form, "defaultLocale")),
    slug: text(form, "slug"),
    workplaceMode: parseWorkplaceMode(text(form, "workplaceMode")),
    status: parseStatus(text(form, "status")),
    closesAt: rawClosing ? new Date(`${rawClosing}:00Z`).toISOString() : null,
    localizations,
  };
}

export function toAdminJobGroupInput(value: ParsedJobForm): AdminJobGroupInput {
  return {
    countryId: value.countryId,
    slug: value.slug,
    workplaceMode: value.workplaceMode,
    status: value.status,
    closesAt: value.closesAt,
    localizations: value.localizations,
  };
}

export function validateJobInput(
  value: ParsedJobForm,
  requiredLocales: AdminJobLocale[] = [value.defaultLocale],
): string | null {
  if (!value.countryId || !value.slug) return "Complete all required fields.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) {
    return "Slug must contain lowercase letters, numbers, and hyphens only.";
  }
  for (const locale of new Set([value.defaultLocale, ...requiredLocales])) {
    if (!value.localizations.some((localization) => localization.locale === locale)) {
      return `Add the default ${LOCALE_LABELS[locale]} translation.`;
    }
  }
  for (const localization of value.localizations) {
    if (
      !localization.title || !localization.department || !localization.location ||
      !localization.employmentType ||
      !readableHtml(localization.descriptionHtml)
    ) {
      return `Complete all required fields for ${LOCALE_LABELS[localization.locale]}.`;
    }
  }
  return null;
}
