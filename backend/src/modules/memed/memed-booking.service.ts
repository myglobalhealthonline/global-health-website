import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import type { MemedBookingStatus } from "@prisma/client";
import {
  createBooking,
  isMemedConfigured,
  MemedNotConfiguredError,
  type MemedBookingItem,
} from "../../lib/memed/client.js";
import { wrapHtml } from "../../lib/email/templates.js";
import { deliverAdminAlert, escapeHtml } from "../automation/admin-alert-delivery.js";

/**
 * Auto-books a paid HEALTH_TEST kit order into Memed (doc.memed.com.br),
 * attributed to the single fixed doctor `MEMED_DEFAULT_DOCTOR_ID` (Dr.
 * Tiago), then alerts admin (in-app bell + WhatsApp numbers + WhatsApp
 * group) with the outcome.
 *
 * NOT CURRENTLY WIRED to the payment flow — Memed partner onboarding is still
 * in progress and no credentials exist, so nothing calls this yet. The staff
 * alert for a kit sale does NOT depend on it: `notifyHealthTestOrderPaid`
 * (modules/automation/health-test-order-notifications.service.ts) fires for
 * every market from `ensureOrderPaidAutomations`, and this function's alert is
 * the Brazil-only Memed-outcome follow-up on top of it. Wire this in from the
 * same place once credentials land — fire-and-forget and deliberately OUTSIDE
 * the paid-order DB transaction, since it makes a real outbound HTTP call and
 * must never hold that transaction open. Idempotent: a `MemedBooking` row
 * already existing for the order is a no-op, so retries (payment sync, webhook
 * redelivery) can't double-book.
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

  // SC-1: MemedBooking.status is a Prisma enum now, so the outcome carries the
  // enum type rather than a bare string — an unlisted status is a compile
  // error here instead of a runtime write of an unknown value.
  let outcome: {
    status: MemedBookingStatus;
    memedReferenceId?: string;
    error?: string;
    raw?: unknown;
  };

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


/**
 * Report the Memed outcome to the staff channels.
 *
 * The kit sale itself is announced by `notifyHealthTestOrderPaid`
 * (modules/automation/health-test-order-notifications.service.ts), which fires
 * for every market on payment. This alert is the Brazil-specific follow-up:
 * whether the paid kit reached Memed, so a FAILED booking gets picked up
 * manually. Delivery is the shared fan-out — same recipients, same per-channel
 * AutomationRun logging as every other staff alert.
 */
async function notifyHealthTestBooked(orderId: string, ctx: HealthTestBookedContext): Promise<void> {
  const text = buildAlertText(ctx);
  await deliverAdminAlert({
    orderId,
    automationKeyPrefix: "health_test_booked",
    summary: "Admin alert — health test booked",
    text,
    emailSubject: `Health-test kit booked — ${ctx.customerName}`,
    emailHtml: wrapHtml(
      "Health-test kit booked",
      `<pre style="font-family:inherit;font-size:14px;white-space:pre-wrap;margin:0;">${escapeHtml(text)}</pre>`,
    ),
    toGroup: true,
    portalType: "HEALTH_TEST_BOOKED",
    emailRecordLabel: orderId,
  });
}
