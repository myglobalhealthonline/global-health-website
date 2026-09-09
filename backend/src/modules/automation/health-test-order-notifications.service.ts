import { prisma } from "../../db/prisma.js";
import { wrapHtml } from "../../lib/email/templates.js";
import { formatWhatsAppSendError, sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import { deliverAdminAlert, escapeHtml } from "./admin-alert-delivery.js";
import { createAutomationRun, finishAutomationRun } from "./automation-run.service.js";
import {
  ADMIN_HEALTH_TEST_HEADLINE,
  buildAdminHealthTestAlertLines,
  buildAdminHealthTestAlertText,
  patientWhatsAppHealthTestConfirmation,
  type AdminHealthTestAlertContext,
} from "./health-test-messages.js";
import { resolveNotificationLang } from "./notification-language.js";

/**
 * Paid HEALTH_TEST kit order → tell the admin team and tell the customer.
 *
 * Kit orders used to fall through every notification path we have. They are not
 * bookings, so the post-payment ladder in `post-payment-flow.service.ts` skips
 * them (no slot, no doctor, no meeting link); `bookHealthTestInMemed` carries a
 * staff alert but is Brazil/Memed-specific and was never wired to the payment
 * flow. The result was ORD-000490: kit paid, address collected, and nobody —
 * staff or customer — told anything over WhatsApp.
 *
 * Two sends, deliberately different in their consent rules:
 *   • STAFF (admin numbers + admin group + admin emails + portal bell) always
 *     carries the customer's name, phone and delivery address. The kit has to
 *     be posted to that person; an alert without the address is not an alert.
 *   • CUSTOMER (their own number, given at checkout) is gated on
 *     `Order.whatsappConsent` — the default-ON opt-out on the checkout shipping
 *     panel. Product lines never carry `OrderItem.patientWhatsappConsent`
 *     (always false, there is no booking form to set it), which is why the
 *     consent for these orders lives at order level.
 *
 * Idempotent: claims `postPaymentStage` atomically, so webhook redelivery, the
 * outbox retry and the Stripe sync fallback cannot double-send.
 */

export type PaymentLog = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

const noopLog: PaymentLog = { info: () => {}, warn: () => {}, error: () => {} };

/**
 * The stage a kit order settles at once its confirmations are out.
 *
 * Reuses `POST_PAYMENT_STAGE_MEETING_LINK` (2) from the consultation ladder
 * rather than inventing a product-only stage: the column's meaning at 2 is
 * "the patient has been told everything they need for this order", the later
 * stages (reminders, session start) are appointment-only and a kit order never
 * reaches them. Importing the constant would drag the whole post-payment flow
 * module (and the Google Calendar client behind it) in for one integer.
 */
const STAGE_CONFIRMATION_SENT = 2;

function formatMoney(currencyCode: string, cents: number): string {
  const code = currencyCode.toUpperCase() || "EUR";
  const symbol =
    code === "EUR" ? "€" : code === "CZK" ? "Kč " : code === "BRL" ? "R$" : `${code} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function buildAdminHealthTestAlertHtml(ctx: AdminHealthTestAlertContext): string {
  const [headline, ...rows] = buildAdminHealthTestAlertLines(ctx);
  const body = rows
    .map((row) => {
      const idx = row.indexOf(":");
      const label = row.slice(0, idx);
      const value = row.slice(idx + 1).trim();
      return `<tr>
        <td style="padding:8px 2px;color:#6D6D6D;width:40%;">${escapeHtml(label)}</td>
        <td style="padding:8px 2px;font-weight:600;color:#1D4B36;">${escapeHtml(value)}</td>
      </tr>`;
    })
    .join("\n      ");
  return wrapHtml(
    headline,
    `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      ${body}
    </table>`,
  );
}

export async function notifyHealthTestOrderPaid(
  orderId: string,
  log: PaymentLog = noopLog,
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { healthTest: { select: { title: true } } } } },
  });
  if (!order) return;
  if (order.paymentStatus !== "PAID" && order.status !== "PAID") return;

  const kitItems = order.items.filter((i) => i.kind === "HEALTH_TEST");
  if (kitItems.length === 0) return;

  // Atomic claim — the outbox worker, the webhook and the sync fallback can all
  // reach here for the same order.
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, postPaymentStage: { lt: STAGE_CONFIRMATION_SENT } },
    data: {
      postPaymentStage: STAGE_CONFIRMATION_SENT,
      postPaymentFlowStartedAt: order.postPaymentFlowStartedAt ?? new Date(),
    },
  });
  if (claimed.count === 0) return;

  const address = [
    order.shipLine1,
    order.shipLine2,
    order.shipCity,
    order.shipPostalCode,
    order.shipCountryCode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  const ctx: AdminHealthTestAlertContext = {
    patientName: order.shipName?.trim() || order.fullName,
    patientEmail: order.email,
    patientPhone: order.phone ?? "",
    countryCode: order.countryCode,
    orderNumber: order.orderNumber ?? order.id,
    kits: kitItems.map((i) => `${i.quantity}× ${i.healthTest?.title ?? i.name}`),
    address,
    totalLabel: formatMoney(order.currencyCode, order.totalCents),
  };

  await deliverAdminAlert({
    orderId,
    automationKeyPrefix: "health_test_order_paid",
    summary: "Admin alert — health test booking received",
    text: buildAdminHealthTestAlertText(ctx),
    emailSubject: `${ADMIN_HEALTH_TEST_HEADLINE} — order #${ctx.orderNumber}`,
    emailHtml: buildAdminHealthTestAlertHtml(ctx),
    // Always mirrored to the staff group: this alert IS the fulfilment ticket.
    toGroup: true,
    portalType: "HEALTH_TEST_BOOKED",
    emailRecordLabel: ctx.orderNumber,
  }).catch((err) => log.warn({ err, orderId }, "Health-test admin alert failed"));

  await sendPatientConfirmation(order.id, {
    phone: order.phone,
    consent: order.whatsappConsent,
    countryCode: order.countryCode,
    shipCountryCode: order.shipCountryCode,
    lang: resolveNotificationLang({
      notificationLocale: order.notificationLocale,
      countryCode: order.countryCode,
    }),
    ctx: {
      // The customer is greeted by their account name; `shipName` is a
      // recipient label and can be a housemate or a company reception.
      patientName: order.fullName,
      orderNumber: ctx.orderNumber,
      kits: ctx.kits,
      address,
      totalLabel: ctx.totalLabel,
    },
  }).catch((err) => log.warn({ err, orderId }, "Health-test patient WhatsApp failed"));
}

async function sendPatientConfirmation(
  orderId: string,
  input: {
    phone: string | null;
    consent: boolean;
    countryCode: string;
    shipCountryCode: string | null;
    lang: ReturnType<typeof resolveNotificationLang>;
    ctx: Parameters<typeof patientWhatsAppHealthTestConfirmation>[0];
  },
): Promise<void> {
  const summary = "Patient WhatsApp — health test order confirmed";
  const automationKey = "health_test_order_paid_patient_whatsapp";

  if (!input.phone?.trim()) {
    await createAutomationRun({
      automationKey,
      orderId,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: `${summary} (no phone on order)`,
      executedAt: new Date(),
    }).catch(() => undefined);
    return;
  }

  const run = await createAutomationRun({
    automationKey,
    orderId,
    channel: "whatsapp",
    recipient: input.phone,
    summary,
    status: "RUNNING",
  }).catch(() => null);

  try {
    const result = await sendWhatsAppText({
      to: input.phone,
      message: patientWhatsAppHealthTestConfirmation(input.ctx, input.lang),
      hints: {
        orderCountryCode: input.countryCode,
        patientAddressCountryCode: input.shipCountryCode,
      },
      patientConsent: input.consent,
    });
    if (!run) return;
    if (!result.ok && !result.skipped) {
      await finishAutomationRun(run.id, {
        status: "FAILED",
        summary,
        error: formatWhatsAppSendError(result),
        recipient: result.to ?? input.phone,
      });
      return;
    }
    await finishAutomationRun(run.id, {
      status: result.skipped ? "SKIPPED" : "SUCCESS",
      summary: result.skipped ? `${summary} (${result.message ?? "skipped"})` : summary,
      recipient: result.to ?? input.phone,
    });
  } catch (err) {
    if (!run) return;
    await finishAutomationRun(run.id, {
      status: "FAILED",
      summary,
      error: err instanceof Error ? err.message : String(err),
    }).catch(() => undefined);
  }
}
