import type { LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { normalizeDbError } from "../modules/shared/db-errors.js";
import { resolveTranslation } from "../modules/shared/resolve-translation.js";
import { LocaleNotSupportedError } from "../modules/shared/locale-support.js";
import type { ServiceFaqTranslationInput } from "../validations/admin-services.schema.js";

/** Base columns + translations, shared by every read/write path so a
 *  create/update response always carries the same shape the admin list
 *  and editor expect. */
const faqWithTranslationsSelect = {
  id: true,
  serviceId: true,
  question: true,
  answer: true,
  sortOrder: true,
  isVisible: true,
  createdAt: true,
  updatedAt: true,
  translations: { select: { locale: true, question: true, answer: true } },
} satisfies Prisma.ServiceFaqSelect;

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

/** Validate every locale in `translations` is enabled for the FAQ's country.
 *  Call BEFORE opening a transaction so a bad locale never leaves a
 *  half-written FAQ. One query for the country's enabled locales + one for
 *  its defaultLocale, checked in-memory against every entry — avoids firing
 *  a round trip per translation (up to 6 per request otherwise). */
async function assertFaqLocalesSupported(
  countryId: string,
  translations: ServiceFaqTranslationInput[],
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

/** Run the upsert (+ optional delete-missing-locales) ops for one FAQ's
 *  translations, using the given Prisma client (pass the `tx` handle when
 *  called inside a $transaction). Sync semantics: provided locales are
 *  upserted, and if `sync` is true, any existing locale not in
 *  `translations` is deleted (empty array = delete all). Upserts run
 *  concurrently — they're independent per-locale rows, and serializing them
 *  would needlessly extend the transaction's held-lock window. */
async function runFaqTranslationOps(
  client: Prisma.TransactionClient,
  faqId: string,
  translations: ServiceFaqTranslationInput[],
  sync: boolean,
): Promise<void> {
  await Promise.all(
    translations.map((entry) =>
      client.serviceFaqTranslation.upsert({
        where: { serviceFaqId_locale: { serviceFaqId: faqId, locale: entry.locale } },
        create: { serviceFaqId: faqId, locale: entry.locale, question: entry.question, answer: entry.answer },
        update: { question: entry.question, answer: entry.answer },
      }),
    ),
  );
  if (sync) {
    await client.serviceFaqTranslation.deleteMany({
      where: { serviceFaqId: faqId, locale: { notIn: translations.map((t) => t.locale) } },
    });
  }
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
      select: faqWithTranslationsSelect,
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

    // Validate locales before opening the transaction so a bad locale never
    // leaves a FAQ row created without its translations.
    if (data.translations) {
      await assertFaqLocalesSupported(service.countryId, data.translations);
    }

    // Count + sortOrder + create all run inside one transaction so two
    // concurrent creates for the same service can't both read the same
    // count/max and land on a duplicate sortOrder or both slip past the cap.
    const faq = await prisma.$transaction(async (tx) => {
      const count = await tx.serviceFaq.count({ where: { serviceId } });
      if (count >= MAX_FAQS_PER_SERVICE) throw new ServiceFaqMaxLimitError();

      const sortOrder =
        data.sortOrder ??
        ((await tx.serviceFaq.aggregate({
          where: { serviceId },
          _max: { sortOrder: true },
        }))._max.sortOrder ?? -1) + 1;

      const created = await tx.serviceFaq.create({
        data: {
          serviceId,
          question: data.question,
          answer: data.answer,
          sortOrder,
          isVisible: data.isVisible ?? true,
        },
      });
      if (data.translations && data.translations.length > 0) {
        await runFaqTranslationOps(tx, created.id, data.translations, false);
      }
      return tx.serviceFaq.findUniqueOrThrow({
        where: { id: created.id },
        select: faqWithTranslationsSelect,
      });
    });

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
    // translations undefined = don't touch. Otherwise (including []) sync:
    // upsert provided locales, delete any locale not in the array.
    if (translations) {
      await assertFaqLocalesSupported(faq.service.countryId, translations);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.serviceFaq.update({
        where: { id: faqId },
        data: rest,
      });
      if (translations) {
        await runFaqTranslationOps(tx, faqId, translations, true);
      }
      return tx.serviceFaq.findUniqueOrThrow({
        where: { id: faqId },
        select: faqWithTranslationsSelect,
      });
    });

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
