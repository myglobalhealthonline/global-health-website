import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { CartItemKind } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Shopping cart for orderable items.
 *
 * Identity resolution:
 *   - Logged-in patient: `Cart.userId` is the binding.
 *   - Guest: a cookie `gh_cart` carries a uuid `Cart.cookieToken`.
 *
 * On every request we resolve (or create) the active cart for the caller.
 * If a logged-in patient also has a cookie cart, we merge it once and
 * delete the cookie cart so the merged state persists across devices.
 *
 * Currency lock:
 *   First item stamps Cart.{countryCode,currencyCode}. Adding from a
 *   different country returns 409; the client should prompt the user to
 *   clear the cart first.
 *
 * Endpoints:
 *   GET    /api/cart
 *   POST   /api/cart/items
 *   PATCH  /api/cart/items/:itemId
 *   DELETE /api/cart/items/:itemId
 *   DELETE /api/cart
 */

const CART_COOKIE = "gh_cart";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Accepts either a full ISO datetime or a `YYYY-MM-DD` date string. */
const dobInputSchema = z
  .string()
  .trim()
  .min(8)
  .max(40)
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, "Invalid date of birth");

const addItemBodySchema = z.object({
  kind: z.enum([
    CartItemKind.HEALTH_TEST,
    CartItemKind.PRESCRIPTION_SERVICE,
    CartItemKind.GENERAL_CONSULTATION,
    CartItemKind.SPECIALIST_CONSULTATION,
  ]),
  healthTestId: z.string().min(1).max(120).optional(),
  serviceId: z.string().min(1).max(120).optional(),
  /** Capped at 5 per item per cart so casual product orders stay sensible. */
  quantity: z.number().int().min(1).max(5).optional(),
  /** Consultation cart items only — slot + doctor selected up front. */
  timeSlotId: z.string().min(1).max(120).optional(),
  doctorId: z.string().min(1).max(120).optional(),
  /**
   * Patient intake snapshot. REQUIRED for consultation kinds (the cart
   * route below enforces presence + consent). Ignored for product
   * kinds — those rows don't carry patient data.
   */
  patient: z
    .object({
      fullName: z.string().trim().min(2).max(120),
      email: z.string().trim().email(),
      phone: z.string().trim().max(40).optional().or(z.literal("")),
      dateOfBirth: dobInputSchema.optional().or(z.literal("")),
      notes: z.string().trim().max(2000).optional().or(z.literal("")),
      consentAccepted: z.literal(true),
      bookingForOther: z.boolean().optional(),
    })
    .optional(),
});

const updateItemBodySchema = z.object({
  quantity: z.number().int().min(1).max(5),
});

/** How long a consultation slot stays in the patient's cart before it
 *  auto-releases back to OPEN. Matches the typical "checkout in this
 *  window" UX so a single distracted patient can't hold a slot all day. */
const HOLD_TTL_MS = 10 * 60 * 1000; // 10 minutes
/** Max quantity per non-consultation product line. Matches the .max(5)
 *  in the Zod body schemas above + the frontend CART_ITEM_MAX_QTY. */
const CART_ITEM_MAX_QTY = 5;

const itemIdParamSchema = z.object({ itemId: z.string().min(1).max(120) });

type CartItemView = {
  id: string;
  kind: CartItemKind;
  healthTestId: string | null;
  serviceId: string | null;
  name: string;
  unitPriceCents: number;
  /** Shipping fee per unit (cents). Comes from HealthTest.shippingCents
   *  or Service.shippingCents at add-to-cart time. 0 for online
   *  consultations (no physical delivery). */
  shippingCents: number;
  quantity: number;
  lineTotalCents: number;
  timeSlotId: string | null;
  doctorId: string | null;
  /** Display-only doctor name (looked up at serialize time so the cart
   *  / checkout UI can show "with Dr. X" without a second round-trip).
   *  Null for product lines. Never trust this for authz. */
  doctorName: string | null;
  /** Display-only slot start ISO. Null for product lines. */
  slotStartAt: string | null;
  /** ISO timestamp when this consultation slot reservation lapses.
   *  Null for product items. UI uses this for countdown display. */
  heldUntil: string | null;
  /** Consultation patient intake snapshot — populated when the consult
   *  page added this line. Null for product items. */
  patient: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    /** ISO date string (YYYY-MM-DD or full ISO). */
    dateOfBirth: string | null;
    notes: string | null;
    consentAcceptedAt: string | null;
    bookingForOther: boolean;
  } | null;
};

type CartView = {
  id: string;
  countryCode: string;
  currencyCode: string;
  items: CartItemView[];
  subtotalCents: number;
  itemCount: number;
  /** Set when the most recent read swept N expired consultation
   *  reservations off this cart so the UI can show a "your slot
   *  expired" toast. */
  expiredHolds?: number;
};

const EMPTY_CART: CartView = {
  id: "",
  countryCode: "",
  currencyCode: "",
  items: [],
  subtotalCents: 0,
  itemCount: 0,
};

/** One-shot: load the full cart + enrich consultation lines with
 *  display-only doctor name + slot start, then serialize. Used by
 *  every read/write endpoint so the response shape stays uniform. */
async function serializeFreshCart(
  cartId: string,
  expiredHolds = 0,
): Promise<CartView> {
  const cart = await loadFullCart(cartId);
  if (!cart) return { ...EMPTY_CART, expiredHolds };
  const enrich = await enrichConsultationLines(cart.items);
  return serializeCart(cart, expiredHolds, enrich);
}

// ── Cart resolver ────────────────────────────────────────────────────
async function resolveActiveCart(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<{
  cart: Awaited<ReturnType<typeof loadFullCart>>;
  userId: string | null;
  cookieToken: string | null;
}> {
  let userId: string | null = null;
  try {
    const user = await resolveOptionalAuthUser(request);
    if (user && user.role === "PATIENT") userId = user.id;
  } catch {
    // Auth failures don't block guest carts.
  }

  let cookieToken = (request.cookies as Record<string, string | undefined>)[CART_COOKIE];

  // Logged in: merge cookie cart into user cart if both exist
  if (userId) {
    const userCart = await getOrCreateUserCart(userId);
    if (cookieToken) {
      const cookieCart = await prisma.cart.findUnique({
        where: { cookieToken },
        include: { items: true },
      });
      if (cookieCart && cookieCart.id !== userCart.id) {
        await mergeCarts(cookieCart.id, userCart.id);
      }
      // Clear the cookie since the merge is done
      reply.clearCookie(CART_COOKIE, { path: "/" });
      cookieToken = undefined;
    }
    return {
      cart: await loadFullCart(userCart.id),
      userId,
      cookieToken: null,
    };
  }

  // Guest path
  if (!cookieToken) return { cart: null, userId: null, cookieToken: null };

  const cart = await prisma.cart.findUnique({ where: { cookieToken } });
  if (!cart) return { cart: null, userId: null, cookieToken };
  return { cart: await loadFullCart(cart.id), userId: null, cookieToken };
}

async function getOrCreateUserCart(userId: string) {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.cart.create({
    data: {
      userId,
      countryCode: "",
      currencyCode: "",
    },
  });
}

async function loadFullCart(cartId: string) {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
}

/**
 * Best-effort lookup of doctor names + slot start times for the
 * consultation lines in a cart. Used purely for display on the cart +
 * checkout pages — never trust this for authorization. Failures fall
 * back to nulls so a missing doctor row (e.g. recently deactivated)
 * doesn't blow up the cart endpoint.
 */
async function enrichConsultationLines(items: { doctorId: string | null; timeSlotId: string | null }[]) {
  const doctorIds = Array.from(
    new Set(items.map((i) => i.doctorId).filter((id): id is string => Boolean(id))),
  );
  const slotIds = Array.from(
    new Set(items.map((i) => i.timeSlotId).filter((id): id is string => Boolean(id))),
  );
  if (doctorIds.length === 0 && slotIds.length === 0) {
    return { doctorById: new Map<string, string>(), slotById: new Map<string, Date>() };
  }
  const [doctors, slots] = await Promise.all([
    doctorIds.length
      ? prisma.doctor.findMany({
          where: { id: { in: doctorIds } },
          select: { id: true, fullName: true },
        })
      : Promise.resolve([]),
    slotIds.length
      ? prisma.doctorTimeSlot.findMany({
          where: { id: { in: slotIds } },
          select: { id: true, startAt: true },
        })
      : Promise.resolve([]),
  ]);
  const doctorById = new Map(doctors.map((d) => [d.id, d.fullName]));
  const slotById = new Map(slots.map((s) => [s.id, s.startAt]));
  return { doctorById, slotById };
}

/**
 * Sweep consultation cart items whose 10-minute hold has expired.
 * Releases the slot HELD→OPEN (so another patient can claim it) and
 * removes the cart item. Returns the count of removed items so the
 * caller can surface "your slot expired" to the UI.
 *
 * Called at the start of every cart read/write so a stale hold can
 * never linger past 10 minutes — no separate cron needed.
 */
async function sweepExpiredHolds(cartId: string): Promise<number> {
  const now = new Date();
  const expired = await prisma.cartItem.findMany({
    where: {
      cartId,
      heldUntil: { lt: now },
      timeSlotId: { not: null },
    },
    select: { id: true, timeSlotId: true },
  });
  if (expired.length === 0) return 0;

  const slotIds = expired
    .map((i) => i.timeSlotId)
    .filter((id): id is string => Boolean(id));
  const itemIds = expired.map((i) => i.id);

  await prisma.$transaction([
    prisma.doctorTimeSlot.updateMany({
      where: { id: { in: slotIds }, status: "HELD" },
      data: { status: "OPEN" },
    }),
    prisma.cartItem.deleteMany({ where: { id: { in: itemIds } } }),
  ]);
  return expired.length;
}

/**
 * Helper: release any HELD time slots the listed cart items were
 * reserving, then delete the items themselves. Used when we discard a
 * cart's items during merge — without this the slots stay HELD until
 * heldUntil lapses, which can be 10 minutes of dead inventory per
 * abandoned consultation.
 */
async function releaseHeldSlotsForItems(
  items: { id: string; timeSlotId: string | null }[],
) {
  const slotIds = items
    .map((i) => i.timeSlotId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const itemIds = items.map((i) => i.id);
  if (slotIds.length === 0 && itemIds.length === 0) return;
  await prisma.$transaction([
    ...(slotIds.length
      ? [
          prisma.doctorTimeSlot.updateMany({
            where: { id: { in: slotIds }, status: "HELD" },
            data: { status: "OPEN" },
          }),
        ]
      : []),
    ...(itemIds.length
      ? [prisma.cartItem.deleteMany({ where: { id: { in: itemIds } } })]
      : []),
  ]);
}

async function mergeCarts(sourceId: string, targetId: string) {
  const target = await prisma.cart.findUnique({
    where: { id: targetId },
    include: { items: true },
  });
  const source = await prisma.cart.findUnique({
    where: { id: sourceId },
    include: { items: true },
  });
  if (!source || !target) return;

  // If target is empty, just move country/currency from source.
  let targetCountry = target.countryCode;
  let targetCurrency = target.currencyCode;
  if (!targetCountry && source.countryCode) {
    targetCountry = source.countryCode;
    targetCurrency = source.currencyCode;
    await prisma.cart.update({
      where: { id: target.id },
      data: { countryCode: targetCountry, currencyCode: targetCurrency },
    });
  }

  // If target already has items from a different country, drop the
  // source items rather than mix currencies. Patient can re-add later.
  // CRITICAL: release HELD consultation slots before deleting the
  // source cart — otherwise those time slots stay locked until
  // `heldUntil` ticks down to zero (~10 minutes), blocking other
  // patients from booking the same time.
  if (target.countryCode && source.countryCode !== target.countryCode) {
    await releaseHeldSlotsForItems(source.items);
    await prisma.cart.delete({ where: { id: sourceId } });
    return;
  }

  // Move source items to target.
  // Consultations are 1-per-line + carry a heldUntil reservation. They
  // never dupe-merge — each booked slot is its own line. Products
  // (HEALTH_TEST, PRESCRIPTION_SERVICE) dupe-merge by underlying id,
  // capped at CART_ITEM_MAX_QTY (matches /items POST).
  for (const item of source.items) {
    const isConsultation =
      item.kind === "GENERAL_CONSULTATION" ||
      item.kind === "SPECIALIST_CONSULTATION";

    const dupe = isConsultation
      ? undefined
      : target.items.find(
          (t) =>
            (item.healthTestId && t.healthTestId === item.healthTestId) ||
            (item.serviceId && t.serviceId === item.serviceId),
        );
    if (dupe) {
      const merged = Math.min(
        dupe.quantity + item.quantity,
        CART_ITEM_MAX_QTY,
      );
      await prisma.cartItem.update({
        where: { id: dupe.id },
        data: { quantity: merged },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: target.id,
          kind: item.kind,
          healthTestId: item.healthTestId,
          serviceId: item.serviceId,
          name: item.name,
          unitPriceCents: item.unitPriceCents,
          // Snapshot the per-unit shipping fee too — without this the
          // checkout total drops the shipping line on merged items.
          shippingCents: item.shippingCents ?? 0,
          quantity: item.quantity,
          timeSlotId: item.timeSlotId,
          doctorId: item.doctorId,
          // Consultation lines carry the reservation deadline — drop
          // it onto the new row so sweep + countdown keep working.
          heldUntil: item.heldUntil,
          // Patient intake snapshot — keep so the merged cart still
          // mints the Appointment with the right data.
          patientFullName: item.patientFullName,
          patientEmail: item.patientEmail,
          patientPhone: item.patientPhone,
          patientDateOfBirth: item.patientDateOfBirth,
          patientNotes: item.patientNotes,
          patientConsentAcceptedAt: item.patientConsentAcceptedAt,
          bookingForOther: item.bookingForOther,
        },
      });
    }
  }
  await prisma.cart.delete({ where: { id: sourceId } });
}

function serializeCart(
  cart: Awaited<ReturnType<typeof loadFullCart>>,
  expiredHolds = 0,
  enrich?: {
    doctorById: Map<string, string>;
    slotById: Map<string, Date>;
  },
): CartView {
  if (!cart) return { ...EMPTY_CART, expiredHolds };
  const items: CartItemView[] = cart.items.map((i) => {
    const isConsultationLine =
      i.kind === CartItemKind.GENERAL_CONSULTATION ||
      i.kind === CartItemKind.SPECIALIST_CONSULTATION;
    const slot = i.timeSlotId ? enrich?.slotById.get(i.timeSlotId) : undefined;
    return {
      id: i.id,
      kind: i.kind,
      healthTestId: i.healthTestId,
      serviceId: i.serviceId,
      name: i.name,
      unitPriceCents: i.unitPriceCents,
      shippingCents: i.shippingCents ?? 0,
      quantity: i.quantity,
      lineTotalCents: i.unitPriceCents * i.quantity,
      timeSlotId: i.timeSlotId,
      doctorId: i.doctorId,
      doctorName: i.doctorId ? enrich?.doctorById.get(i.doctorId) ?? null : null,
      slotStartAt: slot ? slot.toISOString() : null,
      heldUntil: i.heldUntil ? i.heldUntil.toISOString() : null,
      patient: isConsultationLine
        ? {
            fullName: i.patientFullName,
            email: i.patientEmail,
            phone: i.patientPhone,
            dateOfBirth: i.patientDateOfBirth
              ? i.patientDateOfBirth.toISOString()
              : null,
            notes: i.patientNotes,
            consentAcceptedAt: i.patientConsentAcceptedAt
              ? i.patientConsentAcceptedAt.toISOString()
              : null,
            bookingForOther: i.bookingForOther,
          }
        : null,
    };
  });
  return {
    id: cart.id,
    countryCode: cart.countryCode,
    currencyCode: cart.currencyCode,
    items,
    subtotalCents: items.reduce((sum, i) => sum + i.lineTotalCents, 0),
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    expiredHolds,
  };
}

async function setCartCookie(reply: FastifyReply, token: string) {
  reply.setCookie(CART_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: CART_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

// ── Routes ───────────────────────────────────────────────────────────
const cartRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/cart", async (request, reply) => {
    try {
      const { cart } = await resolveActiveCart(request, reply);
      if (!cart) return okResponse(serializeCart(null));
      const expired = await sweepExpiredHolds(cart.id);
      return okResponse(await serializeFreshCart(cart.id, expired));
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load cart"));
    }
  });

  app.post(
    "/api/cart/items",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = addItemBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid item", body.error.flatten()));
      }
      const { kind, healthTestId, serviceId, quantity, timeSlotId, doctorId, patient } =
        body.data;
      const qty = quantity ?? 1;

      // Consultation kinds require the patient intake snapshot up
      // front — the consult page collects it before add-to-cart so
      // checkout only handles payment. Product items don't take any
      // patient data on the cart line.
      const isConsultationKind =
        kind === CartItemKind.GENERAL_CONSULTATION ||
        kind === CartItemKind.SPECIALIST_CONSULTATION;
      if (isConsultationKind) {
        if (!patient) {
          return reply
            .status(400)
            .send(errorResponse("Patient details required for consultation bookings"));
        }
      }

      // Parse DOB → start-of-day UTC so it survives Stripe / webhook
      // round-trips without timezone drift.
      let patientDob: Date | null = null;
      if (patient?.dateOfBirth) {
        const datePart = patient.dateOfBirth.slice(0, 10);
        const parsed = new Date(`${datePart}T00:00:00.000Z`);
        if (Number.isNaN(parsed.getTime())) {
          return reply.status(400).send(errorResponse("Invalid date of birth"));
        }
        patientDob = parsed;
      }

      // Validate referenced product exists + grab pricing snapshot
      let name = "";
      let unitPriceCents = 0;
      let shippingCents = 0;
      let countryCode = "";
      let currencyCode = "";

      try {
        if (kind === "HEALTH_TEST") {
          if (!healthTestId) {
            return reply.status(400).send(errorResponse("healthTestId required"));
          }
          const ht = await prisma.healthTest.findUnique({
            where: { id: healthTestId },
            include: { country: true },
          });
          if (!ht || !ht.isActive) {
            return reply.status(404).send(errorResponse("Health test not found"));
          }
          if (ht.priceCents == null) {
            return reply.status(400).send(errorResponse("Health test has no price"));
          }
          // Stock check — null = unlimited, 0 = sold out
          if (ht.stock !== null && ht.stock <= 0) {
            return reply.status(409).send(errorResponse("Out of stock"));
          }
          if (ht.stock !== null && qty > ht.stock) {
            return reply
              .status(409)
              .send(errorResponse(`Only ${ht.stock} left in stock`));
          }
          name = ht.title;
          unitPriceCents = ht.priceCents;
          shippingCents = ht.shippingCents ?? 0;
          countryCode = ht.country.code;
          currencyCode = ht.currencyCode ?? "EUR";
        } else if (
          kind === "PRESCRIPTION_SERVICE" ||
          kind === "GENERAL_CONSULTATION" ||
          kind === "SPECIALIST_CONSULTATION"
        ) {
          if (!serviceId) {
            return reply.status(400).send(errorResponse("serviceId required"));
          }
          const svc = await prisma.service.findUnique({
            where: { id: serviceId },
            include: { country: { include: { currency: true } } },
          });
          if (!svc || !svc.isActive) {
            return reply.status(404).send(errorResponse("Service not found"));
          }
          // Sanity: kind must match service.kind
          const expectedKind =
            svc.kind === "PRESCRIPTION"
              ? "PRESCRIPTION_SERVICE"
              : svc.kind === "GENERAL"
                ? "GENERAL_CONSULTATION"
                : svc.kind === "SPECIALIST"
                  ? "SPECIALIST_CONSULTATION"
                  : null;
          if (expectedKind !== kind) {
            return reply
              .status(400)
              .send(errorResponse(`Service kind ${svc.kind} does not match cart item kind ${kind}`));
          }
          if (svc.basePriceCents == null) {
            return reply.status(400).send(errorResponse("Service has no price"));
          }
          name = svc.name;
          unitPriceCents = svc.basePriceCents;
          // Online consultations (GENERAL / SPECIALIST) never ship; the
          // schema default for Service.shippingCents is 0, so the admin
          // has to opt-in to a non-zero value (typically only for
          // PRESCRIPTION items the team posts to the patient).
          shippingCents = svc.shippingCents ?? 0;
          countryCode = svc.country.code;
          currencyCode = svc.country.currency.code;
        }
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not validate item"));
      }

      // Resolve cart
      let { cart, userId, cookieToken } = await resolveActiveCart(request, reply);

      // Create cart on first add
      if (!cart) {
        if (userId) {
          cart = await loadFullCart((await getOrCreateUserCart(userId)).id);
        } else {
          const newToken = randomUUID();
          const newCart = await prisma.cart.create({
            data: {
              cookieToken: newToken,
              countryCode,
              currencyCode,
            },
          });
          await setCartCookie(reply, newToken);
          cookieToken = newToken;
          cart = await loadFullCart(newCart.id);
        }
      }

      if (!cart) {
        return reply.status(500).send(errorResponse("Cart resolution failed"));
      }

      // Currency lock — block cross-country adds
      if (cart.countryCode && cart.countryCode !== countryCode) {
        return reply
          .status(409)
          .send(
            errorResponse(
              `Your cart already has ${cart.countryCode.toUpperCase()} items. Clear the cart before adding ${countryCode.toUpperCase()} items.`,
              { conflict: "country_mismatch", currentCountry: cart.countryCode },
            ),
          );
      }

      // Stamp country/currency on first item
      if (!cart.countryCode) {
        await prisma.cart.update({
          where: { id: cart.id },
          data: { countryCode, currencyCode },
        });
      }

      // De-dupe: same product → bump qty (consultations are unique per slot)
      const isConsultation = isConsultationKind;

      if (!isConsultation) {
        const existing = cart.items.find(
          (i) =>
            (healthTestId && i.healthTestId === healthTestId) ||
            (serviceId && i.serviceId === serviceId),
        );
        if (existing) {
          await prisma.cartItem.update({
            where: { id: existing.id },
            data: { quantity: Math.min(existing.quantity + qty, 5) },
          });
          return okResponse(await serializeFreshCart(cart.id));
        }
      } else {
        // Consultation must have timeSlotId
        if (!timeSlotId || !doctorId) {
          return reply
            .status(400)
            .send(errorResponse("Consultation items require timeSlotId + doctorId"));
        }
        // Block adding the same slot twice in cart layer
        const slotTaken = await prisma.cartItem.findUnique({
          where: { timeSlotId },
        });
        if (slotTaken) {
          return reply
            .status(409)
            .send(errorResponse("That time slot is already in a cart"));
        }
      }

      // Sweep before consultation add — frees expired holds so the
      // patient doesn't see stale slots they think they reserved.
      if (cart) await sweepExpiredHolds(cart.id);

      // For consultation items: claim the slot OPEN → HELD atomically
      // BEFORE creating the CartItem. If another patient grabbed it via
      // the regular booking flow we bail and return 409.
      if (isConsultation && timeSlotId) {
        const claim = await prisma.doctorTimeSlot.updateMany({
          where: { id: timeSlotId, status: "OPEN" },
          data: { status: "HELD" },
        });
        if (claim.count === 0) {
          return reply
            .status(409)
            .send(errorResponse("That time slot is no longer available"));
        }
      }

      // Consultation slots get a 10-minute reservation; product items
      // never expire from the cart on their own.
      const heldUntil =
        isConsultation && timeSlotId
          ? new Date(Date.now() + HOLD_TTL_MS)
          : null;

      try {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            kind,
            healthTestId: healthTestId ?? null,
            serviceId: serviceId ?? null,
            name,
            unitPriceCents,
            shippingCents,
            quantity: isConsultation ? 1 : qty,
            timeSlotId: timeSlotId ?? null,
            doctorId: doctorId ?? null,
            heldUntil,
            // Consultation patient snapshot. Stamped here so cart →
            // order → webhook can mint the Appointment without
            // collecting any of this at checkout.
            patientFullName: patient?.fullName ?? null,
            patientEmail: patient?.email ?? null,
            patientPhone: patient?.phone ? patient.phone : null,
            patientDateOfBirth: patientDob,
            patientNotes: patient?.notes ? patient.notes : null,
            patientConsentAcceptedAt: patient?.consentAccepted ? new Date() : null,
            bookingForOther: patient?.bookingForOther ?? false,
          },
        });
      } catch (err) {
        // Rollback slot HELD if cart item creation failed
        if (isConsultation && timeSlotId) {
          await prisma.doctorTimeSlot.updateMany({
            where: { id: timeSlotId, status: "HELD" },
            data: { status: "OPEN" },
          });
        }
        throw err;
      }

      return okResponse(await serializeFreshCart(cart.id));
    },
  );

  app.patch<{ Params: { itemId: string } }>(
    "/api/cart/items/:itemId",
    async (request, reply) => {
      const params = itemIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      const body = updateItemBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid body", body.error.flatten()));
      }

      const { cart } = await resolveActiveCart(request, reply);
      if (!cart) return reply.status(404).send(errorResponse("Cart not found"));

      // Sweep expired holds before mutating
      const expired = await sweepExpiredHolds(cart.id);
      const sweptCart = expired > 0 ? await loadFullCart(cart.id) : cart;
      if (!sweptCart) return reply.status(404).send(errorResponse("Cart not found"));

      const item = sweptCart.items.find((i) => i.id === params.data.itemId);
      if (!item) return reply.status(404).send(errorResponse("Item not found"));

      // Consultation items are always qty=1 (slot-based)
      const isConsultation =
        item.kind === "GENERAL_CONSULTATION" ||
        item.kind === "SPECIALIST_CONSULTATION";
      if (isConsultation && body.data.quantity !== 1) {
        return reply
          .status(400)
          .send(errorResponse("Consultation items are unique per slot"));
      }

      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: body.data.quantity },
      });
      return okResponse(await serializeFreshCart(sweptCart.id, expired));
    },
  );

  app.delete<{ Params: { itemId: string } }>(
    "/api/cart/items/:itemId",
    async (request, reply) => {
      const params = itemIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      const { cart } = await resolveActiveCart(request, reply);
      if (!cart) return reply.status(404).send(errorResponse("Cart not found"));

      const expired = await sweepExpiredHolds(cart.id);
      const sweptCart = expired > 0 ? await loadFullCart(cart.id) : cart;
      if (!sweptCart) return reply.status(404).send(errorResponse("Cart not found"));

      const item = sweptCart.items.find((i) => i.id === params.data.itemId);
      // If sweep already removed this item we still report a clean cart
      if (!item) {
        return okResponse(await serializeFreshCart(sweptCart.id, expired));
      }

      await prisma.cartItem.delete({ where: { id: item.id } });

      // Release the slot HELD back to OPEN for consultation items
      if (item.timeSlotId) {
        await prisma.doctorTimeSlot.updateMany({
          where: { id: item.timeSlotId, status: "HELD" },
          data: { status: "OPEN" },
        });
      }

      // If cart is now empty, clear country/currency stamps
      const remaining = await prisma.cartItem.count({ where: { cartId: sweptCart.id } });
      if (remaining === 0) {
        await prisma.cart.update({
          where: { id: sweptCart.id },
          data: { countryCode: "", currencyCode: "", abandonedEmailSentAt: null },
        });
      }

      return okResponse(await serializeFreshCart(sweptCart.id, expired));
    },
  );

  app.delete("/api/cart", async (request, reply) => {
    const { cart } = await resolveActiveCart(request, reply);
    if (!cart) return okResponse(EMPTY_CART);

    // Release all HELD slots back to OPEN before deleting cart items
    const heldSlotIds = cart.items
      .map((i) => i.timeSlotId)
      .filter((id): id is string => Boolean(id));
    if (heldSlotIds.length > 0) {
      await prisma.doctorTimeSlot.updateMany({
        where: { id: { in: heldSlotIds }, status: "HELD" },
        data: { status: "OPEN" },
      });
    }

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.update({
      where: { id: cart.id },
      data: { countryCode: "", currencyCode: "", abandonedEmailSentAt: null },
    });
    return okResponse(EMPTY_CART);
  });
};

export default cartRoute;
