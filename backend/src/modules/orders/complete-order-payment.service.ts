import { PaymentStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { sendOrderConfirmationEmail } from "../../lib/email/templates.js";
import { getStripeClient, isStripeConfigured } from "../../lib/stripe/client.js";
import {
  orderHasConsultationItem,
  orderIsPaidForMeet,
} from "../admin-orders/generate-order-meet-link.service.js";
import { stopPrePaymentFlowOnPaid } from "../automation/pre-payment-flow.service.js";

export type PaymentLog = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

export type CheckoutSessionSnapshot = {
  id: string;
  payment_intent?: string | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
};

export type CompleteOrderPaymentResult = {
  alreadyPaid: boolean;
  orderId: string;
};

export type SyncOrderPaymentResult =
  | { ok: true; code: "SYNCED" | "ALREADY_PAID" }
  | { ok: false; code: "NOT_FOUND" | "NO_SESSION" | "STRIPE_NOT_CONFIGURED" | "NOT_PAID"; paymentStatus?: string };

const noopLog: PaymentLog = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Mark an order PAID from a completed Stripe Checkout session and run
 * post-payment side effects (automations, receipt email, Meet link).
 */
export async function completeOrderPaymentFromCheckoutSession(
  orderId: string,
  session: CheckoutSessionSnapshot,
  opts: { stripeEventId: string; eventType: string },
  log: PaymentLog = noopLog,
): Promise<CompleteOrderPaymentResult> {
  const { alreadyPaid } = await markOrderPaidFromStripeSession(orderId, session, opts, log);
  // #region agent log
  fetch('http://127.0.0.1:7835/ingest/b6dd0b3b-c589-4acc-8726-e91e7b7039d1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'694d12'},body:JSON.stringify({sessionId:'694d12',hypothesisId:'B',location:'complete-order-payment.service.ts:complete',message:'markOrderPaid done',data:{orderId,alreadyPaid,stripeEventId:opts.stripeEventId},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (alreadyPaid) {
    await ensureOrderPaidAutomations(orderId, log);
    return { alreadyPaid: true, orderId };
  }

  try {
    await fulfillPaidOrderFromCheckoutSession(orderId, session, log);
  } catch (err) {
    log.error({ err, orderId }, "Order marked PAID but fulfillment failed — reconcile manually");
  }

  await ensureOrderPaidAutomations(orderId, log, { sendShopConfirmation: true });
  return { alreadyPaid: false, orderId };
}

/** Idempotent: records Stripe event + flips order to PAID. Never throws on fulfillment errors. */
async function markOrderPaidFromStripeSession(
  orderId: string,
  session: CheckoutSessionSnapshot,
  opts: { stripeEventId: string; eventType: string },
  log: PaymentLog,
): Promise<{ alreadyPaid: boolean }> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { paymentStatus: true, status: true },
    });
    if (!order) return { alreadyPaid: true };
    if (order.paymentStatus === "PAID" || order.status === "PAID") {
      return { alreadyPaid: true };
    }

    const seen = await tx.processedWebhookEvent.findUnique({
      where: { stripeEventId: opts.stripeEventId },
      select: { id: true },
    });
    if (seen) {
      log.info({ orderId, stripeEventId: opts.stripeEventId }, "Stripe event already processed");
      return { alreadyPaid: true };
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        paymentStatus: PaymentStatus.PAID,
        paidAt: new Date(),
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
      },
    });

    await tx.processedWebhookEvent.create({
      data: { stripeEventId: opts.stripeEventId, eventType: opts.eventType },
    });

    return { alreadyPaid: false };
  });
}

/** Stock decrement + appointment minting. Failures here do not revert PAID status. */
async function fulfillPaidOrderFromCheckoutSession(
  orderId: string,
  session: CheckoutSessionSnapshot,
  log: PaymentLog,
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    const consultationItems = order.items.filter(
      (i) => i.kind === "GENERAL_CONSULTATION" || i.kind === "SPECIALIST_CONSULTATION",
    );

    const healthTestItems = order.items.filter(
      (i) => i.kind === "HEALTH_TEST" && i.healthTestId,
    );
    for (const item of healthTestItems) {
      if (!item.healthTestId) continue;
      const result = await tx.healthTest.updateMany({
        where: {
          id: item.healthTestId,
          stock: { not: null, gte: item.quantity },
        },
        data: { stock: { decrement: item.quantity } },
      });
      if (result.count !== 1) {
        const fresh = await tx.healthTest.findUnique({
          where: { id: item.healthTestId },
          select: { stock: true },
        });
        if (fresh && fresh.stock !== null) {
          log.error(
            {
              orderId,
              healthTestId: item.healthTestId,
              requested: item.quantity,
              remaining: fresh.stock,
            },
            "OVERSELL: paid order item exceeds available stock — needs manual reconciliation",
          );
        }
      }
    }

    const appointmentIds: string[] = [...order.appointmentIds];
    for (const item of consultationItems) {
      if (item.appointmentId) {
        if (item.timeSlotId) {
          const claim = await tx.doctorTimeSlot.updateMany({
            where: {
              id: item.timeSlotId,
              status: { in: ["HELD", "OPEN"] },
            },
            data: { status: "BOOKED" },
          });
          if (claim.count === 0) {
            log.warn(
              { orderId, itemId: item.id, slotId: item.timeSlotId },
              "Manual booking slot already claimed — appointment payment still recorded",
            );
          }
        }
        await tx.appointment.update({
          where: { id: item.appointmentId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAt: new Date(),
            stripePaymentIntentId:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
          },
        });
        if (!appointmentIds.includes(item.appointmentId)) {
          appointmentIds.push(item.appointmentId);
        }
        continue;
      }

      if (!item.timeSlotId || !item.doctorId || !item.serviceId) {
        log.warn(
          { orderId, itemId: item.id },
          "Consultation order item missing slot/doctor/service",
        );
        continue;
      }

      const existingOnSlot = await tx.appointment.findUnique({
        where: { timeSlotId: item.timeSlotId },
        select: { id: true, paymentStatus: true },
      });
      if (existingOnSlot) {
        if (existingOnSlot.paymentStatus !== PaymentStatus.PAID) {
          await tx.appointment.update({
            where: { id: existingOnSlot.id },
            data: {
              paymentStatus: PaymentStatus.PAID,
              paidAt: new Date(),
              stripePaymentIntentId:
                typeof session.payment_intent === "string" ? session.payment_intent : null,
            },
          });
        }
        await tx.orderItem.update({
          where: { id: item.id },
          data: { appointmentId: existingOnSlot.id },
        });
        if (!appointmentIds.includes(existingOnSlot.id)) {
          appointmentIds.push(existingOnSlot.id);
        }
        continue;
      }

      const claim = await tx.doctorTimeSlot.updateMany({
        where: {
          id: item.timeSlotId,
          status: { in: ["HELD", "OPEN"] },
        },
        data: { status: "BOOKED" },
      });
      if (claim.count === 0) {
        log.warn(
          { orderId, itemId: item.id, slotId: item.timeSlotId },
          "Slot already claimed by someone else — appointment skipped",
        );
        continue;
      }
      const slot = await tx.doctorTimeSlot.findUniqueOrThrow({
        where: { id: item.timeSlotId },
      });
      const consultationType =
        item.kind === "SPECIALIST_CONSULTATION" ? "specialist" : "general";
      const aptFullName = item.patientFullName ?? order.fullName;
      const aptEmail = item.patientEmail ?? order.email;
      const aptPhone = item.patientPhone ?? order.phone;
      const aptDob = item.patientDateOfBirth ?? null;
      const aptNotes = item.patientNotes ?? null;
      const apt = await tx.appointment.create({
        data: {
          userId: order.userId,
          countryCode: order.countryCode,
          consultationType,
          fullName: aptFullName,
          email: aptEmail,
          phone: aptPhone,
          dateOfBirth: aptDob,
          notes: aptNotes,
          consentAccepted: true,
          status: "REQUEST_RECEIVED",
          serviceId: item.serviceId,
          doctorId: item.doctorId,
          timeSlotId: item.timeSlotId,
          scheduledAt: slot.startAt,
          amountCents: item.unitPriceCents,
          currencyCode: order.currencyCode,
          paymentStatus: PaymentStatus.PAID,
          paidAt: new Date(),
          consultationMode: "ONLINE",
          patientTimezone: item.patientTimezone,
          addressLine1: item.patientAddressLine1,
          addressLine2: item.patientAddressLine2,
          addressCity: item.patientAddressCity,
          addressPostalCode: item.patientAddressPostalCode,
          addressCountryCode: item.patientAddressCountryCode,
          gdprConsentClinic: item.patientGdprConsentClinic,
          gdprConsentPlatform: item.patientGdprConsentPlatform,
          gdprConsentedAt: item.patientGdprConsentedAt,
        },
      });
      await tx.orderItem.update({
        where: { id: item.id },
        data: { appointmentId: apt.id },
      });
      appointmentIds.push(apt.id);

      if (
        aptEmail &&
        (item.patientNationalIdNumber || item.patientAddressLine1 || item.patientAddressCity)
      ) {
        const existing = await tx.patientProfile.findUnique({
          where: { email: aptEmail.toLowerCase() },
          select: {
            nationalIdNumber: true,
            addressLine1: true,
            addressLine2: true,
            addressCity: true,
            addressPostalCode: true,
            addressCountryCode: true,
          },
        });
        const fill = <T>(existingVal: T | null, snapshotVal: T | null): T | null =>
          existingVal ?? snapshotVal ?? null;
        await tx.patientProfile.upsert({
          where: { email: aptEmail.toLowerCase() },
          update: {
            nationalIdNumber: fill(
              existing?.nationalIdNumber ?? null,
              item.patientNationalIdNumber,
            ),
            addressLine1: fill(existing?.addressLine1 ?? null, item.patientAddressLine1),
            addressLine2: fill(existing?.addressLine2 ?? null, item.patientAddressLine2),
            addressCity: fill(existing?.addressCity ?? null, item.patientAddressCity),
            addressPostalCode: fill(
              existing?.addressPostalCode ?? null,
              item.patientAddressPostalCode,
            ),
            addressCountryCode: fill(
              existing?.addressCountryCode ?? null,
              item.patientAddressCountryCode,
            ),
          },
          create: {
            email: aptEmail.toLowerCase(),
            fullName: aptFullName,
            phone: aptPhone,
            dateOfBirth: aptDob,
            nationalIdNumber: item.patientNationalIdNumber,
            addressLine1: item.patientAddressLine1,
            addressLine2: item.patientAddressLine2,
            addressCity: item.patientAddressCity,
            addressPostalCode: item.patientAddressPostalCode,
            addressCountryCode: item.patientAddressCountryCode,
          },
        });
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: { appointmentIds },
    });
  },
    { maxWait: 10_000, timeout: 30_000 },
  );
}

function formatOrderMoney(currencyCode: string, cents: number): string {
  const code = currencyCode.toUpperCase() || "EUR";
  const symbol =
    code === "EUR" ? "€" : code === "CZK" ? "Kč " : code === "BRL" ? "R$" : `${code} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function orderHasConsultation(order: {
  items: { kind: import("@prisma/client").CartItemKind }[];
  appointmentIds: string[];
}): boolean {
  return orderHasConsultationItem(order.items) || order.appointmentIds.length > 0;
}

async function sendShopOrderConfirmationEmail(
  paidOrder: {
    email: string;
    fullName: string;
    id: string;
    orderNumber?: string | null;
    currencyCode: string;
    totalCents: number;
    items: { name: string; quantity: number; lineTotalCents: number }[];
    shipName: string | null;
    shipLine1: string | null;
    shipLine2: string | null;
    shipCity: string | null;
    shipPostalCode: string | null;
    shipCountryCode: string | null;
  },
  log: PaymentLog,
) {
  const fmt = (cents: number) => formatOrderMoney(paidOrder.currencyCode, cents);
  await sendOrderConfirmationEmail({
    to: paidOrder.email,
    fullName: paidOrder.fullName,
    orderId: paidOrder.id,
    orderNumber: paidOrder.orderNumber,
    totalLabel: fmt(paidOrder.totalCents),
    items: paidOrder.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      lineLabel: fmt(i.lineTotalCents),
    })),
    shipAddress: paidOrder.shipName
      ? {
          name: paidOrder.shipName,
          line1: paidOrder.shipLine1 ?? "",
          line2: paidOrder.shipLine2,
          city: paidOrder.shipCity ?? "",
          postalCode: paidOrder.shipPostalCode ?? "",
          countryCode: paidOrder.shipCountryCode ?? "",
        }
      : null,
  });
}

/**
 * Idempotent post-payment automations for consultation orders (Meet link +
 * confirmation messages). Safe to call when an order is already PAID — e.g.
 * admin Meet auto-provision or payment sync retries.
 */
export async function ensureOrderPaidAutomations(
  orderId: string,
  log: PaymentLog = noopLog,
  opts?: { sendShopConfirmation?: boolean },
) {
  await stopPrePaymentFlowOnPaid(orderId).catch(() => undefined);

  const paidOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  const hasConsult =
    Boolean(paidOrder && orderHasConsultationItem(paidOrder.items)) ||
    (paidOrder?.appointmentIds.length ?? 0) > 0;
  // #region agent log
  fetch('http://127.0.0.1:7835/ingest/b6dd0b3b-c589-4acc-8726-e91e7b7039d1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'694d12'},body:JSON.stringify({sessionId:'694d12',hypothesisId:'C',location:'complete-order-payment.service.ts:ensureOrderPaidAutomations',message:'automation branch',data:{orderId,hasConsult,itemKinds:paidOrder?.items.map(i=>i.kind)??[],paymentStatus:paidOrder?.paymentStatus,status:paidOrder?.status,sendShopConfirmation:opts?.sendShopConfirmation??false,postPaymentStage:paidOrder?.postPaymentStage??null,hasMeetingUrl:Boolean(paidOrder?.meetingUrl?.trim())},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (!paidOrder || !orderIsPaidForMeet(paidOrder)) return;

  if (hasConsult) {
    const {
      POST_PAYMENT_STAGE_MEETING_LINK,
      POST_PAYMENT_STAGE_PAID,
      post_sendMeetingLinkNotifications,
    } = await import("../automation/post-payment-flow.service.js");

    if (paidOrder.meetingUrl?.trim()) {
      const fresh = await prisma.order.findUnique({
        where: { id: orderId },
        select: { postPaymentStage: true },
      });
      if (
        fresh &&
        fresh.postPaymentStage >= POST_PAYMENT_STAGE_PAID &&
        fresh.postPaymentStage < POST_PAYMENT_STAGE_MEETING_LINK
      ) {
        await post_sendMeetingLinkNotifications(orderId).catch((err) => {
          log.warn({ err, orderId }, "Meeting-link notifications failed");
        });
      }
      return;
    }

    try {
      const { autoProvisionOrderMeetOnPaid } = await import(
        "../admin-orders/generate-order-meet-link.service.js"
      );
      await autoProvisionOrderMeetOnPaid(orderId, log);
      const afterMeet = await prisma.order.findUnique({
        where: { id: orderId },
        select: { meetingUrl: true, postPaymentStage: true },
      });
      // #region agent log
      fetch('http://127.0.0.1:7835/ingest/b6dd0b3b-c589-4acc-8726-e91e7b7039d1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'694d12'},body:JSON.stringify({sessionId:'694d12',hypothesisId:'D',location:'complete-order-payment.service.ts:afterAutoProvision',message:'after autoProvision',data:{orderId,hasMeetingUrl:Boolean(afterMeet?.meetingUrl?.trim()),postPaymentStage:afterMeet?.postPaymentStage??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    } catch (meetErr) {
      log.warn({ err: meetErr, orderId }, "Order Meet auto-provision import failed");
    }
    return;
  }

  if (!opts?.sendShopConfirmation) return;

  // #region agent log
  fetch('http://127.0.0.1:7835/ingest/b6dd0b3b-c589-4acc-8726-e91e7b7039d1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'694d12'},body:JSON.stringify({sessionId:'694d12',hypothesisId:'C',location:'complete-order-payment.service.ts:shopEmail',message:'sending shop confirmation email',data:{orderId,itemKinds:paidOrder.items.map(i=>i.kind)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  try {
    await sendShopOrderConfirmationEmail(paidOrder, log);
  } catch (emailErr) {
    log.warn({ err: emailErr, orderId }, "Order confirmation email failed");
  }
}

/** Fallback when Stripe webhook did not reach the server (common in local dev). */
export async function syncOrderPaymentFromStripe(
  orderId: string,
  log: PaymentLog = noopLog,
): Promise<SyncOrderPaymentResult> {
  if (!isStripeConfigured()) {
    return { ok: false, code: "STRIPE_NOT_CONFIGURED" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, paymentStatus: true, status: true, stripeSessionId: true },
  });
  if (!order) return { ok: false, code: "NOT_FOUND" };
  if (order.paymentStatus === "PAID" || order.status === "PAID") {
    await ensureOrderPaidAutomations(orderId, log);
    return { ok: true, code: "ALREADY_PAID" };
  }
  if (!order.stripeSessionId) {
    return { ok: false, code: "NO_SESSION" };
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
  if (session.payment_status !== "paid") {
    return { ok: false, code: "NOT_PAID", paymentStatus: session.payment_status ?? undefined };
  }

  const result = await completeOrderPaymentFromCheckoutSession(
    orderId,
    {
      id: session.id,
      payment_intent:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      client_reference_id: session.client_reference_id,
      metadata: (session.metadata ?? undefined) as Record<string, string> | undefined,
    },
    { stripeEventId: `sync_${session.id}`, eventType: "checkout.session.sync" },
    log,
  );

  return { ok: true, code: result.alreadyPaid ? "ALREADY_PAID" : "SYNCED" };
}

/** Sync by Stripe Checkout session id (success URL fallback). */
export async function syncOrderPaymentFromStripeSession(
  stripeSessionId: string,
  log: PaymentLog = noopLog,
): Promise<SyncOrderPaymentResult> {
  if (!isStripeConfigured()) {
    return { ok: false, code: "STRIPE_NOT_CONFIGURED" };
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
  if (session.payment_status !== "paid") {
    return { ok: false, code: "NOT_PAID", paymentStatus: session.payment_status ?? undefined };
  }

  const orderId =
    session.client_reference_id ??
    session.metadata?.orderId ??
    null;
  if (!orderId) {
    return { ok: false, code: "NOT_FOUND" };
  }

  return syncOrderPaymentFromStripe(orderId, log);
}
