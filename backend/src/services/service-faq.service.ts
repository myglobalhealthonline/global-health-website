import { prisma } from "../db/prisma.js";
import { normalizeDbError } from "../modules/shared/db-errors.js";

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
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "FAQ data is unavailable");
  }
}

export async function createServiceFaq(
  serviceId: string,
  data: { question: string; answer: string; sortOrder?: number; isVisible?: boolean },
) {
  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true },
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

    return await prisma.serviceFaq.create({
      data: {
        serviceId,
        question: data.question,
        answer: data.answer,
        sortOrder,
        isVisible: data.isVisible ?? true,
      },
    });
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
  data: { question?: string; answer?: string; sortOrder?: number; isVisible?: boolean },
) {
  try {
    const faq = await prisma.serviceFaq.findUnique({
      where: { id: faqId },
      select: { id: true },
    });
    if (!faq) throw new ServiceFaqNotFoundError();

    return await prisma.serviceFaq.update({
      where: { id: faqId },
      data,
    });
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
