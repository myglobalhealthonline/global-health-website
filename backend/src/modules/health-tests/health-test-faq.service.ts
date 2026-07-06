import type { LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { resolveTranslation } from "../shared/resolve-translation.js";
import { LocaleNotSupportedError } from "../shared/locale-support.js";
import type { HealthTestFaqTranslationInput } from "../../validations/admin-health-tests.schema.js";

const faqWithTranslationsSelect = {
  id: true,
  healthTestId: true,
  question: true,
  answer: true,
  sortOrder: true,
  isVisible: true,
  createdAt: true,
  updatedAt: true,
  translations: { select: { locale: true, question: true, answer: true } },
} satisfies Prisma.HealthTestFaqSelect;

export const healthTestFaqTranslationSelect = {
  locale: true,
  question: true,
  answer: true,
} satisfies Prisma.HealthTestFaqTranslationSelect;

type FaqDisplayBase = { question: string; answer: string };
type FaqTranslationRow = FaqDisplayBase & { locale: LocaleCode };

export function mergeHealthTestFaqTranslation<S extends FaqDisplayBase & { translations: FaqTranslationRow[] }>(
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

async function assertFaqLocalesSupported(
  countryId: string,
  translations: HealthTestFaqTranslationInput[],
): Promise<void> {
  const [enabled, country] = await Promise.all([
    prisma.countryLocale.findMany({ where: { countryId }, select: { locale: true } }),
    prisma.country.findUnique({ where: { id: countryId }, select: { defaultLocale: true } }),
  ]);
  const allowed = new Set(enabled.map((row) => row.locale));
  if (country?.defaultLocale) allowed.add(country.defaultLocale);
  for (const entry of translations) {
    if (!allowed.has(entry.locale)) throw new LocaleNotSupportedError();
  }
}

async function runFaqTranslationOps(
  client: Prisma.TransactionClient,
  faqId: string,
  translations: HealthTestFaqTranslationInput[],
  sync: boolean,
): Promise<void> {
  await Promise.all(
    translations.map((entry) =>
      client.healthTestFaqTranslation.upsert({
        where: { healthTestFaqId_locale: { healthTestFaqId: faqId, locale: entry.locale } },
        create: { healthTestFaqId: faqId, locale: entry.locale, question: entry.question, answer: entry.answer },
        update: { question: entry.question, answer: entry.answer },
      }),
    ),
  );
  if (sync) {
    await client.healthTestFaqTranslation.deleteMany({
      where: { healthTestFaqId: faqId, locale: { notIn: translations.map((t) => t.locale) } },
    });
  }
}

export class HealthTestFaqNotFoundError extends Error {
  constructor() {
    super("FAQ not found");
    this.name = "HealthTestFaqNotFoundError";
  }
}

export class HealthTestFaqHealthTestNotFoundError extends Error {
  constructor() {
    super("Health test not found");
    this.name = "HealthTestFaqHealthTestNotFoundError";
  }
}

export class HealthTestFaqMaxLimitError extends Error {
  constructor() {
    super("Maximum of 50 FAQs per health test");
    this.name = "HealthTestFaqMaxLimitError";
  }
}

const MAX_FAQS_PER_HEALTH_TEST = 50;

export async function listHealthTestFaqs(healthTestId: string, visibleOnly = false) {
  try {
    return await prisma.healthTestFaq.findMany({
      where: {
        healthTestId,
        ...(visibleOnly ? { isVisible: true } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: faqWithTranslationsSelect,
    });
  } catch (error) {
    throw normalizeDbError(error, "FAQ data is unavailable");
  }
}

export async function listHealthTestFaqsForLocale(
  healthTestId: string,
  requested: LocaleCode,
  defaultLocale: LocaleCode,
) {
  try {
    const rows = await prisma.healthTestFaq.findMany({
      where: { healthTestId, isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        question: true,
        answer: true,
        sortOrder: true,
        translations: { select: healthTestFaqTranslationSelect },
      },
    });
    return rows.map((row) => mergeHealthTestFaqTranslation(row, requested, defaultLocale));
  } catch (error) {
    throw normalizeDbError(error, "FAQ data is unavailable");
  }
}

export async function createHealthTestFaq(
  healthTestId: string,
  data: {
    question: string;
    answer: string;
    sortOrder?: number;
    isVisible?: boolean;
    translations?: HealthTestFaqTranslationInput[];
  },
) {
  try {
    const healthTest = await prisma.healthTest.findUnique({
      where: { id: healthTestId },
      select: { id: true, countryId: true },
    });
    if (!healthTest) throw new HealthTestFaqHealthTestNotFoundError();

    if (data.translations) {
      await assertFaqLocalesSupported(healthTest.countryId, data.translations);
    }

    const faq = await prisma.$transaction(async (tx) => {
      const count = await tx.healthTestFaq.count({ where: { healthTestId } });
      if (count >= MAX_FAQS_PER_HEALTH_TEST) throw new HealthTestFaqMaxLimitError();

      const sortOrder =
        data.sortOrder ??
        ((await tx.healthTestFaq.aggregate({
          where: { healthTestId },
          _max: { sortOrder: true },
        }))._max.sortOrder ?? -1) + 1;

      const created = await tx.healthTestFaq.create({
        data: {
          healthTestId,
          question: data.question,
          answer: data.answer,
          sortOrder,
          isVisible: data.isVisible ?? true,
        },
      });
      if (data.translations && data.translations.length > 0) {
        await runFaqTranslationOps(tx, created.id, data.translations, false);
      }
      return tx.healthTestFaq.findUniqueOrThrow({
        where: { id: created.id },
        select: faqWithTranslationsSelect,
      });
    });

    return faq;
  } catch (error) {
    if (
      error instanceof HealthTestFaqHealthTestNotFoundError ||
      error instanceof HealthTestFaqMaxLimitError ||
      error instanceof LocaleNotSupportedError
    ) {
      throw error;
    }
    throw normalizeDbError(error, "Failed to create FAQ");
  }
}

export async function updateHealthTestFaq(
  faqId: string,
  data: {
    question?: string;
    answer?: string;
    sortOrder?: number;
    isVisible?: boolean;
    translations?: HealthTestFaqTranslationInput[];
  },
) {
  try {
    const faq = await prisma.healthTestFaq.findUnique({
      where: { id: faqId },
      select: { id: true, healthTest: { select: { countryId: true } } },
    });
    if (!faq) throw new HealthTestFaqNotFoundError();

    const { translations, ...rest } = data;
    if (translations) {
      await assertFaqLocalesSupported(faq.healthTest.countryId, translations);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.healthTestFaq.update({
        where: { id: faqId },
        data: rest,
      });
      if (translations) {
        await runFaqTranslationOps(tx, faqId, translations, true);
      }
      return tx.healthTestFaq.findUniqueOrThrow({
        where: { id: faqId },
        select: faqWithTranslationsSelect,
      });
    });

    return updated;
  } catch (error) {
    if (error instanceof HealthTestFaqNotFoundError || error instanceof LocaleNotSupportedError) {
      throw error;
    }
    throw normalizeDbError(error, "Failed to update FAQ");
  }
}

export async function deleteHealthTestFaq(faqId: string) {
  try {
    const faq = await prisma.healthTestFaq.findUnique({
      where: { id: faqId },
      select: { id: true },
    });
    if (!faq) throw new HealthTestFaqNotFoundError();

    await prisma.healthTestFaq.delete({ where: { id: faqId } });
    return true;
  } catch (error) {
    if (error instanceof HealthTestFaqNotFoundError) throw error;
    throw normalizeDbError(error, "Failed to delete FAQ");
  }
}

export async function reorderHealthTestFaqs(healthTestId: string, orderedIds: string[]) {
  try {
    const existing = await prisma.healthTestFaq.findMany({
      where: { healthTestId },
      select: { id: true },
    });
    const existingSet = new Set(existing.map((f) => f.id));
    for (const id of orderedIds) {
      if (!existingSet.has(id)) {
        throw new HealthTestFaqNotFoundError();
      }
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.healthTestFaq.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return await listHealthTestFaqs(healthTestId);
  } catch (error) {
    if (error instanceof HealthTestFaqNotFoundError) throw error;
    throw normalizeDbError(error, "Failed to reorder FAQs");
  }
}
