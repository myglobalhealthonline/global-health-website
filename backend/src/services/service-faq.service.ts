import type { LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { normalizeDbError } from "../modules/shared/db-errors.js";
import { resolveTranslation } from "../modules/shared/resolve-translation.js";
import { assertLocaleSupported } from "../modules/shared/locale-support.js";
import type { ServiceFaqTranslationInput } from "../validations/admin-services.schema.js";

export const faqTranslationSelect = {
  locale: true,
  question: true,
  answer: true,
} satisfies Prisma.ServiceFaqTranslationSelect;

type FaqDisplayBase = { question: string; answer: string };
type FaqTranslationRow = FaqDisplayBase & { locale: LocaleCode };

/** Merge a FAQ's base question/answer with the best translation for the
 *  requested locale (requested → default → first → base), same fallback
 *  chain as mergeServiceTranslation. */
export function mergeFaqTranslation<S extends FaqDisplayBase & { translations: FaqTranslationRow[] }>(
  faq: S,
  requested: LocaleCode,
  defaultLocale: LocaleCode,
): Omit<S, "translations"> & { resolvedLocale: LocaleCode } {
  const { tr, resolvedLocale } = resolveTranslation(faq.translations, requested, defaultLocale);
  const { translations: _translations, ...rest } = faq;
  return {
    ...rest,
    question: tr?.question ?? faq.question,
    answer: tr?.answer ?? faq.answer,
    resolvedLocale,
  };
}

/** Upsert one ServiceFaqTranslation row per supplied entry, keyed by
 *  (serviceFaqId, locale). Validates each locale is enabled for the FAQ's
 *  country. Mirrors upsertServiceTranslations in services.service.ts. */
async function upsertServiceFaqTranslations(
  faqId: string,
  countryId: string,
  translations: ServiceFaqTranslationInput[],
): Promise<void> {
  await Promise.all(translations.map((entry) => assertLocaleSupported(countryId, entry.locale)));
  await prisma.$transaction(
    translations.map((entry) =>
      prisma.serviceFaqTranslation.upsert({
        where: { serviceFaqId_locale: { serviceFaqId: faqId, locale: entry.locale } },
        create: { serviceFaqId: faqId, locale: entry.locale, question: entry.question, answer: entry.answer },
        update: { question: entry.question, answer: entry.answer },
      }),
    ),
  );
}

export class ServiceFaqNotFoundError extends Error {
  constructor() {
    super("FAQ not found");
    this.name = "ServiceFaqNotFoundError";
  }
}

export class ServiceFaqServiceNotFoundError extends Error {
  constructor() {
    super("Service not found");
    this.name = "ServiceFaqServiceNotFoundError";
  }
}

export class ServiceFaqMaxLimitError extends Error {
  constructor() {
    super("Maximum of 50 FAQs per service");
    this.name = "ServiceFaqMaxLimitError";
  }
}

const MAX_FAQS_PER_SERVICE = 50;

/** Admin listing: base columns (default-locale content) + raw translations
 *  array, for the per-locale editor tabs. */
export async function listServiceFaqs(serviceId: string, visibleOnly = false) {
  try {
    return await prisma.serviceFaq.findMany({
      where: {
        serviceId,
        ...(visibleOnly ? { isVisible: true } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        serviceId: true,
        question: true,
        answer: true,
        sortOrder: true,
        isVisible: true,
        createdAt: true,
        updatedAt: true,
        translations: { select: faqTranslationSelect },
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "FAQ data is unavailable");
  }
}

/** Public listing: visible FAQs merged to the requested locale (fallback
 *  requested → country default → first → base), translations array stripped. */
export async function listServiceFaqsForLocale(
  serviceId: string,
  requested: LocaleCode,
  defaultLocale: LocaleCode,
) {
  try {
    const rows = await prisma.serviceFaq.findMany({
      where: { serviceId, isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        question: true,
        answer: true,
        sortOrder: true,
        translations: { select: faqTranslationSelect },
      },
    });
    return rows.map((row) => mergeFaqTranslation(row, requested, defaultLocale));
  } catch (error) {
    throw normalizeDbError(error, "FAQ data is unavailable");
  }
}

export async function createServiceFaq(
  serviceId: string,
  data: {
    question: string;
    answer: string;
    sortOrder?: number;
    isVisible?: boolean;
    translations?: ServiceFaqTranslationInput[];
  },
) {
  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, countryId: true },
    });
    if (!service) throw new ServiceFaqServiceNotFoundError();

    const count = await prisma.serviceFaq.count({ where: { serviceId } });
    if (count >= MAX_FAQS_PER_SERVICE) throw new ServiceFaqMaxLimitError();

    // Default sortOrder to end of list
    const sortOrder =
      data.sortOrder ??
      ((await prisma.serviceFaq.aggregate({
        where: { serviceId },
        _max: { sortOrder: true },
      }))._max.sortOrder ?? -1) + 1;

    const faq = await prisma.serviceFaq.create({
      data: {
        serviceId,
        question: data.question,
        answer: data.answer,
        sortOrder,
        isVisible: data.isVisible ?? true,
      },
    });

    if (data.translations && data.translations.length > 0) {
      await upsertServiceFaqTranslations(faq.id, service.countryId, data.translations);
    }

    return faq;
  } catch (error) {
    if (
      error instanceof ServiceFaqServiceNotFoundError ||
      error instanceof ServiceFaqMaxLimitError
    ) {
      throw error;
    }
    throw normalizeDbError(error, "Failed to create FAQ");
  }
}

export async function updateServiceFaq(
  faqId: string,
  data: {
    question?: string;
    answer?: string;
    sortOrder?: number;
    isVisible?: boolean;
    translations?: ServiceFaqTranslationInput[];
  },
) {
  try {
    const faq = await prisma.serviceFaq.findUnique({
      where: { id: faqId },
      select: { id: true, service: { select: { countryId: true } } },
    });
    if (!faq) throw new ServiceFaqNotFoundError();

    const { translations, ...rest } = data;
    const updated = await prisma.serviceFaq.update({
      where: { id: faqId },
      data: rest,
    });

    if (translations && translations.length > 0) {
      await upsertServiceFaqTranslations(faqId, faq.service.countryId, translations);
    }

    return updated;
  } catch (error) {
    if (error instanceof ServiceFaqNotFoundError) throw error;
    throw normalizeDbError(error, "Failed to update FAQ");
  }
}

export async function deleteServiceFaq(faqId: string) {
  try {
    const faq = await prisma.serviceFaq.findUnique({
      where: { id: faqId },
      select: { id: true },
    });
    if (!faq) throw new ServiceFaqNotFoundError();

    await prisma.serviceFaq.delete({ where: { id: faqId } });
    return true;
  } catch (error) {
    if (error instanceof ServiceFaqNotFoundError) throw error;
    throw normalizeDbError(error, "Failed to delete FAQ");
  }
}

/** Reorder FAQs for a service. orderedIds must be all FAQ ids for that service. */
export async function reorderServiceFaqs(serviceId: string, orderedIds: string[]) {
  try {
    // Verify all ids belong to this service
    const existing = await prisma.serviceFaq.findMany({
      where: { serviceId },
      select: { id: true },
    });
    const existingSet = new Set(existing.map((f) => f.id));
    for (const id of orderedIds) {
      if (!existingSet.has(id)) {
        throw new ServiceFaqNotFoundError();
      }
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.serviceFaq.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return await listServiceFaqs(serviceId);
  } catch (error) {
    if (error instanceof ServiceFaqNotFoundError) throw error;
    throw normalizeDbError(error, "Failed to reorder FAQs");
  }
}
