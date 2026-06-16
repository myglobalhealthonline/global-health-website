import type { AutomationRunStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { formatOrderDisplayId } from "./automation-catalog.js";

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

export async function listAutomationRunOrders(query: { page: number; pageSize: number }) {
  // Distinct orderIds for total count
  const allDistinct = await prisma.automationRun.findMany({
    where: { orderId: { not: null } },
    select: { orderId: true },
    distinct: ["orderId"],
  });
  const total = allDistinct.length;

  // Paged groups with aggregate stats
  const grouped = await prisma.automationRun.groupBy({
    by: ["orderId"],
    where: { orderId: { not: null } },
    _count: { id: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  });

  const orderIds = grouped.map((g) => g.orderId!).filter(Boolean);

  const [failureCounts, orders] = await Promise.all([
    prisma.automationRun.groupBy({
      by: ["orderId"],
      where: { orderId: { in: orderIds }, status: "FAILED" },
      _count: { id: true },
    }),
    prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: {
        id: true,
        orderNumber: true,
        email: true,
        fullName: true,
        paymentStatus: true,
        status: true,
      },
    }),
  ]);

  const failureMap = new Map(failureCounts.map((f) => [f.orderId!, f._count.id]));
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  const items = grouped.map((g) => {
    const order = orderMap.get(g.orderId!);
    return {
      orderId: g.orderId!,
      orderNumber: order
        ? formatOrderDisplayId({ id: order.id, orderNumber: order.orderNumber })
        : g.orderId!.slice(-8).toUpperCase(),
      email: order?.email ?? null,
      fullName: order?.fullName ?? null,
      paymentStatus: order?.paymentStatus ?? null,
      orderStatus: order?.status ?? null,
      totalRuns: g._count.id,
      failedRuns: failureMap.get(g.orderId!) ?? 0,
      lastRunAt: g._max.createdAt?.toISOString() ?? null,
    };
  });

  return { items, total };
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
