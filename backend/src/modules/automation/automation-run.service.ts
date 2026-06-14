import type { AutomationRunStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

export async function createAutomationRun(input: {
  automationKey: string;
  orderId?: string | null;
  appointmentId?: string | null;
  status?: AutomationRunStatus;
  channel?: string | null;
  recipient?: string | null;
  summary?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
  scheduledFor?: Date | null;
  executedAt?: Date | null;
}) {
  return prisma.automationRun.create({
    data: {
      automationKey: input.automationKey,
      orderId: input.orderId ?? null,
      appointmentId: input.appointmentId ?? null,
      status: input.status ?? "PENDING",
      channel: input.channel ?? null,
      recipient: input.recipient ?? null,
      summary: input.summary ?? null,
      error: input.error ?? null,
      metadata: (input.metadata ?? undefined) as object | undefined,
      scheduledFor: input.scheduledFor ?? null,
      executedAt: input.executedAt ?? null,
    },
  });
}

export async function finishAutomationRun(
  id: string,
  patch: {
    status: AutomationRunStatus;
    summary?: string;
    error?: string | null;
    executedAt?: Date;
    recipient?: string;
  },
) {
  return prisma.automationRun.update({
    where: { id },
    data: {
      status: patch.status,
      summary: patch.summary,
      error: patch.error ?? null,
      executedAt: patch.executedAt ?? new Date(),
      ...(patch.recipient !== undefined ? { recipient: patch.recipient } : {}),
    },
  });
}

export async function listAutomationRuns(query: {
  page: number;
  pageSize: number;
  automationKey?: string;
  orderId?: string;
}) {
  const where = {
    ...(query.automationKey ? { automationKey: { startsWith: query.automationKey } } : {}),
    ...(query.orderId ? { orderId: query.orderId } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.automationRun.count({ where }),
    prisma.automationRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        order: { select: { id: true, orderNumber: true, email: true, fullName: true, paymentStatus: true, status: true } },
      },
    }),
  ]);
  return { total, items };
}
