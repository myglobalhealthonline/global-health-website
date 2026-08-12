import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import {
  createBooking,
  isMemedConfigured,
  MemedNotConfiguredError,
  type MemedBookingItem,
} from "../../lib/memed/client.js";
import {
  sendWhatsAppText,
  sendWhatsAppGroupText,
  formatWhatsAppSendError,
} from "../../lib/whatsapp/wasender.js";
import { adminNotifyWhatsAppNumbers } from "../automation/admin-booking-alert.service.js";
import { createAutomationRun, finishAutomationRun } from "../automation/automation-run.service.js";

/**
 * Auto-books a paid HEALTH_TEST kit order into Memed (doc.memed.com.br),
 * attributed to the single fixed doctor `MEMED_DEFAULT_DOCTOR_ID` (Dr.
 * Tiago), then alerts admin (in-app bell + WhatsApp numbers + WhatsApp
 * group) with the outcome.
 *
 * Called fire-and-forget from `ensureOrderPaidAutomations`
 * (modules/orders/complete-order-payment.service.ts) — deliberately OUTSIDE
 * the paid-order DB transaction, since this makes a real outbound HTTP call
 * and must never hold that transaction open. Idempotent: a `MemedBooking`
 * row already existing for the order is a no-op, so retries (payment sync,
 * webhook redelivery) can't double-book.
 *
 * No Memed credentials exist yet (partner onboarding in progress) — with
 * `isMemedConfigured()` false this records a SKIPPED booking row and still
 * fires the admin alert, so ops can see every kit sale even before the API
 * key lands.
 */

export type PaymentLog = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

const noopLog: PaymentLog = { info: () => {}, warn: () => {}, error: () => {} };

export async function bookHealthTestInMemed(orderId: string, log: PaymentLog = noopLog): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { healthTest: true } } },
  });
  if (!order) return;

  const kitItems = order.items.filter((i) => i.kind === "HEALTH_TEST" && i.healthTestId);
  if (kitItems.length === 0) return;

  const existing = await prisma.memedBooking.findUnique({ where: { orderId } });
  if (existing) return;

  const booking = await prisma.memedBooking.create({
    data: { id: randomUUID(), orderId, status: "PENDING" },
  });

  const items: MemedBookingItem[] = kitItems.map((i) => ({
    description: i.healthTest?.title ?? i.name,
    quantity: i.quantity,
  }));

  let outcome: { status: string; memedReferenceId?: string; error?: string; raw?: unknown };

  if (!isMemedConfigured()) {
    outcome = { status: "SKIPPED", error: "Memed not configured — set MEMED_BASE_URL/MEMED_CLIENT_ID/MEMED_CLIENT_SECRET" };
  } else {
    const doctorId = env.MEMED_DEFAULT_DOCTOR_ID?.trim();
    if (!doctorId) {
      outcome = { status: "SKIPPED", error: "MEMED_DEFAULT_DOCTOR_ID not set" };
    } else {
      try {
        const result = await createBooking({
          externalReferenceId: order.id,
          doctorId,
          patient: {
            name: order.shipName ?? order.fullName,
            email: order.email,
            phone: order.phone,
            addressLine1: order.shipLine1 ?? "",
            addressLine2: order.shipLine2,
            city: order.shipCity ?? "",
            postalCode: order.shipPostalCode ?? "",
            countryCode: order.shipCountryCode ?? order.countryCode,
          },
          items,
        });
        outcome = { status: "SUCCESS", memedReferenceId: result.memedReferenceId, raw: result.raw };
      } catch (err) {
        const message = err instanceof MemedNotConfiguredError ? err.message : err instanceof Error ? err.message : String(err);
        outcome = { status: "FAILED", error: message };
        log.error({ err, orderId }, "Memed booking failed");
      }
    }
  }

  await prisma.memedBooking.update({
    where: { id: booking.id },
    data: {
      status: outcome.status,
      memedReferenceId: outcome.memedReferenceId ?? null,
      error: outcome.error ?? null,
      responseSnapshot: outcome.raw == null ? undefined : (outcome.raw as object),
      completedAt: new Date(),
    },
  });

  await notifyHealthTestBooked(order.id, {
    customerName: order.fullName,
    kits: kitItems.map((i) => `${i.quantity}× ${i.healthTest?.title ?? i.name}`),
    address: [order.shipLine1, order.shipLine2, order.shipCity, order.shipPostalCode, order.shipCountryCode]
      .filter(Boolean)
      .join(", "),
    memedStatus: outcome.status,
    memedError: outcome.error,
  }).catch((err) => log.warn({ err, orderId }, "Health-test booking admin alert failed"));
}

type HealthTestBookedContext = {
  customerName: string;
  kits: string[];
  address: string;
  memedStatus: string;
  memedError?: string;
};

function memedStatusLabel(status: string): string {
  if (status === "SUCCESS") return "booked in Memed";
  if (status === "FAILED") return "Memed booking FAILED — needs manual follow-up";
  return "Memed not yet configured — booked manually for now";
}

function buildAlertText(ctx: HealthTestBookedContext): string {
  return [
    "🧪 Health-test kit booked",
    `Customer: ${ctx.customerName}`,
    `Kit(s): ${ctx.kits.join(", ")}`,
    `Address: ${ctx.address || "—"}`,
    `Memed: ${memedStatusLabel(ctx.memedStatus)}`,
  ].join("\n");
}

async function notifyHealthTestBooked(orderId: string, ctx: HealthTestBookedContext): Promise<void> {
  const text = buildAlertText(ctx);
  const summary = "Admin alert — health test booked";

  // In-portal bell — always fires, needs no env configuration.
  try {
    const { notifyAdmins } = await import("../notifications/notify.service.js");
    await notifyAdmins("HEALTH_TEST_BOOKED", { snippet: text.replace(/\n/g, " · ") });
    await createAutomationRun({
      automationKey: "health_test_booked_admin_portal",
      orderId,
      channel: "portal",
      status: "SUCCESS",
      summary,
      executedAt: new Date(),
    });
  } catch {
    // best-effort
  }

  const numbers = adminNotifyWhatsAppNumbers();
  for (const to of numbers) {
    const run = await createAutomationRun({
      automationKey: "health_test_booked_admin_whatsapp",
      orderId,
      channel: "whatsapp",
      recipient: to,
      summary,
      status: "RUNNING",
    }).catch(() => null);
    try {
      const result = await sendWhatsAppText({ to, message: text });
      if (!run) continue;
      if (!result.ok && !result.skipped) {
        await finishAutomationRun(run.id, {
          status: "FAILED",
          summary,
          error: formatWhatsAppSendError(result),
          recipient: result.to ?? to,
        });
        continue;
      }
      await finishAutomationRun(run.id, {
        status: result.skipped ? "SKIPPED" : "SUCCESS",
        summary: result.skipped ? `${summary} (WhatsApp not configured)` : summary,
        recipient: result.to ?? to,
      });
    } catch (err) {
      if (!run) continue;
      await finishAutomationRun(run.id, {
        status: "FAILED",
        summary,
        error: err instanceof Error ? err.message : String(err),
      }).catch(() => undefined);
    }
  }

  const groupJid = env.ADMIN_NOTIFY_WHATSAPP_GROUP_JID?.trim();
  if (groupJid) {
    const run = await createAutomationRun({
      automationKey: "health_test_booked_admin_whatsapp_group",
      orderId,
      channel: "whatsapp",
      recipient: groupJid,
      summary,
      status: "RUNNING",
    }).catch(() => null);
    try {
      const result = await sendWhatsAppGroupText({ to: groupJid, message: text });
      if (run) {
        if (!result.ok && !result.skipped) {
          await finishAutomationRun(run.id, {
            status: "FAILED",
            summary,
            error: formatWhatsAppSendError(result),
            recipient: groupJid,
          });
        } else {
          await finishAutomationRun(run.id, {
            status: result.skipped ? "SKIPPED" : "SUCCESS",
            summary: result.skipped ? `${summary} (WhatsApp not configured)` : summary,
            recipient: groupJid,
          });
        }
      }
    } catch (err) {
      if (run) {
        await finishAutomationRun(run.id, {
          status: "FAILED",
          summary,
          error: err instanceof Error ? err.message : String(err),
        }).catch(() => undefined);
      }
    }
  }
}
