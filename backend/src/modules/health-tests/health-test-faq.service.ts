import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

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
      select: {
        id: true,
        healthTestId: true,
        question: true,
        answer: true,
        sortOrder: true,
        isVisible: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "FAQ data is unavailable");
  }
}

export async function createHealthTestFaq(
  healthTestId: string,
  data: { question: string; answer: string; sortOrder?: number; isVisible?: boolean },
) {
  try {
    const healthTest = await prisma.healthTest.findUnique({
      where: { id: healthTestId },
      select: { id: true },
    });
    if (!healthTest) throw new HealthTestFaqHealthTestNotFoundError();

    const count = await prisma.healthTestFaq.count({ where: { healthTestId } });
    if (count >= MAX_FAQS_PER_HEALTH_TEST) throw new HealthTestFaqMaxLimitError();

    const sortOrder =
      data.sortOrder ??
      ((await prisma.healthTestFaq.aggregate({
        where: { healthTestId },
        _max: { sortOrder: true },
      }))._max.sortOrder ?? -1) + 1;

    return await prisma.healthTestFaq.create({
      data: {
        healthTestId,
        question: data.question,
        answer: data.answer,
        sortOrder,
        isVisible: data.isVisible ?? true,
      },
    });
  } catch (error) {
    if (
      error instanceof HealthTestFaqHealthTestNotFoundError ||
      error instanceof HealthTestFaqMaxLimitError
    ) {
      throw error;
    }
    throw normalizeDbError(error, "Failed to create FAQ");
  }
}

export async function updateHealthTestFaq(
  faqId: string,
  data: { question?: string; answer?: string; sortOrder?: number; isVisible?: boolean },
) {
  try {
    const faq = await prisma.healthTestFaq.findUnique({
      where: { id: faqId },
      select: { id: true },
    });
    if (!faq) throw new HealthTestFaqNotFoundError();

    return await prisma.healthTestFaq.update({
      where: { id: faqId },
      data,
    });
  } catch (error) {
    if (error instanceof HealthTestFaqNotFoundError) throw error;
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
