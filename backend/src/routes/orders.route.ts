import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { CartItemKind, OrderStatus, PaymentStatus, type Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import {
  getStripeClient,
  isStripeConfigured,
  resolveCheckoutPaymentMethods,
} from "../lib/stripe/client.js";
import { env } from "../config/env.js";
import { generateOrderNumber } from "../lib/order-number.js";
import { buildPtStripeInvoiceData } from "../modules/invoices/pt-stripe-invoice-data.js";
import { checkoutBranding } from "../modules/billing/checkout-branding.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { verifyAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  ensurePaidOrderMeetLink,
  orderHasConsultationItem,
  orderNeedsAutoMeetLink,
} from "../modules/admin-orders/generate-order-meet-link.service.js";
import { startPrePaymentFlow } from "../modules/automation/pre-payment-flow.service.js";
import { completeOrderPaymentFromCheckoutSession } from "../modules/orders/complete-order-payment.service.js";
import {
  commitOrderCreditReservations,
  linkReservationsToOrderItems,
  releaseOrderCreditReservations,
  reserveAndPriceConsultations,
} from "../modules/subscriptions/checkout-pricing.service.js";
import { resolveCorporateDiscountsForItems } from "../modules/corporate/corporate-benefit.service.js";
import { computeEffectivePrices } from "../modules/orders/effective-pricing.service.js";
import {
  computeOrderCommission,
  findUnsellableCommissionLine,
  isCommissionCountry,
} from "../modules/orders/commission.service.js";
import {
  assertOrderCountryScope,
  resolveOrderListCountryScope,
} from "../utils/order-country-scope.js";
import { recordCriticalAudit } from "../modules/audit/audit.service.js";
import { releaseSlotsToBaseGrid } from "../modules/doctor-availability/doctor-availability.service.js";
import { sendOrderRefundNotifications } from "../modules/automation/refund-notifications.service.js";
import { cancelOrderAppointments } from "../modules/appointments/appointments.service.js";
import { resolveOrderPaymentUrl } from "../modules/orders/order-payment-url.service.js";
import { notifyAdminsOfInsuranceOrder, applyInsuranceVerificationDecision } from "../modules/insurance-verification/insurance-verification.service.js";
import { decryptPhi } from "../lib/crypto/phi-crypto.js";

/**
 * Orders + checkout.
 *
 *   POST /api/cart/checkout         → cart → Order PENDING + Stripe Session
 *   GET  /api/account/orders         → patient's own orders
 *   GET  /api/account/orders/:id     → patient's own order detail
 *   GET  /api/admin/orders           → admin list
 *   PATCH /api/admin/orders/:id      → status transitions (FULFILLED/CANCELLED)
 *
 * The payments webhook (in payments.route.ts) was extended to handle
 * `metadata.kind === "order"` events.
 */

const CART_COOKIE = "gh_cart";

// Prisma include that pulls each order's consultation appointment(s) plus the
// assigned doctor's name — so every order surface (admin + patient) can show
// "which doctor, at what time" without a second round-trip. Shared by the
// four order-read handlers below.
const orderConsultationsInclude = {
  orderAppointments: {
    include: {
      appointment: {
        select: {
          id: true,
          scheduledAt: true,
          consultationType: true,
          doctor: { select: { fullName: true } },
        },
      },
    },
  },
} as const;

type OrderConsultationDto = {
  appointmentId: string;
  doctorName: string | null;
  scheduledAt: string | null;
  consultationType: string;
};

const CONSULTATION_ITEM_KINDS: CartItemKind[] = [
  CartItemKind.GENERAL_CONSULTATION,
  CartItemKind.SPECIALIST_CONSULTATION,
];

type OrderItemForConsultationFallback = {
  id: string;
  kind: CartItemKind;
  appointmentId: string | null;
  doctorId: string | null;
  timeSlotId: string | null;
};

type ConsultationFallbackContext = {
  doctorNameById: Map<string, string>;
  slotStartById: Map<string, Date>;
};

/** Batch-resolve doctor names + slot start times for consultation `OrderItem`s
 *  that haven't been minted into an Appointment yet (order still PENDING, or
 *  CANCELLED before payment ever reached the webhook). `doctorId`/`timeSlotId`
 *  are plain scalars on `OrderItem` — there's no Prisma relation to `include`
 *  them through — so this does one batched pair of lookups covering every
 *  order in a list response, instead of an include or per-order query. */
async function resolveUnmintedConsultationContext(
  itemLists: OrderItemForConsultationFallback[][],
): Promise<ConsultationFallbackContext> {
  const unminted = itemLists
    .flat()
    .filter((i) => i.appointmentId === null && CONSULTATION_ITEM_KINDS.includes(i.kind));
  const doctorIds = [
    ...new Set(unminted.map((i) => i.doctorId).filter((id): id is string => id !== null)),
  ];
  const slotIds = [
    ...new Set(unminted.map((i) => i.timeSlotId).filter((id): id is string => id !== null)),
  ];

  const [doctors, slots] = await Promise.all([
    prisma.doctor.findMany({ where: { id: { in: doctorIds } }, select: { id: true, fullName: true } }),
    prisma.doctorTimeSlot.findMany({ where: { id: { in: slotIds } }, select: { id: true, startAt: true } }),
  ]);

  return {
    doctorNameById: new Map(doctors.map((d) => [d.id, d.fullName])),
    slotStartById: new Map(slots.map((s) => [s.id, s.startAt])),
  };
}

/** Flatten an order's `orderAppointments` join into a lean, wire-ready list of
 *  consultations (earliest scheduled first; unscheduled last), falling back
 *  to the reserving `OrderItem`'s doctor/slot — via the batched `context` —
 *  for consultation lines that never got an Appointment minted (no payment
 *  yet, or cancelled first). */
function buildOrderConsultations(
  orderAppointments: {
    appointment: {
      id: string;
      scheduledAt: Date | null;
      consultationType: string;
      doctor: { fullName: string } | null;
    } | null;
  }[],
  items: OrderItemForConsultationFallback[] = [],
  context?: ConsultationFallbackContext,
): OrderConsultationDto[] {
  const minted = orderAppointments
    .map((oa) => oa.appointment)
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .map((a) => ({
      appointmentId: a.id,
      doctorName: a.doctor?.fullName ?? null,
      scheduledAt: a.scheduledAt,
      consultationType: a.consultationType,
    }));

  const unminted = items
    .filter((i) => i.appointmentId === null && CONSULTATION_ITEM_KINDS.includes(i.kind))
    .map((i) => ({
      appointmentId: i.id,
      doctorName: (i.doctorId ? context?.doctorNameById.get(i.doctorId) : null) ?? null,
      scheduledAt: (i.timeSlotId ? context?.slotStartById.get(i.timeSlotId) : null) ?? null,
      consultationType: i.kind as string,
    }));

  return [...minted, ...unminted]
    .sort(
      (a, b) =>
        (a.scheduledAt?.getTime() ?? Number.POSITIVE_INFINITY) -
        (b.scheduledAt?.getTime() ?? Number.POSITIVE_INFINITY),
    )
    .map((c) => ({ ...c, scheduledAt: c.scheduledAt?.toISOString() ?? null }));
}

const checkoutBodySchema = z.object({
  email: z.string().trim().email("Invalid email"),
  fullName: z.string().trim().min(2, "Name too short").max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  // Shipping fields are optional — checkouts with only online
  // consultations don't ship. The handler nulls them out before
  // saving the Order when none are supplied.
  shipName: z.string().trim().max(120).optional().or(z.literal("")),
  shipLine1: z.string().trim().max(200).optional().or(z.literal("")),
  shipLine2: z.string().trim().max(200).optional().or(z.literal("")),
  shipCity: z.string().trim().max(120).optional().or(z.literal("")),
  shipPostalCode: z.string().trim().max(40).optional().or(z.literal("")),
  shipCountryCode: z.string().trim().max(4).optional().or(z.literal("")),
  /** Where Stripe should return after success / cancel — relative path. */
  returnTo: z
    .string()
    .trim()
    .regex(/^\/[a-z0-9/-]*$/i)
    .max(200)
    .optional(),
});

const orderIdParamSchema = z.object({ id: z.string().min(1).max(120) });
// Status transition and tracking-field updates share this endpoint. Both are
// optional so a tracking-only PATCH doesn't have to resend status, but at
// least one of them must be present (checked below the parse).
const adminPatchSchema = z
  .object({
    status: z.enum([OrderStatus.FULFILLED, OrderStatus.CANCELLED, OrderStatus.PAID]).optional(),
    trackingNumber: z.string().trim().max(200).nullable().optional(),
    trackingCarrier: z.string().trim().max(120).nullable().optional(),
    trackingUrl: z.string().trim().url().max(500).nullable().optional().or(z.literal("")),
  })
  .refine(
    (v) =>
      v.status !== undefined ||
      v.trackingNumber !== undefined ||
      v.trackingCarrier !== undefined ||
      v.trackingUrl !== undefined,
    { message: "No fields to update" },
  );

async function resolveActiveCartForCheckout(
  request: FastifyRequest,
): Promise<{
  cartId: string | null;
  userId: string | null;
}> {
  let userId: string | null = null;
  try {
    const user = await resolveOptionalAuthUser(request);
    if (user && user.role === "PATIENT") userId = user.id;
  } catch {
    // ignore
  }

  if (userId) {
    const userCart = await prisma.cart.findUnique({ where: { userId } });
    return { cartId: userCart?.id ?? null, userId };
  }

  const cookieToken = (request.cookies as Record<string, string | undefined>)[CART_COOKIE];
  if (!cookieToken) return { cartId: null, userId: null };
  const guestCart = await prisma.cart.findUnique({ where: { cookieToken } });
  return { cartId: guestCart?.id ?? null, userId: null };
}

const ordersRoute: FastifyPluginAsync = async (app) => {
  // ── Checkout: cart → Order PENDING + Stripe session ───────────────
  app.post(
    "/api/cart/checkout",
    { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } },
    async (request, reply) => {
      // Stripe is gated below — only required when the order total is > 0.
      // Fully credit-covered (€0) consultation orders confirm without Stripe
      // (§36.3), so we don't hard-block here anymore.
      const body = checkoutBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid checkout data", body.error.flatten()));
      }

      try {
        const { cartId, userId } = await resolveActiveCartForCheckout(request);
        if (!cartId) {
          return reply.status(400).send(errorResponse("Cart is empty"));
        }

        const cart = await prisma.cart.findUnique({
          where: { id: cartId },
          include: { items: { orderBy: { createdAt: "asc" } } },
        });
        if (!cart || cart.items.length === 0) {
          return reply.status(400).send(errorResponse("Cart is empty"));
        }

        // Insurance is booked ALONE (enforced at add-to-cart). Re-check here
        // BEFORE creating the order so a mixed cart — e.g. one produced by a
        // guest→user cart merge — can never enter the insurance flow (which
        // skips Stripe) with non-insurance items riding along. Reject early so
        // no orphan order/slot is created.
        const cartInsuranceCount = cart.items.filter((i) => i.insuranceCompanyId).length;
        if (cartInsuranceCount > 0 && cartInsuranceCount !== cart.items.length) {
          return reply.status(400).send(
            errorResponse(
              "An insurance consultation must be booked on its own. Please remove the other items and try again.",
            ),
          );
        }

        // Anti-manipulation gate: re-derive the price of every consultation
        // line from the CURRENT peak-pricing config and the slot's own
        // clinic-local start time (shared with the read-only price preview).
        // The cart snapshot (i.unitPriceCents) is display-only and could be
        // stale (admin changed prices) or forged; the amount we record on the
        // Order and charge via Stripe must be the server-recomputed one.
        const effectivePriceByItemId = await computeEffectivePrices(cart.items);
        const effectiveUnitPrice = (i: { id: string; unitPriceCents: number }) =>
          effectivePriceByItemId.get(i.id) ?? i.unitPriceCents;

        // Per-item shipping snapshot, summed across every line. Online
        // consultations carry shippingCents=0, so a cart of just
        // consultations totals to subtotal. Physical items (health
        // tests, prescription delivery) add their admin-set fee.
        const shippingCents = cart.items.reduce(
          (s, i) => s + (i.shippingCents ?? 0) * i.quantity,
          0,
        );
        const currency = cart.currencyCode.toLowerCase();

        // Shipping address gate. HEALTH_TEST kits get posted to the
        // patient, so we always need an address for them. Other kinds
        // (consultations, online prescriptions) only need it when the
        // admin opted into a non-zero per-item shipping fee. Reject up
        // front rather than create a half-formed order.
        const needsShippingAddress =
          cart.items.some((i) => i.kind === "HEALTH_TEST") || shippingCents > 0;
        if (needsShippingAddress) {
          const ship = body.data;
          const missing = !ship.shipName ||
            !ship.shipLine1 ||
            !ship.shipCity ||
            !ship.shipPostalCode ||
            !ship.shipCountryCode;
          if (missing) {
            return reply
              .status(400)
              .send(errorResponse(
                "Shipping address required for this order. Please provide a name, address, city, postal code, and country code.",
              ));
          }
        }

        // Commission markets (Brazil): our fiscal document bills the commission,
        // i.e. price − doctor payout, so every consultation line needs a payout
        // configured before it can be sold. The cart already blocks this at
        // add-to-cart; re-check here because an admin can un-set a payout in
        // between, and because a merged guest cart bypasses that entry point.
        const isCommissionOrder = await isCommissionCountry(cart.countryCode);
        if (isCommissionOrder) {
          const unsellable = await findUnsellableCommissionLine(cart.countryCode, cart.items);
          if (unsellable) {
            return reply.status(400).send(
              errorResponse(
                "That doctor is not available for this service right now. Please pick another doctor.",
              ),
            );
          }
        }

        // Create Order + OrderItems in one tx so a partial state is impossible
        const orderNumber = await generateOrderNumber();
        const txResult = await prisma.$transaction(async (tx) => {
          // Subscription pricing (§21): logged-in users only (D15). Reserves
          // credits / applies discounts on consultation lines inside the tx so
          // a reservation rolls back with the order.
          const planResult = userId
            ? await reserveAndPriceConsultations(tx, {
                userId,
                countryCode: cart.countryCode,
                // Insurance-priced lines are excluded from the subscription
                // engine: the negotiated insurance price is final and must not
                // consume a plan credit or stack a plan discount (§ no-overlap).
                items: cart.items
                  .filter((i) => !i.insuranceCompanyId)
                  .map((i) => ({
                    id: i.id,
                    kind: i.kind,
                    serviceId: i.serviceId,
                    unitPriceCents: effectiveUnitPrice(i),
                    benefitSelection: i.benefitSelection,
                    familyMemberId: i.familyMemberId,
                  })),
                peakPriceByItemId: effectivePriceByItemId,
              })
            : {
                subscriptionId: null,
                lines: new Map<
                  string,
                  { finalUnitPriceCents: number; creditCovered: boolean; reservationId?: string }
                >(),
              };
          // Corporate benefit engine (plan doc §3.3): automatic % discount
          // for active corporate members on eligible lines the subscription
          // plan did NOT already benefit-price. Recomputed server-side
          // inside the tx — never trusted from the client. No stacking:
          // plan benefit (credit/discount) wins, else corporate.
          const corporateDiscounts = await resolveCorporateDiscountsForItems(tx, {
            userId,
            // Same exclusion as the subscription engine — insurance price wins.
            items: cart.items
              .filter((i) => !i.insuranceCompanyId)
              .map((i) => ({
                id: i.id,
                kind: i.kind,
                serviceId: i.serviceId,
                baseCents: effectiveUnitPrice(i),
              })),
          });
          const corporateLineDiscount = (
            i: { id: string; unitPriceCents: number; insuranceCompanyId?: string | null },
          ): number => {
            if (i.insuranceCompanyId) return 0;
            const planLine = planResult.lines.get(i.id);
            const base = effectiveUnitPrice(i);
            const planBenefitApplied = Boolean(
              planLine && (planLine.creditCovered || planLine.finalUnitPriceCents < base),
            );
            if (planBenefitApplied) return 0;
            return corporateDiscounts.get(i.id)?.discountCents ?? 0;
          };
          const finalUnitPrice = (
            i: { id: string; unitPriceCents: number; insuranceCompanyId?: string | null },
          ) =>
            // Insurance lines: the validated insurance price (effectiveUnitPrice)
            // is final, no plan/corporate layer applies.
            i.insuranceCompanyId
              ? effectiveUnitPrice(i)
              : (planResult.lines.get(i.id)?.finalUnitPriceCents ?? effectiveUnitPrice(i)) -
                corporateLineDiscount(i);
          const subtotalCents = cart.items.reduce(
            (s, i) => s + finalUnitPrice(i) * i.quantity,
            0,
          );
          const totalCents = subtotalCents + shippingCents;

          // Commission markets: freeze the doctor payout and our commission onto
          // the order now, at the final prices. A SNAPSHOT on purpose — the payout
          // statement resolves payouts live, so an admin editing an amount later
          // must not silently rewrite an already-issued fiscal document.
          // Reads run on the pooled client rather than `tx`: payout config is
          // reference data none of this transaction writes.
          const commission = isCommissionOrder
            ? await computeOrderCommission(
                cart.items.map((i) => ({
                  id: i.id,
                  serviceId: i.serviceId,
                  doctorId: i.doctorId,
                  insuranceCompanyId: i.insuranceCompanyId,
                  quantity: i.quantity,
                  unitPriceCents: finalUnitPrice(i),
                })),
                shippingCents,
                { countryCode: cart.countryCode },
              )
            : null;
          const commissionByCartItemId = new Map(
            (commission?.lines ?? []).map((l) => [l.id as string, l]),
          );

          const created = await tx.order.create({
            data: {
              orderNumber,
              userId: userId ?? null,
              email: body.data.email,
              fullName: body.data.fullName,
              phone: body.data.phone || null,
              countryCode: cart.countryCode,
              currencyCode: cart.currencyCode,
              subtotalCents,
              shippingCents,
              totalCents,
              // Null outside commission markets — "not applicable", not zero.
              commissionTotalCents: commission?.commissionTotalCents ?? null,
              doctorPayoutTotalCents: commission?.doctorPayoutTotalCents ?? null,
              shipName: body.data.shipName || null,
              shipLine1: body.data.shipLine1 || null,
              shipLine2: body.data.shipLine2 || null,
              shipCity: body.data.shipCity || null,
              shipPostalCode: body.data.shipPostalCode || null,
              shipCountryCode: body.data.shipCountryCode
                ? body.data.shipCountryCode.toUpperCase()
                : null,
              items: {
                create: cart.items.map((i) => ({
                  kind: i.kind,
                  healthTestId: i.healthTestId,
                  serviceId: i.serviceId,
                  name: i.name,
                  unitPriceCents: finalUnitPrice(i),
                  quantity: i.quantity,
                  lineTotalCents: finalUnitPrice(i) * i.quantity,
                  timeSlotId: i.timeSlotId,
                  doctorId: i.doctorId,
                  // Patient intake snapshot: carry the cart-page form
                  // data onto the order line so the payment webhook can
                  // mint the Appointment without re-reading the (now
                  // cleared) cart.
                  patientFullName: i.patientFullName,
                  patientEmail: i.patientEmail,
                  patientPhone: i.patientPhone,
                  patientDateOfBirth: i.patientDateOfBirth,
                  patientNotes: i.patientNotes,
                  patientConsentAcceptedAt: i.patientConsentAcceptedAt,
                  bookingForOther: i.bookingForOther,
                  // Per-line benefit choice + family target → carried for audit
                  // (which lines drew on a credit/discount, for which dependent).
                  benefitSelection: i.benefitSelection,
                  familyMemberId: i.familyMemberId,
                  // Corporate discount audit trail (unitPriceCents above is
                  // already discounted; these record how much + which company).
                  corporateDiscountCents: corporateLineDiscount(i) > 0 ? corporateLineDiscount(i) : null,
                  corporateCompanyId:
                    corporateLineDiscount(i) > 0
                      ? corporateDiscounts.get(i.id)?.companyId ?? null
                      : null,
                  // Carry the new booking snapshot through to the order
                  // item; the payment webhook reads it to mint Appointment.
                  patientNationalIdNumber: i.patientNationalIdNumber,
                  patientUtenteNumber: i.patientUtenteNumber,
                  patientTimezone: i.patientTimezone,
                  patientAddressLine1: i.patientAddressLine1,
                  patientAddressLine2: i.patientAddressLine2,
                  patientAddressCity: i.patientAddressCity,
                  patientAddressState: i.patientAddressState,
                  patientAddressPostalCode: i.patientAddressPostalCode,
                  patientAddressCountryCode: i.patientAddressCountryCode,
                  patientGdprConsentClinic: i.patientGdprConsentClinic,
                  patientGdprConsentPlatform: i.patientGdprConsentPlatform,
                  patientGdprConsentedAt: i.patientGdprConsentedAt,
                  patientWhatsappConsent: i.patientWhatsappConsent,
                  patientCrossBorderConsentAccepted: i.patientCrossBorderConsentAccepted,
                  patientMedicalAccessConsentScope: i.patientMedicalAccessConsentScope,
                  // Insurance snapshot carried to the order line. unitPriceCents
                  // above already reflects the insurance price for these lines;
                  // these columns record the company + encrypted policy + the
                  // resolved price for audit / the appointment-mint webhook.
                  insuranceCompanyId: i.insuranceCompanyId,
                  insurancePolicyNumber: i.insurancePolicyNumber,
                  insurancePriceCents: i.insuranceCompanyId ? finalUnitPrice(i) : null,
                  // Commission-market snapshot (see the block above).
                  doctorPayoutCents: commissionByCartItemId.get(i.id)?.doctorPayoutCents ?? null,
                  commissionCents: commissionByCartItemId.get(i.id)?.commissionCents ?? null,
                })),
              },
            },
            include: { items: true },
          });
          // Link each reservation to its OrderItem (consultation lines carry a
          // unique timeSlotId) so commit/release can find them by order.
          const cartToOrderItem = new Map<string, string>();
          for (const ci of cart.items) {
            if (!ci.timeSlotId) continue;
            const oi = created.items.find((o) => o.timeSlotId === ci.timeSlotId);
            if (oi) cartToOrderItem.set(ci.id, oi.id);
          }
          await linkReservationsToOrderItems(tx, planResult.lines, cartToOrderItem);
          return { order: created, subtotalCents, totalCents };
        }, { timeout: 15_000 });
        const order = txResult.order;
        const totalCents = txResult.totalCents;

        // ── €0 fully-credit order → confirm without Stripe (§36.3) ────
        // No charge exists, so commit the credit reservations now and run the
        // normal paid-order fulfilment (appointment minting) via a synthetic
        // session. The commit is idempotent and mutually exclusive with the
        // release sweep.
        if (totalCents === 0) {
          await commitOrderCreditReservations(order.id);
          await completeOrderPaymentFromCheckoutSession(
            order.id,
            {
              id: `free_${order.id}`,
              payment_intent: null,
              invoice: null,
              client_reference_id: order.id,
              metadata: { kind: "order", orderId: order.id, countryCode: cart.countryCode },
            },
            { stripeEventId: `free_${order.id}`, eventType: "free_order" },
            app.log,
          );
          await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
          await prisma.cart.update({
            where: { id: cart.id },
            data: { countryCode: "", currencyCode: "", abandonedEmailSentAt: null },
          });
          return okResponse({ orderId: order.id, url: null, free: true });
        }

        // ── Insurance order → manual card verification (no instant Stripe) ──
        // A cart holding an insurance consultation is booked ALONE (enforced at
        // add-to-cart), so the whole order is that single insurance line. Don't
        // charge now: reserve the slot, park the order in PENDING verification,
        // and alert the company's admins to verify the card. The patient is
        // charged only after an admin verifies (insurance price) or rejects
        // (standard price) — see insurance-verification.service.
        const insuranceItem = order.items.find((i) => i.insuranceCompanyId);
        if (insuranceItem) {
          // Firmly reserve the slot(s): HELD auto-releases after ~15 min, so
          // commit HELD→BOOKED for the whole verification window. No appointment
          // is minted yet — that happens on payment like any cart consultation.
          const slotIds = order.items
            .map((i) => i.timeSlotId)
            .filter((x): x is string => Boolean(x));
          if (slotIds.length > 0) {
            await prisma.doctorTimeSlot.updateMany({
              where: { id: { in: slotIds }, status: { in: ["HELD", "OPEN"] } },
              data: { status: "BOOKED" },
            });
          }
          await prisma.order.update({
            where: { id: order.id },
            data: {
              insuranceVerificationStatus: "PENDING",
              insuranceCompanyId: insuranceItem.insuranceCompanyId,
              paymentStatus: "UNPAID",
            },
          });
          void notifyAdminsOfInsuranceOrder(order.id, app.log).catch((err) => {
            app.log.warn({ err, orderId: order.id }, "Insurance admin-notify failed");
          });
          // Clear the cart (items moved to the order).
          await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
          await prisma.cart.update({
            where: { id: cart.id },
            data: { countryCode: "", currencyCode: "", abandonedEmailSentAt: null },
          });
          return okResponse({
            orderId: order.id,
            url: null,
            insurancePendingVerification: true,
          });
        }

        // Paid order → Stripe is required from here on.
        if (!isStripeConfigured(cart.countryCode)) {
          return reply
            .status(503)
            .send(errorResponse("Payments not configured. Set STRIPE_SECRET_KEY."));
        }

        // Build Stripe line_items (one per cart item + a shipping line)
        const stripe = getStripeClient(cart.countryCode);
        const lineItems: Array<{
          quantity: number;
          price_data: {
            currency: string;
            unit_amount: number;
            product_data: { name: string };
          };
        }> = order.items
          // Credit-covered (€0) lines carry no Stripe line-item; paid lines
          // proceed (mixed-cart rule, §36.17).
          .filter((i) => i.unitPriceCents > 0)
          .map((i) => ({
            quantity: i.quantity,
            price_data: {
              currency,
              unit_amount: i.unitPriceCents,
              product_data: { name: i.name },
            },
          }));
        if (shippingCents > 0) {
          lineItems.push({
            quantity: 1,
            price_data: {
              currency,
              unit_amount: shippingCents,
              product_data: { name: "Shipping" },
            },
          });
        }

        const baseUrl =
          env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
        const returnBase = body.data.returnTo ?? "/checkout";
        const successUrl = `${baseUrl}${returnBase}/success?orderId=${order.id}&payment=ok&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${baseUrl}${returnBase}/cancelled?orderId=${order.id}&payment=cancelled`;

        // Portugal: enrich the auto-created Stripe invoice with NIF + service
        // name so InvoiceExpress issues a complete invoice. Non-PT → plain
        // invoice_creation (Stripe's own invoice, no InvoiceExpress).
        //
        // Commission markets are the exception: Stripe's invoice would be for the
        // FULL amount charged, directly contradicting the commission-only receipt
        // we issue — and the patient can see both. Suppress it so our document is
        // the only one.
        const invoiceCreation = isCommissionOrder
          ? { enabled: false }
          : (await buildPtStripeInvoiceData(
              cart.countryCode,
              body.data.email,
              order.items[0]?.name ?? "Medical Consultation",
            )) ?? { enabled: true };

        const paymentMethodConfig = await resolveCheckoutPaymentMethods(
          stripe,
          cart.countryCode,
          body.data.email,
        );
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          ...paymentMethodConfig,
          client_reference_id: order.id,
          line_items: lineItems,
          success_url: successUrl,
          cancel_url: cancelUrl,
          invoice_creation: invoiceCreation,
          // Global Health branding: pin the page language to the order's market
          // and add the trust line above the pay button.
          ...(await checkoutBranding(cart.countryCode)),
          metadata: {
            kind: "order",
            orderId: order.id,
            countryCode: cart.countryCode,
          },
        });

        await prisma.order.update({
          where: { id: order.id },
          data: {
            stripeSessionId: session.id,
            paymentStatus: "PENDING",
            stripeCheckoutUrl: session.url ?? null,
          },
        });

        // Website self-serve checkout: 15-minute pay window, one abandonment
        // message, then a silent cancel — NOT the hours-before-consultation
        // ladder that manual and insurance bookings run on.
        void startPrePaymentFlow(order.id, session.url ?? null, { webCheckout: true }).catch((err) => {
          app.log.warn({ err, orderId: order.id }, "Pre-payment flow start failed");
        });

        // Clear the cart (items moved to order)
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        await prisma.cart.update({
          where: { id: cart.id },
          data: { countryCode: "", currencyCode: "", abandonedEmailSentAt: null },
        });

        return okResponse({ orderId: order.id, url: session.url, sessionId: session.id });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Checkout failed"));
      }
    },
  );

  // ── Patient: list own orders ───────────────────────────────────────
  app.get("/api/account/orders", async (request, reply) => {
    let user;
    try {
      user = await resolveOptionalAuthUser(request);
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      return reply.status(500).send(errorResponse("Auth error"));
    }
    if (!user) return reply.status(401).send(errorResponse("Not authenticated"));
    if (user.role !== "PATIENT" && user.role !== "ADMIN") {
      return reply.status(403).send(errorResponse("Forbidden"));
    }

    try {
      // Scope strictly to userId — guest orders placed with this user's
      // email are linked explicitly via `claimGuestOrdersForUser` at
      // register/login. Matching by email here would let any user view
      // orders other people placed with their email address.
      const orders = await prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: { items: true, ...orderConsultationsInclude },
      });
      const consultationCtx = await resolveUnmintedConsultationContext(orders.map((o) => o.items));
      return okResponse({
        items: orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          paymentStatus: o.paymentStatus,
          countryCode: o.countryCode,
          currencyCode: o.currencyCode,
          subtotalCents: o.subtotalCents,
          shippingCents: o.shippingCents,
          totalCents: o.totalCents,
          itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
          consultations: buildOrderConsultations(o.orderAppointments, o.items, consultationCtx),
          paidAt: o.paidAt?.toISOString() ?? null,
          createdAt: o.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load orders"));
    }
  });

  // ── Public: post-checkout receipt by order id ─────────────────────
  // Used by the /checkout/success page so guest checkouts (which have
  // userId: null and therefore can't authenticate against the patient
  // endpoint below) still see their line items and total. Returns
  // minimal, non-PII fields keyed off the unguessable CUID. Email,
  // phone, and full shipping address are kept off this payload — the
  // patient endpoint stays the source of truth for authenticated reads.
  app.get<{ Params: { id: string } }>(
    "/api/orders/:id/receipt",
    async (request, reply) => {
      const params = orderIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      try {
        const order = await prisma.order.findUnique({
          where: { id: params.data.id },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            currencyCode: true,
            subtotalCents: true,
            shippingCents: true,
            totalCents: true,
            paidAt: true,
            createdAt: true,
            items: {
              select: { id: true, kind: true, name: true, quantity: true, lineTotalCents: true },
            },
          },
        });
        if (!order) return reply.status(404).send(errorResponse("Order not found"));
        // This endpoint is UNAUTHENTICATED (guest-checkout support), keyed
        // only on the order CUID. It must not return PII — name, email,
        // phone and address are deliberately omitted. Authenticated reads
        // go through the patient order endpoint.
        return okResponse({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          currencyCode: order.currencyCode,
          subtotalCents: order.subtotalCents,
          shippingCents: order.shippingCents,
          totalCents: order.totalCents,
          items: order.items,
          paidAt: order.paidAt?.toISOString() ?? null,
          createdAt: order.createdAt.toISOString(),
        });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not load order"));
      }
    },
  );

  // ── Public short pay-link resolver ─────────────────────────────────
  // Backs the branded `${SITE}/pay/:id` short link sent over WhatsApp/email.
  // Unauthenticated (keyed on the unguessable order CUID). Returns the live
  // Stripe Checkout URL, or `payable: false` when the order is no longer
  // payable (resolveOrderPaymentUrl returns "" for cancelled/paid). The
  // frontend `/pay/:id` route issues the browser redirect.
  app.get<{ Params: { id: string } }>(
    "/api/orders/:id/pay-url",
    async (request, reply) => {
      const params = orderIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
      try {
        const url = await resolveOrderPaymentUrl(params.data.id);
        if (url) return okResponse({ url, payable: true, status: "PAYABLE" });
        // Not payable — tell the caller WHY so the pay page can show the right
        // message (already paid vs cancelled/expired) instead of a dead link.
        const order = await prisma.order.findUnique({
          where: { id: params.data.id },
          select: { status: true, paymentStatus: true },
        });
        let status: "PAID" | "CANCELLED" | "UNAVAILABLE" = "UNAVAILABLE";
        if (order) {
          if (order.paymentStatus === "PAID" || order.status === "PAID") status = "PAID";
          else if (
            order.status === "CANCELLED" ||
            order.status === "REFUNDED" ||
            order.paymentStatus === "REFUNDED"
          ) {
            status = "CANCELLED";
          }
        }
        return okResponse({ url: null, payable: false, status });
      } catch (err) {
        app.log.error({ err, orderId: params.data.id }, "pay-url resolve failed");
        return okResponse({ url: null, payable: false, status: "UNAVAILABLE" });
      }
    },
  );

  // ── Patient: own order detail ──────────────────────────────────────
  app.get<{ Params: { id: string } }>(
    "/api/account/orders/:id",
    async (request, reply) => {
      let user;
      try {
        user = await resolveOptionalAuthUser(request);
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        return reply.status(500).send(errorResponse("Auth error"));
      }
      if (!user) return reply.status(401).send(errorResponse("Not authenticated"));

      const params = orderIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      try {
        const order = await prisma.order.findFirst({
          where: {
            id: params.data.id,
            userId: user.id,
          },
          include: { items: true, ...orderConsultationsInclude },
        });
        if (!order) return reply.status(404).send(errorResponse("Order not found"));
        const consultationCtx = await resolveUnmintedConsultationContext([order.items]);
        return okResponse({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          countryCode: order.countryCode,
          currencyCode: order.currencyCode,
          subtotalCents: order.subtotalCents,
          shippingCents: order.shippingCents,
          totalCents: order.totalCents,
          email: order.email,
          fullName: order.fullName,
          phone: order.phone,
          ship: {
            name: order.shipName,
            line1: order.shipLine1,
            line2: order.shipLine2,
            city: order.shipCity,
            postalCode: order.shipPostalCode,
            countryCode: order.shipCountryCode,
          },
          items: order.items.map((i) => ({
            id: i.id,
            kind: i.kind,
            name: i.name,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
            lineTotalCents: i.lineTotalCents,
            // Needed so the frontend "Reorder" button can call the same
            // cart-add endpoint the product pages use — without these the
            // order detail page has no product identity to re-add.
            healthTestId: i.healthTestId,
            serviceId: i.serviceId,
          })),
          consultations: buildOrderConsultations(order.orderAppointments, order.items, consultationCtx),
          trackingNumber: order.trackingNumber,
          trackingCarrier: order.trackingCarrier,
          trackingUrl: order.trackingUrl,
          paidAt: order.paidAt?.toISOString() ?? null,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not load order"));
      }
    },
  );

  // ── Admin: list all orders ─────────────────────────────────────────
  /** Treat `?status=` (an empty select) as absent instead of a parse error. */
  const blankToUndefined = (v: unknown) =>
    typeof v === "string" && v.trim() === "" ? undefined : v;

  const adminOrdersQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().min(1).max(120).optional(),
    status: z.preprocess(blankToUndefined, z.nativeEnum(OrderStatus).optional()),
    paymentStatus: z.preprocess(blankToUndefined, z.nativeEnum(PaymentStatus).optional()),
    countryCode: z.preprocess(blankToUndefined, z.string().trim().min(2).max(4).optional()),
    q: z.preprocess(blankToUndefined, z.string().trim().min(1).max(120).optional()),
    /** Doctor filter — case-insensitive substring of the assigned doctor's name. */
    doctorName: z.preprocess(blankToUndefined, z.string().trim().min(1).max(160).optional()),
    /** Order-date (createdAt) range, inclusive. */
    createdFrom: z.preprocess(blankToUndefined, z.coerce.date().optional()),
    createdTo: z.preprocess(blankToUndefined, z.coerce.date().optional()),
    /** Consultation-date (appointment.scheduledAt) range, inclusive. */
    consultFrom: z.preprocess(blankToUndefined, z.coerce.date().optional()),
    consultTo: z.preprocess(blankToUndefined, z.coerce.date().optional()),
  });

  /** Push a plain `YYYY-MM-DD` to the last instant of that day so `lte` covers it. */
  function endOfDay(d: Date): Date {
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  app.get("/api/admin/orders", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const query = adminOrdersQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid orders query", query.error.flatten()));
    }
    const {
      limit,
      cursor,
      status,
      paymentStatus,
      countryCode,
      q,
      doctorName,
      createdFrom,
      createdTo,
      consultFrom,
      consultTo,
    } = query.data;

    // LOCAL_ADMIN folder scope (code review 2026-07-05, bug #4) — restrict
    // the list to the admin's assigned countries. null means unscoped
    // (ADMIN/SUPER_ADMIN); an empty array means a LOCAL_ADMIN with no
    // assigned folders sees nothing (fail closed), not everything.
    const scopedFolders = await resolveOrderListCountryScope(request);

    // Combine the admin's explicit ?countryCode= filter with their scope:
    // requesting a country outside scope must return zero rows, not the
    // scope's full set (which would silently ignore the admin's filter) and
    // not every country (which would leak out-of-scope orders).
    let countryCodeFilter: string | { in: string[] } | undefined;
    if (countryCode && scopedFolders) {
      const requested = countryCode.toLowerCase();
      countryCodeFilter = scopedFolders.includes(requested) ? requested : { in: [] };
    } else if (countryCode) {
      countryCodeFilter = countryCode.toLowerCase();
    } else if (scopedFolders) {
      countryCodeFilter = { in: scopedFolders };
    }

    // Filters compose — every clause is ANDed, so they narrow, never widen.
    // `q` is a case-insensitive OR across order number / id / patient name /
    // email / phone / assigned doctor. Doctor, order-date and consultation-date
    // each get their own clause: two of them target the SAME `orderAppointments`
    // relation, so they must live in an AND array — merged into one object
    // literal the later key would silently overwrite the earlier one.
    // countryCode is stored lowercase (see manual-booking.service.ts) — this
    // filter previously uppercased it, silently matching nothing.
    const and: Prisma.OrderWhereInput[] = [];
    if (status) and.push({ status });
    if (paymentStatus) and.push({ paymentStatus });
    if (countryCodeFilter !== undefined) and.push({ countryCode: countryCodeFilter });

    if (q) {
      const contains = { contains: q, mode: "insensitive" as const };
      and.push({
        OR: [
          { email: contains },
          { fullName: contains },
          { phone: contains },
          { id: { contains: q } },
          { orderNumber: contains },
          // Free text also reaches the assigned doctor, so typing "Silva" in
          // the search box finds that doctor's consultation orders.
          { orderAppointments: { some: { appointment: { doctor: { fullName: contains } } } } },
        ],
      });
    }

    if (doctorName) {
      and.push({
        orderAppointments: {
          some: {
            appointment: {
              doctor: { fullName: { contains: doctorName, mode: "insensitive" } },
            },
          },
        },
      });
    }

    if (createdFrom || createdTo) {
      and.push({
        createdAt: {
          ...(createdFrom ? { gte: createdFrom } : {}),
          ...(createdTo ? { lte: endOfDay(createdTo) } : {}),
        },
      });
    }

    if (consultFrom || consultTo) {
      and.push({
        orderAppointments: {
          some: {
            appointment: {
              scheduledAt: {
                ...(consultFrom ? { gte: consultFrom } : {}),
                ...(consultTo ? { lte: endOfDay(consultTo) } : {}),
              },
            },
          },
        },
      });
    }

    try {
      // Cursor pagination off Order.id — stable because id is a cuid.
      const orders = await prisma.order.findMany({
        where: and.length ? { AND: and } : {},
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            select: {
              id: true,
              quantity: true,
              kind: true,
              appointmentId: true,
              doctorId: true,
              timeSlotId: true,
            },
          },
          invoices: { where: { documentType: { not: "CREDIT_NOTE" } }, select: { id: true }, take: 1 },
          ...orderConsultationsInclude,
        },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const hasMore = orders.length > limit;
      const page = hasMore ? orders.slice(0, limit) : orders;
      const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;
      const consultationCtx = await resolveUnmintedConsultationContext(page.map((o) => o.items));

      const needingMeet = page.filter((o) =>
        orderNeedsAutoMeetLink({
          meetingUrl: o.meetingUrl,
          status: o.status,
          paymentStatus: o.paymentStatus,
          items: o.items,
        }),
      );
      if (needingMeet.length > 0) {
        await Promise.all(
          needingMeet.map((o) =>
            ensurePaidOrderMeetLink(o.id).catch((err) => {
              request.log.warn({ err, orderId: o.id }, "Auto Meet link on admin list failed");
              return null;
            }),
          ),
        );
      }

      const meetingUrlById = new Map<string, string | null>(
        page.map((o) => [o.id, o.meetingUrl]),
      );
      if (needingMeet.length > 0) {
        const refreshed = await prisma.order.findMany({
          where: { id: { in: needingMeet.map((o) => o.id) } },
          select: { id: true, meetingUrl: true },
        });
        for (const row of refreshed) {
          meetingUrlById.set(row.id, row.meetingUrl);
        }
      }

      return okResponse({
        items: page.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          paymentStatus: o.paymentStatus,
          email: o.email,
          fullName: o.fullName,
          countryCode: o.countryCode,
          currencyCode: o.currencyCode,
          totalCents: o.totalCents,
          itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
          meetingUrl: meetingUrlById.get(o.id) ?? o.meetingUrl,
          hasConsultation: orderHasConsultationItem(o.items),
          invoiceId: o.invoices[0]?.id ?? null,
          consultations: buildOrderConsultations(o.orderAppointments, o.items, consultationCtx),
          // Suppress the pay link once the order is no longer payable
          // (cancelled / refunded / already paid).
          stripeCheckoutUrl:
            o.status === OrderStatus.CANCELLED ||
            o.status === OrderStatus.REFUNDED ||
            o.paymentStatus === PaymentStatus.PAID ||
            o.paymentStatus === PaymentStatus.REFUNDED
              ? null
              : o.stripeCheckoutUrl ?? null,
          paidAt: o.paidAt?.toISOString() ?? null,
          createdAt: o.createdAt.toISOString(),
        })),
        nextCursor,
      });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load orders"));
    }
  });

  // ── Admin: order detail ────────────────────────────────────────────
  app.get<{ Params: { id: string } }>(
    "/api/admin/orders/:id",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = orderIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      try {
        const order = await prisma.order.findUnique({
          where: { id: params.data.id },
          include: { items: true, ...orderConsultationsInclude },
        });
        if (!order) return reply.status(404).send(errorResponse("Order not found"));

        const scope = await assertOrderCountryScope(request, order.id, order.countryCode);
        if (!scope.allowed) {
          return reply.status(scope.status).send(errorResponse(scope.message));
        }

        let meetingUrl = order.meetingUrl;
        if (
          orderNeedsAutoMeetLink({
            meetingUrl: order.meetingUrl,
            status: order.status,
            paymentStatus: order.paymentStatus,
            items: order.items,
          })
        ) {
          await ensurePaidOrderMeetLink(order.id).catch((err) => {
            request.log.warn({ err, orderId: order.id }, "Auto Meet link on admin detail failed");
          });
          const fresh = await prisma.order.findUnique({
            where: { id: order.id },
            select: { meetingUrl: true },
          });
          meetingUrl = fresh?.meetingUrl ?? meetingUrl;
        }

        // Insurance verification block: surface the status + the DECRYPTED card
        // number so the admin can verify it against the insurer. Only present
        // for insurance orders (verificationStatus != null).
        let insurance: {
          verificationStatus: string;
          companyId: string | null;
          companyName: string | null;
          policyNumber: string | null;
          insurancePriceCents: number | null;
        } | null = null;
        if (order.insuranceVerificationStatus) {
          const insItem = order.items.find((i) => i.insuranceCompanyId) ?? null;
          const companyId = order.insuranceCompanyId ?? insItem?.insuranceCompanyId ?? null;
          const company = companyId
            ? await prisma.insuranceCompany.findUnique({
                where: { id: companyId },
                select: { name: true },
              })
            : null;
          let policyNumber: string | null = null;
          if (insItem?.insurancePolicyNumber) {
            try {
              policyNumber = decryptPhi(insItem.insurancePolicyNumber);
            } catch {
              policyNumber = null;
            }
          }
          insurance = {
            verificationStatus: order.insuranceVerificationStatus,
            companyId,
            companyName: company?.name ?? null,
            policyNumber,
            insurancePriceCents: insItem?.insurancePriceCents ?? null,
          };
        }

        // Project to a DTO instead of returning the raw Prisma row.
        // The raw row contains `stripeSessionId` + `stripePaymentIntentId`
        // which the admin UI doesn't need and which have no business
        // crossing the wire.
        return okResponse({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          insurance,
          countryCode: order.countryCode,
          currencyCode: order.currencyCode,
          subtotalCents: order.subtotalCents,
          shippingCents: order.shippingCents,
          totalCents: order.totalCents,
          // Admin discount applied at manual-booking time. The totals above are
          // already net of it; these are what was taken off, for the admin's
          // "why is this cheaper than the list price" answer.
          discountPercent: order.discountPercent,
          discountCents: order.discountCents,
          email: order.email,
          fullName: order.fullName,
          phone: order.phone,
          userId: order.userId,
          ship: {
            name: order.shipName,
            line1: order.shipLine1,
            line2: order.shipLine2,
            city: order.shipCity,
            postalCode: order.shipPostalCode,
            countryCode: order.shipCountryCode,
          },
          items: order.items.map((i) => ({
            id: i.id,
            kind: i.kind,
            name: i.name,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
            lineTotalCents: i.lineTotalCents,
            healthTestId: i.healthTestId,
            serviceId: i.serviceId,
            timeSlotId: i.timeSlotId,
            doctorId: i.doctorId,
            appointmentId: i.appointmentId,
          })),
          appointmentIds: order.appointmentIds,
          consultations: buildOrderConsultations(
            order.orderAppointments,
            order.items,
            await resolveUnmintedConsultationContext([order.items]),
          ),
          meetingUrl,
          trackingNumber: order.trackingNumber,
          trackingCarrier: order.trackingCarrier,
          trackingUrl: order.trackingUrl,
          paidAt: order.paidAt?.toISOString() ?? null,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not load order"));
      }
    },
  );

  // ── Admin: insurance card verification decision ────────────────────
  // Verified → keep the insurance price + send the patient a payment link.
  // Rejected → re-price to the standard price (same doctor + slot) + send the
  // patient a "card not verified" payment link. Both then run the normal
  // pre-payment → pay → meet-link flow.
  app.patch<{ Params: { id: string } }>(
    "/api/admin/orders/:id/insurance-verification",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = orderIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      const body = z
        .object({ decision: z.enum(["VERIFIED", "REJECTED"]) })
        .safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid decision", body.error.flatten()));
      }

      try {
        const order = await prisma.order.findUnique({
          where: { id: params.data.id },
          select: { id: true, countryCode: true },
        });
        if (!order) return reply.status(404).send(errorResponse("Order not found"));
        const scope = await assertOrderCountryScope(request, order.id, order.countryCode);
        if (!scope.allowed) {
          return reply.status(scope.status).send(errorResponse(scope.message));
        }

        const result = await applyInsuranceVerificationDecision(
          params.data.id,
          body.data.decision,
          request.log,
        );
        if (!result.ok) {
          return reply.status(409).send(errorResponse(result.message ?? "Could not apply decision"));
        }
        return okResponse({ ok: true, decision: body.data.decision });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not apply insurance decision"));
      }
    },
  );

  // ── Admin: bulk status transition ──────────────────────────────────
  app.post(
    "/api/admin/orders/bulk",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const bulkSchema = z.object({
        ids: z.array(z.string().min(1)).min(1).max(100),
        status: z.enum([OrderStatus.FULFILLED, OrderStatus.CANCELLED]),
      });
      const body = bulkSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid body", body.error.flatten()));
      }

      try {
        // LOCAL_ADMIN folder scope (code review 2026-07-05, bug #4) — a
        // bulk request can name orders spanning multiple countries; silently
        // applying it to all of them would let a LOCAL_ADMIN mutate orders
        // outside their assigned folders. Restrict to in-scope ids and
        // report what was excluded rather than failing the whole request or
        // silently dropping ids with no signal.
        const scopedFolders = await resolveOrderListCountryScope(request);
        let targetIds = body.data.ids;
        let skippedIds: string[] = [];
        if (scopedFolders) {
          const rows = await prisma.order.findMany({
            where: { id: { in: body.data.ids } },
            select: { id: true, countryCode: true },
          });
          const inScope = new Set(
            rows.filter((r) => scopedFolders.includes(r.countryCode.toLowerCase())).map((r) => r.id),
          );
          skippedIds = body.data.ids.filter((id) => !inScope.has(id));
          targetIds = body.data.ids.filter((id) => inScope.has(id));
          if (skippedIds.length > 0) {
            // S-008: security-relevant event (scope-violation attempt) —
            // audit write must not be silently swallowed.
            await recordCriticalAudit({
              actorUserId: resolveAdminSessionActor(request)?.userId ?? null,
              actorRole: "LOCAL_ADMIN",
              action: "SECURITY_ALERT_CREATED",
              entityType: "Order",
              entityId: skippedIds.join(","),
              metadata: {
                reason: "LOCAL_ADMIN bulk order update excluded out-of-scope ids",
                skippedIds,
                allowedCountryFolders: scopedFolders,
              },
              request,
            });
          }
        }

        if (targetIds.length === 0) {
          return okResponse({ count: 0, status: body.data.status, skippedIds });
        }

        // For cancellations, release HELD slots from all selected orders
        if (body.data.status === OrderStatus.CANCELLED) {
          const orders = await prisma.order.findMany({
            where: { id: { in: targetIds } },
            include: { items: true },
          });
          const heldSlotIds = orders
            .flatMap((o) => o.items.map((i) => i.timeSlotId))
            .filter((id): id is string => Boolean(id));
          if (heldSlotIds.length > 0) {
            await releaseSlotsToBaseGrid(heldSlotIds);
          }
        }

        const result = await prisma.order.updateMany({
          where: { id: { in: targetIds } },
          data: { status: body.data.status },
        });

        // Settle subscription credit reservations for each affected order,
        // mirroring the single-order PATCH (#17): CANCELLED releases, FULFILLED
        // commits. Idempotent + no-op without reservations.
        for (const orderId of targetIds) {
          if (body.data.status === OrderStatus.CANCELLED) {
            await releaseOrderCreditReservations(orderId).catch((err) => {
              request.log.error({ err, orderId }, "Bulk release order credit reservations failed");
            });
          } else if (body.data.status === OrderStatus.FULFILLED) {
            await commitOrderCreditReservations(orderId).catch((err) => {
              request.log.error({ err, orderId }, "Bulk commit order credit reservations failed");
            });
          }
        }
        return okResponse({
          count: result.count,
          status: body.data.status,
          ...(skippedIds.length > 0 ? { skippedIds } : {}),
        });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Bulk update failed"));
      }
    },
  );

  // ── Admin: status transition ───────────────────────────────────────
  app.patch<{ Params: { id: string } }>(
    "/api/admin/orders/:id",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = orderIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
      const body = adminPatchSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid body", body.error.flatten()));
      }

      try {
        // LOCAL_ADMIN folder scope (code review 2026-07-05, bug #4).
        const target = await prisma.order.findUnique({
          where: { id: params.data.id },
          select: { countryCode: true },
        });
        if (!target) return reply.status(404).send(errorResponse("Order not found"));
        const scope = await assertOrderCountryScope(request, params.data.id, target.countryCode);
        if (!scope.allowed) {
          return reply.status(scope.status).send(errorResponse(scope.message));
        }

        // If cancelling, release any HELD consultation slots back to OPEN
        // so other patients can claim them. Skip slots already BOOKED
        // (those are real appointments that need their own cancel flow).
        if (body.data.status === OrderStatus.CANCELLED) {
          const order = await prisma.order.findUnique({
            where: { id: params.data.id },
            include: { items: true },
          });
          if (order) {
            const heldSlotIds = order.items
              .map((i) => i.timeSlotId)
              .filter((id): id is string => Boolean(id));
            if (heldSlotIds.length > 0) {
              await releaseSlotsToBaseGrid(heldSlotIds);
            }
          }
        }

        const order = await prisma.order.update({
          where: { id: params.data.id },
          data: {
            ...(body.data.status !== undefined ? { status: body.data.status } : {}),
            ...(body.data.trackingNumber !== undefined ? { trackingNumber: body.data.trackingNumber || null } : {}),
            ...(body.data.trackingCarrier !== undefined ? { trackingCarrier: body.data.trackingCarrier || null } : {}),
            ...(body.data.trackingUrl !== undefined ? { trackingUrl: body.data.trackingUrl || null } : {}),
          },
        });

        // Settle any subscription credit reservations on this order (B11/#16).
        // PAID or FULFILLED → commit (RESERVED → CONSUMED); CANCELLED → release
        // (RESERVED → RELEASED, credit restored). FULFILLED must also commit: an
        // admin can transition PENDING→FULFILLED directly, which would otherwise
        // strand the reservation forever (the sweep only releases CANCELLED
        // orders). All are idempotent and no-ops for orders without reservations.
        if (body.data.status === OrderStatus.PAID || body.data.status === OrderStatus.FULFILLED) {
          await commitOrderCreditReservations(order.id).catch((err) => {
            request.log.error({ err, orderId: order.id }, "Commit order credit reservations failed");
          });
        } else if (body.data.status === OrderStatus.CANCELLED) {
          await releaseOrderCreditReservations(order.id).catch((err) => {
            request.log.error({ err, orderId: order.id }, "Release order credit reservations failed");
          });
          // Cancel the order's consultation appointments (releases BOOKED slots
          // and drops the events off the admin + doctor calendars).
          await cancelOrderAppointments(order.id).catch((err) => {
            request.log.error({ err, orderId: order.id }, "Cancel order appointments failed");
          });
          // Kill the payment link: expire the open Stripe checkout session so an
          // already-copied link stops working for an unpaid cancelled order.
          if (
            order.stripeSessionId &&
            order.paymentStatus !== PaymentStatus.PAID &&
            isStripeConfigured(order.countryCode)
          ) {
            try {
              await getStripeClient(order.countryCode).checkout.sessions.expire(order.stripeSessionId);
            } catch (err) {
              request.log.warn({ err, orderId: order.id }, "Expire checkout session on cancel failed");
            }
          }
        }
        return okResponse({
          id: order.id,
          status: order.status,
          trackingNumber: order.trackingNumber,
          trackingCarrier: order.trackingCarrier,
          trackingUrl: order.trackingUrl,
        });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not update order"));
      }
    },
  );

  // ── Admin: refund a paid order ─────────────────────────────────────
  // Issues a Stripe refund against the order's payment intent, then flips the
  // order to REFUNDED and releases any HELD slots + subscription credit
  // reservations (mirrors the CANCELLED path). Idempotent against the
  // `charge.refunded` webhook: whichever runs first sets REFUNDED, the other
  // no-ops (webhook skips if already REFUNDED; this endpoint guards on PAID).
  app.post<{ Params: { id: string } }>(
    "/api/admin/orders/:id/refund",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = orderIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      try {
        const order = await prisma.order.findUnique({
          where: { id: params.data.id },
          include: { items: true },
        });
        if (!order) return reply.status(404).send(errorResponse("Order not found"));

        const scope = await assertOrderCountryScope(request, order.id, order.countryCode);
        if (!scope.allowed) {
          return reply.status(scope.status).send(errorResponse(scope.message));
        }

        // Idempotency: an already-refunded order is a success, not an error.
        if (order.paymentStatus === PaymentStatus.REFUNDED || order.status === OrderStatus.REFUNDED) {
          return okResponse({ id: order.id, status: OrderStatus.REFUNDED, alreadyRefunded: true });
        }
        if (order.paymentStatus !== PaymentStatus.PAID) {
          return reply.status(409).send(errorResponse("Only a PAID order can be refunded"));
        }
        if (!order.stripePaymentIntentId) {
          return reply.status(409).send(errorResponse("Order has no Stripe payment to refund"));
        }
        if (!isStripeConfigured(order.countryCode)) {
          return reply.status(503).send(errorResponse("Stripe is not configured for this account"));
        }

        // Refund at the provider FIRST — only mutate the order once the money
        // has actually been returned, so a provider failure leaves state intact.
        try {
          const stripe = getStripeClient(order.countryCode);
          await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
        } catch (err) {
          request.log.error({ err, orderId: order.id }, "Stripe refund failed");
          const message = err instanceof Error ? err.message : "Provider refund failed";
          return reply.status(502).send(errorResponse(message));
        }

        const updated = await prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.REFUNDED, paymentStatus: PaymentStatus.REFUNDED },
        });

        // Release HELD consultation slots and subscription credit reservations,
        // mirroring the CANCELLED transition. Both idempotent / no-op when absent.
        const heldSlotIds = order.items
          .map((i) => i.timeSlotId)
          .filter((id): id is string => Boolean(id));
        if (heldSlotIds.length > 0) {
          await releaseSlotsToBaseGrid(heldSlotIds).catch((err) => {
            request.log.error({ err, orderId: order.id }, "Release slots on refund failed");
          });
        }
        await releaseOrderCreditReservations(order.id).catch((err) => {
          request.log.error({ err, orderId: order.id }, "Release order credit reservations on refund failed");
        });
        // Refund also cancels the consultation: cancel the appointments, which
        // releases their BOOKED slots and removes the admin + doctor calendar events.
        await cancelOrderAppointments(order.id).catch((err) => {
          request.log.error({ err, orderId: order.id }, "Cancel order appointments on refund failed");
        });

        const actor = resolveAdminSessionActor(request);
        // S-008: money-movement audit — write must not be silently
        // swallowed. The Stripe refund + order update above have already
        // committed; a failure here surfaces as a 500 so ops knows the
        // audit trail for this refund is missing, even though the refund
        // itself succeeded.
        await recordCriticalAudit({
          action: "ORDER_REFUNDED",
          entityType: "Order",
          entityId: order.id,
          actorUserId: actor?.userId ?? undefined,
          actorRole: actor?.role ?? undefined,
          metadata: {
            amountCents: order.totalCents,
            currencyCode: order.currencyCode,
            stripePaymentIntentId: order.stripePaymentIntentId,
          },
        });

        // Credit note + refund email/WhatsApp. Fire-and-forget + idempotent
        // (the charge.refunded webhook calls the same fn; whichever runs first wins).
        void sendOrderRefundNotifications(order.id).catch((err) => {
          request.log.error({ err, orderId: order.id }, "Refund notifications failed");
        });

        return okResponse({ id: updated.id, status: updated.status });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not refund order"));
      }
    },
  );
};

export default ordersRoute;

// Re-export kind enum for downstream
export { CartItemKind };
