import { prisma } from "../../db/prisma.js";
import { generateCreditNoteForOrder } from "../invoices/generate-invoice.service.js";
import { detectAutomationLanguage, type AutomationLang } from "./pre-payment-messages.js";
import { whatsappContactFooter } from "./whatsapp-contact-footer.js";
import { formatOrderTotal, resolvePatientFullName } from "./pre-payment-email-template.js";
import { formatOrderDisplayId } from "./automation-catalog.js";
import { createAutomationRun, finishAutomationRun } from "./automation-run.service.js";
import { sendAutomationEmail } from "./send-automation-notification.js";
import { wrapHtml } from "../../lib/email/templates.js";
import { sendWhatsAppText, formatWhatsAppSendError } from "../../lib/whatsapp/wasender.js";
import type { PhoneNormalizeHints } from "../../lib/whatsapp/normalize-phone.js";

/**
 * Order-refund notifications. Fires once per order when it is marked REFUNDED
 * (from the admin refund endpoint OR the Stripe `charge.refunded` webhook —
 * whichever runs first; the other is a no-op via the automation-run guard).
 *
 * Does three things:
 *   1. Non-Portugal → issues a CREDIT_NOTE (reuses the invoice PDF template) and
 *      emails it to the patient — this doubles as the refund confirmation email.
 *   2. Portugal → sends a plain refund-confirmation email (no credit note: PT
 *      fiscal docs live in InvoiceExpress).
 *   3. Sends a refund WhatsApp to the patient (consent-gated).
 */

export const ORDER_REFUND_AUTOMATION_KEY = "order_refund";

type Ctx = {
  fullName: string;
  orderRef: string;
  totalLabel: string;
};

function t(lang: AutomationLang, map: Record<AutomationLang, string>): string {
  return map[lang] ?? map.en;
}

function refundWhatsAppMessage(lang: AutomationLang, ctx: Ctx): string {
  return t(lang, {
    en: `Hi ${ctx.fullName}, your refund for order #${ctx.orderRef} (${ctx.totalLabel}) has been processed. It can take 5–10 business days to appear on your statement.`,
    pt: `Olá ${ctx.fullName}, o reembolso da encomenda #${ctx.orderRef} (${ctx.totalLabel}) foi processado. Pode demorar 5 a 10 dias úteis a aparecer no seu extrato.`,
    ro: `Bună ${ctx.fullName}, rambursarea pentru comanda #${ctx.orderRef} (${ctx.totalLabel}) a fost procesată. Poate dura 5–10 zile lucrătoare să apară pe extrasul dvs.`,
    cs: `Dobrý den ${ctx.fullName}, vrácení peněz za objednávku #${ctx.orderRef} (${ctx.totalLabel}) bylo zpracováno. Na výpisu se může objevit za 5–10 pracovních dnů.`,
    es: `Hola ${ctx.fullName}, su reembolso del pedido #${ctx.orderRef} (${ctx.totalLabel}) ha sido procesado. Puede tardar de 5 a 10 días hábiles en reflejarse en su estado de cuenta.`,
  });
}

function refundEmailSubject(lang: AutomationLang, ctx: Ctx): string {
  return t(lang, {
    en: `Refund processed — order #${ctx.orderRef}`,
    pt: `Reembolso processado — encomenda #${ctx.orderRef}`,
    ro: `Rambursare procesată — comanda #${ctx.orderRef}`,
    cs: `Vrácení peněz zpracováno — objednávka #${ctx.orderRef}`,
    es: `Reembolso procesado — pedido #${ctx.orderRef}`,
  });
}

function refundEmailBody(lang: AutomationLang, ctx: Ctx): string {
  return t(lang, {
    en: `Hi ${ctx.fullName},\n\nYour refund for order #${ctx.orderRef} (${ctx.totalLabel}) has been processed. It can take 5–10 business days to appear on your statement, depending on your bank.\n\nIf you have any questions, just reply to this email.\n\n— Global Health`,
    pt: `Olá ${ctx.fullName},\n\nO reembolso da encomenda #${ctx.orderRef} (${ctx.totalLabel}) foi processado. Pode demorar 5 a 10 dias úteis a aparecer no seu extrato, dependendo do seu banco.\n\nSe tiver alguma dúvida, responda a este e-mail.\n\n— Global Health`,
    ro: `Bună ${ctx.fullName},\n\nRambursarea pentru comanda #${ctx.orderRef} (${ctx.totalLabel}) a fost procesată. Poate dura 5–10 zile lucrătoare să apară pe extrasul dvs., în funcție de bancă.\n\nDacă aveți întrebări, răspundeți la acest e-mail.\n\n— Global Health`,
    cs: `Dobrý den ${ctx.fullName},\n\nVrácení peněz za objednávku #${ctx.orderRef} (${ctx.totalLabel}) bylo zpracováno. Na výpisu se může objevit za 5–10 pracovních dnů podle vaší banky.\n\nMáte-li dotazy, odpovězte na tento e-mail.\n\n— Global Health`,
    es: `Hola ${ctx.fullName},\n\nSu reembolso del pedido #${ctx.orderRef} (${ctx.totalLabel}) ha sido procesado. Puede tardar de 5 a 10 días hábiles en reflejarse en su estado de cuenta, según su banco.\n\nSi tiene alguna pregunta, responda a este correo.\n\n— Global Health`,
  });
}

function refundEmailHtml(body: string): string {
  const paras = body
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return wrapHtml("Refund processed", paras);
}

/**
 * Send the refund email + WhatsApp for an order, and issue a credit note
 * (non-PT). Idempotent — a prior `order_refund` automation run for the order
 * short-circuits the whole flow so redelivery / dual triggers don't double-send.
 */
export async function sendOrderRefundNotifications(orderId: string): Promise<void> {
  // Idempotency: if we've already run refund notifications for this order, stop.
  const prior = await prisma.automationRun.findFirst({
    where: { orderId, automationKey: { startsWith: ORDER_REFUND_AUTOMATION_KEY } },
    select: { id: true },
  });
  if (prior) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      countryCode: true,
      currencyCode: true,
      totalCents: true,
      orderNumber: true,
      items: {
        select: { name: true, patientFullName: true, patientWhatsappConsent: true, patientAddressCountryCode: true },
      },
    },
  });
  if (!order) return;

  const isPT = order.countryCode.toLowerCase() === "pt";
  const primary = order.items[0];
  const lang = detectAutomationLanguage({ countryCode: order.countryCode, serviceName: primary?.name });
  const ctx: Ctx = {
    fullName: resolvePatientFullName(order.fullName, primary?.patientFullName),
    orderRef: formatOrderDisplayId({ id: order.id, orderNumber: order.orderNumber }),
    totalLabel: formatOrderTotal(order.totalCents, order.currencyCode),
  };

  // 1 + 2. Fiscal document / email.
  if (isPT) {
    // No credit note in PT — send a plain refund confirmation email.
    const run = await createAutomationRun({
      automationKey: `${ORDER_REFUND_AUTOMATION_KEY}_email`,
      orderId: order.id,
      channel: "email",
      recipient: order.email,
      summary: "Refund confirmation email",
      status: "RUNNING",
    });
    try {
      const body = refundEmailBody(lang, ctx);
      await sendAutomationEmail(
        {
          to: order.email,
          subject: refundEmailSubject(lang, ctx),
          text: body,
          html: refundEmailHtml(body),
        },
        { recordLabel: ctx.orderRef },
      );
      await finishAutomationRun(run.id, { status: "SUCCESS", summary: "Refund confirmation email" });
    } catch (err) {
      await finishAutomationRun(run.id, {
        status: "FAILED",
        summary: "Refund confirmation email",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    // Credit note issuance emails the patient the credit-note PDF (= refund email).
    const run = await createAutomationRun({
      automationKey: `${ORDER_REFUND_AUTOMATION_KEY}_credit_note`,
      orderId: order.id,
      channel: "email",
      recipient: order.email,
      summary: "Credit note issued + emailed",
      status: "RUNNING",
    });
    try {
      const cn = await generateCreditNoteForOrder(order.id);
      await finishAutomationRun(run.id, {
        status: cn ? "SUCCESS" : "SKIPPED",
        summary: cn ? `Credit note ${cn.invoiceNumber} issued + emailed` : "Credit note skipped (no invoice prefix)",
      });
    } catch (err) {
      await finishAutomationRun(run.id, {
        status: "FAILED",
        summary: "Credit note issuance failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 3. Refund WhatsApp to the patient (consent-gated).
  const consent = primary?.patientWhatsappConsent ?? false;
  const waKey = `${ORDER_REFUND_AUTOMATION_KEY}_whatsapp`;
  if (!consent) {
    await createAutomationRun({
      automationKey: waKey,
      orderId: order.id,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: "Refund WhatsApp (no WhatsApp consent)",
      executedAt: new Date(),
    });
    return;
  }
  if (!order.phone?.trim()) {
    await createAutomationRun({
      automationKey: waKey,
      orderId: order.id,
      channel: "whatsapp",
      status: "SKIPPED",
      summary: "Refund WhatsApp (no phone)",
      executedAt: new Date(),
    });
    return;
  }

  const hints: PhoneNormalizeHints = {
    orderCountryCode: order.countryCode,
    patientAddressCountryCode: primary?.patientAddressCountryCode ?? null,
  };
  const run = await createAutomationRun({
    automationKey: waKey,
    orderId: order.id,
    channel: "whatsapp",
    recipient: order.phone,
    summary: "Refund WhatsApp",
    status: "RUNNING",
  });
  const result = await sendWhatsAppText({
    to: order.phone,
    message: refundWhatsAppMessage(lang, ctx) + whatsappContactFooter(lang),
    hints,
    patientConsent: consent,
  });
  if (!result.ok && !result.skipped) {
    await finishAutomationRun(run.id, {
      status: "FAILED",
      summary: "Refund WhatsApp",
      error: formatWhatsAppSendError(result),
      recipient: result.to ?? order.phone,
    });
    return;
  }
  await finishAutomationRun(run.id, {
    status: result.skipped ? "SKIPPED" : "SUCCESS",
    summary: result.skipped ? "Refund WhatsApp (WhatsApp not configured)" : "Refund WhatsApp",
    recipient: result.to ?? order.phone,
  });
}
