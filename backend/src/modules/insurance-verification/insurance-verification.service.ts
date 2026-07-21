import type { FastifyBaseLogger } from "fastify";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { sendEmail } from "../../lib/email/send-email.js";
import { wrapHtml } from "../../lib/email/templates.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import { computeEffectivePrices } from "../orders/effective-pricing.service.js";
import {
  resolveOrderPaymentUrl,
  orderPayShortLink,
} from "../orders/order-payment-url.service.js";
import { startPrePaymentFlow } from "../automation/pre-payment-flow.service.js";

/**
 * Insurance card manual-verification flow.
 *
 * Insurance consultations don't pay through the cart — the patient's card must
 * be verified by a human first. On checkout the order is parked in
 * `insuranceVerificationStatus = PENDING` with its slot reserved (no Stripe
 * session, no auto-cancel). This module:
 *   - alerts the company's configured admins (email + WhatsApp + portal bell)
 *     with a link to the order to verify;
 *   - applies the admin's decision:
 *       VERIFIED  → keep the insurance price, send the patient a payment link
 *                   (then the normal pre-payment → pay → meet-link flow runs);
 *       REJECTED  → re-price the order to the standard price for the SAME
 *                   doctor + slot, tell the patient their card couldn't be
 *                   verified, and send a payment link at that standard price.
 */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function adminOrderUrl(orderId: string): string {
  const base = env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
  return `${base}/admin/orders/${orderId}`;
}

type OrderWithInsurance = {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  countryCode: string;
  currencyCode: string;
  totalCents: number;
  shippingCents: number;
  insuranceCompanyId: string | null;
  insuranceVerificationStatus: string | null;
  items: {
    id: string;
    name: string;
    kind: string;
    serviceId: string | null;
    doctorId: string | null;
    timeSlotId: string | null;
    quantity: number;
    unitPriceCents: number;
    insuranceCompanyId: string | null;
    patientWhatsappConsent: boolean;
  }[];
};

async function loadOrder(orderId: string): Promise<OrderWithInsurance | null> {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      countryCode: true,
      currencyCode: true,
      totalCents: true,
      shippingCents: true,
      insuranceCompanyId: true,
      insuranceVerificationStatus: true,
      items: {
        select: {
          id: true,
          name: true,
          kind: true,
          serviceId: true,
          doctorId: true,
          timeSlotId: true,
          quantity: true,
          unitPriceCents: true,
          insuranceCompanyId: true,
          patientWhatsappConsent: true,
        },
      },
    },
  });
}

/**
 * Alert the insurance company's configured admins that a booking needs card
 * verification. Best-effort per channel — a failed send is logged, never throws.
 */
export async function notifyAdminsOfInsuranceOrder(
  orderId: string,
  log?: FastifyBaseLogger,
): Promise<void> {
  const order = await loadOrder(orderId);
  if (!order || !order.insuranceCompanyId) return;
  const company = await prisma.insuranceCompany.findUnique({
    where: { id: order.insuranceCompanyId },
    select: { name: true, notifyEmails: true, notifyWhatsappNumbers: true },
  });
  if (!company) return;

  const serviceName = order.items[0]?.name ?? "Consultation";
  const verifyUrl = adminOrderUrl(order.id);

  const emailHtml = wrapHtml("Insurance booking to verify", `
    <p>A patient booked an insurance consultation that needs manual card verification before payment.</p>
    <ul>
      <li><strong>Company:</strong> ${esc(company.name)}</li>
      <li><strong>Patient:</strong> ${esc(order.fullName)} (${esc(order.email)})</li>
      <li><strong>Service:</strong> ${esc(serviceName)}</li>
    </ul>
    <p>Open the order to view the card number and mark it verified or not verified:</p>
    <p style="margin:24px 0;text-align:center;"><a href="${esc(verifyUrl)}" style="background:#B0F122;color:#0a1f14;padding:11px 20px;border-radius:999px;text-decoration:none;font-weight:700;">Verify insurance</a></p>
    <p style="font-size:12px;color:#737373;">${esc(verifyUrl)}</p>
  `);
  const waText =
    `🩺 Insurance booking to verify\n` +
    `Company: ${company.name}\n` +
    `Patient: ${order.fullName}\n` +
    `Service: ${serviceName}\n` +
    `Verify: ${verifyUrl}`;

  for (const email of company.notifyEmails) {
    try {
      await sendEmail({
        to: email,
        subject: `Insurance booking to verify — ${company.name}`,
        html: emailHtml,
        text: `Insurance booking to verify.\nCompany: ${company.name}\nPatient: ${order.fullName} (${order.email})\nService: ${serviceName}\nVerify: ${verifyUrl}`,
      });
    } catch (err) {
      log?.warn({ err, orderId, email }, "insurance admin email failed");
    }
  }
  for (const number of company.notifyWhatsappNumbers) {
    try {
      // Staff number → no patientConsent gate.
      await sendWhatsAppText({ to: number, message: waText });
    } catch (err) {
      log?.warn({ err, orderId, number }, "insurance admin whatsapp failed");
    }
  }
}

export type InsuranceDecision = "VERIFIED" | "REJECTED";

/**
 * Apply an admin's card-verification decision to a PENDING insurance order.
 * Returns { ok:false } with a message for the caller to surface as a 4xx.
 */
export async function applyInsuranceVerificationDecision(
  orderId: string,
  decision: InsuranceDecision,
  log?: FastifyBaseLogger,
): Promise<{ ok: boolean; message?: string }> {
  // Atomically claim the decision: flip PENDING → the chosen status in one
  // conditional write. Concurrent decisions (two admins, double-click) race
  // here — only the first flip finds a PENDING row, so the second gets
  // count === 0 and is rejected. This is the single source of idempotency for
  // the whole flow (re-pricing, payment link, patient message all run once).
  const claim = await prisma.order.updateMany({
    where: { id: orderId, insuranceVerificationStatus: "PENDING" },
    data: { insuranceVerificationStatus: decision },
  });
  if (claim.count === 0) {
    return { ok: false, message: "This order is not awaiting insurance verification." };
  }

  const order = await loadOrder(orderId);
  if (!order) return { ok: false, message: "Order not found" };
  const company = order.insuranceCompanyId
    ? await prisma.insuranceCompany.findUnique({
        where: { id: order.insuranceCompanyId },
        select: { name: true },
      })
    : null;
  const companyName = company?.name ?? "your insurer";

  if (decision === "REJECTED") {
    // Re-price the insurance line(s) to the STANDARD price for the same doctor
    // + slot (the negotiated discount no longer applies), clear the insurance
    // snapshot, and recompute the order totals.
    const standardByItem = await computeEffectivePrices(
      order.items.map((i) => ({
        id: i.id,
        kind: i.kind,
        serviceId: i.serviceId,
        doctorId: i.doctorId,
        timeSlotId: i.timeSlotId,
        insuranceCompanyId: null, // force standard price (ignore insurance)
      })),
    );
    await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      for (const item of order.items) {
        const standard = standardByItem.get(item.id) ?? item.unitPriceCents;
        subtotal += standard * item.quantity;
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            unitPriceCents: standard,
            lineTotalCents: standard * item.quantity,
            insuranceCompanyId: null,
            insurancePolicyNumber: null,
            insurancePriceCents: null,
          },
        });
      }
      await tx.order.update({
        where: { id: order.id },
        // Status already flipped to REJECTED by the atomic claim above.
        data: {
          insuranceCompanyId: null,
          subtotalCents: subtotal,
          totalCents: subtotal + order.shippingCents,
        },
      });
    });
  }
  // VERIFIED needs no further order write — the claim already set the status,
  // and the insurance price is already on the items from checkout.

  // Mint / refresh the Stripe payment link off the order's CURRENT items
  // (insurance price when VERIFIED, standard price when REJECTED).
  const paymentUrl = await resolveOrderPaymentUrl(orderId);
  const payLink = orderPayShortLink(orderId);

  // Notify the patient with a decision-specific message + the pay link.
  const fresh = await loadOrder(orderId);
  const amount = fresh ? formatMoney(fresh.totalCents, fresh.currencyCode) : "";
  const consent = order.items[0]?.patientWhatsappConsent ?? true;

  if (decision === "VERIFIED") {
    const html = wrapHtml("Your insurance was verified", `
      <p>Good news — your ${esc(companyName)} insurance card was verified.</p>
      <p>Complete your booking at your insurance price (<strong>${esc(amount)}</strong>):</p>
      <p style="margin:24px 0;text-align:center;"><a href="${esc(payLink)}" style="background:#B0F122;color:#0a1f14;padding:11px 20px;border-radius:999px;text-decoration:none;font-weight:700;">Pay &amp; confirm</a></p>
      <p style="font-size:12px;color:#737373;">${esc(payLink)}</p>
    `);
    await safeSend(order.email, `Insurance verified — complete your booking`, html,
      `Your ${companyName} insurance was verified. Pay to confirm (${amount}): ${payLink}`,
      order.phone, consent, order.countryCode, log, orderId);
  } else {
    const html = wrapHtml("We couldn't verify your insurance card", `
      <p>Unfortunately we were unable to verify your ${esc(companyName)} insurance card.</p>
      <p>You can still book this consultation with the same doctor and time at the standard price (<strong>${esc(amount)}</strong>):</p>
      <p style="margin:24px 0;text-align:center;"><a href="${esc(payLink)}" style="background:#B0F122;color:#0a1f14;padding:11px 20px;border-radius:999px;text-decoration:none;font-weight:700;">Book at standard price</a></p>
      <p style="font-size:12px;color:#737373;">${esc(payLink)}</p>
    `);
    await safeSend(order.email, `Insurance card could not be verified`, html,
      `We couldn't verify your ${companyName} insurance card. Book at the standard price (${amount}): ${payLink}`,
      order.phone, consent, order.countryCode, log, orderId);
  }

  // Kick off the standard pre-payment reminders + auto-cancel. For website
  // (non-portal) orders this sets up the flow WITHOUT sending its own initial
  // message, so it won't duplicate the decision message above.
  void startPrePaymentFlow(orderId, paymentUrl || null).catch((err) => {
    log?.warn({ err, orderId }, "insurance pre-payment flow start failed");
  });

  return { ok: true };
}

async function safeSend(
  email: string,
  subject: string,
  html: string,
  text: string,
  phone: string | null,
  consent: boolean,
  countryCode: string,
  log: FastifyBaseLogger | undefined,
  orderId: string,
): Promise<void> {
  try {
    await sendEmail({ to: email, subject, html, text });
  } catch (err) {
    log?.warn({ err, orderId }, "insurance patient email failed");
  }
  if (phone) {
    try {
      await sendWhatsAppText({
        to: phone,
        message: text,
        hints: { orderCountryCode: countryCode },
        patientConsent: consent,
      });
    } catch (err) {
      log?.warn({ err, orderId }, "insurance patient whatsapp failed");
    }
  }
}
