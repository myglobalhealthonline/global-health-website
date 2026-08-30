import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { CartItemKind, LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  clearedCartBenefitFields,
  setCartBenefit,
} from "../modules/benefits/benefit-selection.service.js";
import { resolveTranslation } from "../modules/shared/resolve-translation.js";
import {
  holdConsecutiveSlots,
  releaseSlotsToBaseGrid,
  SlotAlreadyTakenError,
} from "../modules/doctor-availability/doctor-availability.service.js";
import {
  computeSlotPrice,
  getServicePeakConfig,
} from "../modules/pricing/peak-pricing.service.js";
import {
  loadValidatedInsurancePrice,
  isDoctorInInsuranceNetwork,
} from "../modules/pricing/insurance-pricing.service.js";
import { resolveDeclaredCoverage } from "../modules/benefits/declared-coverage.service.js";
import { isLineSellableInCommissionMarket } from "../modules/orders/commission.service.js";
import { encryptPhi } from "../lib/crypto/phi-crypto.js";
import { slotOverlapsPause } from "../modules/bookability/bookability-policy.js";
import { identityDocumentError } from "../validations/booking.schema.js";
import { resolveCountryTimeZone } from "../modules/countries/country-timezone.service.js";

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

/** Per-line subscription benefit choice (§ appointment-claim). */
const benefitSelectionSchema = z.enum([
  "PAY_NORMAL",
  "USE_PLAN_CREDIT",
  "USE_PLAN_DISCOUNT",
]);

/**
 * Patient-facing sentence for a declaration that could not be priced. Each
 * reason has its own fix, so they must not collapse into one "invalid card":
 * a wrong number is retyped, an uncovered service needs a different payment
 * choice, and a credits-only plan needs the account linking instead.
 */
function declaredCoverageMessage(
  reason: "UNKNOWN_PROVIDER" | "CARD_NOT_RECOGNISED" | "NO_BENEFIT_FOR_SERVICE" | "ACCOUNT_LINK_REQUIRED",
): string {
  switch (reason) {
    case "UNKNOWN_PROVIDER":
      return "That provider is no longer available. Please pick another option.";
    case "CARD_NOT_RECOGNISED":
      return "We could not find that card number with the provider you selected. Check the number and try again.";
    case "ACCOUNT_LINK_REQUIRED":
      return "This plan's benefit is tied to your account. Sign in with the account that holds the plan to use it.";
    case "NO_BENEFIT_FOR_SERVICE":
    default:
      return "Your selected cover does not include this service. You can continue at the standard price.";
  }
}

const cartQuerySchema = z.object({
  // .catch(undefined): unknown locale falls back to the country default
  // (see services.route.ts countryQuerySchema for the same pattern).
  locale: z
    .preprocess(
      (v) => (typeof v === "string" ? v.toUpperCase() : v),
      z.nativeEnum(LocaleCode).optional(),
    )
    .catch(undefined),
});

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
   * Per-line benefit choice. Default PAY_NORMAL never consumes a credit; the
   * pricing engine only reserves on an explicit USE_PLAN_CREDIT eligible line.
   */
  benefitSelection: benefitSelectionSchema.optional(),
  /**
   * Approved dependent (Premium family usage). Ownership is re-checked
   * server-side: the member must belong to the logged-in user. Guests cannot
   * set this.
   */
  familyMemberId: z.string().min(1).max(120).optional(),
  /**
   * Insurance-company selection (consultation lines). When set, the server
   * validates the company covers this service and snapshots the negotiated
   * insurance price onto the cart line. `insurancePolicyNumber` is the
   * patient's card/policy number, stored encrypted (phi:v1: envelope).
   */
  insuranceCompanyId: z.string().min(1).max(120).optional(),
  insurancePolicyNumber: z.string().trim().max(120).optional().or(z.literal("")),
  /**
   * Self-declared coverage from the booking form's coverage picker: a category,
   * a provider the admin configured, and the card number printed on the
   * patient's card. Unlike `benefit` below — which may only ever name something
   * the ACCOUNT already holds — this is an unverified claim, so every line
   * carrying one is parked for manual verification at checkout before a cent
   * moves.
   *
   * `INSURANCE` here is a convenience for the picker: it is mapped straight
   * onto `insuranceCompanyId` / `insurancePolicyNumber` above so the insurance
   * lifecycle (network gate, payout, admin-notify recipients) stays the one
   * that runs, unchanged.
   */
  declaredCoverage: z
    .object({
      source: z.enum(["INSURANCE", "CORPORATE", "MEMBERSHIP", "PUBLIC_PLAN"]),
      refId: z.string().trim().min(1).max(120),
      cardNumber: z.string().trim().min(1).max(120),
    })
    .optional(),
  /**
   * Cart-level benefit choice (§11.4). Carried here rather than by a separate
   * call, so there is no window in which a line exists without the benefit that
   * prices it — a cart in that state sits at UNSET with eligible sources and is
   * rejected at checkout (§6.4) with no UI anywhere to repair it.
   *
   * `refId` is the enrollment id for MEMBERSHIP and `credit` / `discount` for
   * PUBLIC_PLAN. CORPORATE needs none (at most one membership), and for
   * INSURANCE it is display state only — the per-line `insuranceCompanyId`
   * above is what the insurance lifecycle actually reads (§33).
   *
   * `UNSET` is deliberately not accepted: it is the initial state, and letting a
   * client set it back would re-open §6.4's reject path on a decided cart.
   */
  benefit: z
    .object({
      source: z.enum(["NONE", "MEMBERSHIP", "CORPORATE", "PUBLIC_PLAN", "INSURANCE"]),
      refId: z.string().trim().min(1).max(80).optional(),
    })
    .optional(),
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
      // New booking fields — persisted onto CartItem so the post-payment
      // webhook can mint the Appointment without re-collecting them.
      // Required-ness is enforced upstream by the appointments route /
      // mint flow based on BookingSetting per country.
      nationalIdNumber: z.string().trim().max(50).optional().or(z.literal("")),
      // Alternative to nationalIdNumber — Brazil requires ONE of CPF/passport.
      passportNumber: z.string().trim().max(60).optional().or(z.literal("")),
      // PT-only Número de Utente. Shown when the country's
      // BookingSetting.collectUtenteNumber is on, but never required —
      // patients without an SNS number must still be able to book.
      utenteNumber: z.string().trim().max(50).optional().or(z.literal("")),
      patientTimezone: z.string().trim().max(64).optional().or(z.literal("")),
      addressLine1: z.string().trim().max(120).optional().or(z.literal("")),
      addressLine2: z.string().trim().max(120).optional().or(z.literal("")),
      addressCity: z.string().trim().max(80).optional().or(z.literal("")),
      // State / province / federative unit. Only Brazil's booking form
      // collects it (the two-letter UF); never required.
      addressState: z.string().trim().max(80).optional().or(z.literal("")),
      addressPostalCode: z.string().trim().max(20).optional().or(z.literal("")),
      addressCountryCode: z
        .string()
        .trim()
        .length(2)
        .toLowerCase()
        .optional()
        .or(z.literal("")),
      gdprConsentClinic: z.literal(true).optional(),
      gdprConsentPlatform: z.literal(true).optional(),
      /** Optional WhatsApp-updates opt-in — never required. */
      whatsappConsent: z.boolean().optional(),
      /** GDPR: cross-border medical file access acknowledgement. Required
       *  true for every consultation booking — enforced below alongside the
       *  dual GDPR consent, same pattern. */
      crossBorderConsentAccepted: z.literal(true).optional(),
      /** Who may access the patient's medical file. Defaults to the
       *  narrowest scope when not supplied by the form. */
      medicalAccessConsentScope: z
        .enum(["DIRECT", "COUNTRY_CLINIC", "GLOBAL_NETWORK"])
        .optional(),
    })
    .optional(),
});

const updateItemBodySchema = z
  .object({
    quantity: z.number().int().min(1).max(5).optional(),
    benefitSelection: benefitSelectionSchema.optional(),
    /** Send `null` to clear (book for self), an id to target a dependent. */
    familyMemberId: z.string().min(1).max(120).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

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
  /** Per-line subscription benefit choice (consultation lines). */
  benefitSelection: "PAY_NORMAL" | "USE_PLAN_CREDIT" | "USE_PLAN_DISCOUNT";
  /** Approved dependent this line is booked for, or null for self. */
  familyMemberId: string | null;
  /** Display name of the dependent (looked up at serialize time). Null = self. */
  familyMemberName: string | null;
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
  /** Name + doctor of each item the sweep just removed, so the UI can
   *  say "Dr. Okafor's consultation slot expired" instead of a bare
   *  count. Same length as `expiredHolds`. */
  expiredItems?: { name: string; doctorName: string | null }[];
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
  expired: SweepResult = EMPTY_SWEEP,
): Promise<CartView> {
  const cart = await loadFullCart(cartId);
  if (!cart) {
    return { ...EMPTY_CART, expiredHolds: expired.count, expiredItems: expired.items };
  }
  // `cart.userId` is the binding for a logged-in patient's cart (null for a
  // guest cookie cart) — it scopes the family-name lookup to the owner.
  const enrich = await enrichConsultationLines(cart.items, cart.userId);
  return serializeCart(cart, expired, enrich);
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

// upsert, not find-then-create: `Cart.userId` is @unique and the frontend
// fires several cart requests in parallel right after login — a check-then-
// create races itself into P2002.
async function getOrCreateUserCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: {
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

async function readBookingSettings(countryCode: string) {
  return prisma.bookingSetting.findFirst({
    where: { country: { code: countryCode } },
    select: {
      bookingEnabled: true,
      requirePhone: true,
      requireDateOfBirth: true,
      requireNationalId: true,
      requireAddress: true,
      timezone: true,
    },
  });
}

/**
 * Best-effort lookup of doctor names + slot start times for the
 * consultation lines in a cart. Used purely for display on the cart +
 * checkout pages — never trust this for authorization. Failures fall
 * back to nulls so a missing doctor row (e.g. recently deactivated)
 * doesn't blow up the cart endpoint.
 */
async function enrichConsultationLines(
  items: { doctorId: string | null; timeSlotId: string | null; familyMemberId: string | null }[],
  /** Owner of the cart. Family-member names are resolved ONLY for the owner —
   *  never for guests — and the query is scoped by primaryUserId so a stale /
   *  foreign familyMemberId can never disclose another account's dependent. */
  userId: string | null,
) {
  const doctorIds = Array.from(
    new Set(items.map((i) => i.doctorId).filter((id): id is string => Boolean(id))),
  );
  const slotIds = Array.from(
    new Set(items.map((i) => i.timeSlotId).filter((id): id is string => Boolean(id))),
  );
  // Guests own no dependents — skip the family lookup entirely for them.
  const familyIds = userId
    ? Array.from(
        new Set(items.map((i) => i.familyMemberId).filter((id): id is string => Boolean(id))),
      )
    : [];
  if (doctorIds.length === 0 && slotIds.length === 0 && familyIds.length === 0) {
    return {
      doctorById: new Map<string, string>(),
      slotById: new Map<string, Date>(),
      familyById: new Map<string, string>(),
    };
  }
  const [doctors, slots, family] = await Promise.all([
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
    familyIds.length && userId
      ? prisma.familyMember.findMany({
          where: { id: { in: familyIds }, primaryUserId: userId },
          select: { id: true, fullName: true },
        })
      : Promise.resolve([]),
  ]);
  const doctorById = new Map(doctors.map((d) => [d.id, d.fullName]));
  const slotById = new Map(slots.map((s) => [s.id, s.startAt]));
  const familyById = new Map(family.map((f) => [f.id, f.fullName]));
  return { doctorById, slotById, familyById };
}

type SweepResult = {
  count: number;
  items: { name: string; doctorName: string | null }[];
};
const EMPTY_SWEEP: SweepResult = { count: 0, items: [] };

/**
 * Sweep consultation cart items whose 10-minute hold has expired.
 * Releases the slot HELD→OPEN (so another patient can claim it) and
 * removes the cart item. Returns the count + name/doctor of each
 * removed item so the caller can surface "Dr X's slot expired" rather
 * than a bare count.
 *
 * Called at the start of every cart read/write so a stale hold can
 * never linger past 10 minutes — no separate cron needed.
 */
async function sweepExpiredHolds(cartId: string): Promise<SweepResult> {
  const now = new Date();
  const expired = await prisma.cartItem.findMany({
    where: {
      cartId,
      heldUntil: { lt: now },
      timeSlotId: { not: null },
    },
    select: { id: true, timeSlotId: true, name: true, doctorId: true },
  });
  if (expired.length === 0) return EMPTY_SWEEP;

  const slotIds = expired
    .map((i) => i.timeSlotId)
    .filter((id): id is string => Boolean(id));
  const itemIds = expired.map((i) => i.id);
  const doctorIds = Array.from(
    new Set(expired.map((i) => i.doctorId).filter((id): id is string => Boolean(id))),
  );

  // Return the held time back to the base grid (delete collapsed HELD rows +
  // re-materialise base slots), then drop the cart items.
  await releaseSlotsToBaseGrid(slotIds);
  const [, doctors] = await Promise.all([
    prisma.cartItem.deleteMany({ where: { id: { in: itemIds } } }),
    doctorIds.length
      ? prisma.doctor.findMany({ where: { id: { in: doctorIds } }, select: { id: true, fullName: true } })
      : Promise.resolve([] as { id: string; fullName: string }[]),
  ]);
  const doctorById = new Map(doctors.map((d) => [d.id, d.fullName]));

  return {
    count: expired.length,
    items: expired.map((i) => ({
      name: i.name,
      doctorName: i.doctorId ? doctorById.get(i.doctorId) ?? null : null,
    })),
  };
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
  if (slotIds.length) await releaseSlotsToBaseGrid(slotIds);
  if (itemIds.length) {
    await prisma.cartItem.deleteMany({ where: { id: { in: itemIds } } });
  }
}

/** Exported for cart-merge.test.ts — not part of the route surface. */
export async function mergeCarts(sourceId: string, targetId: string) {
  // One-shot claim on the guest cart. `Cart.cookieToken` is unique AND
  // nullable, so nulling it does double duty: the cart stops being reachable
  // by the guest cookie lookup, and the updateMany count is an atomic "this
  // request owns the merge" flag. The frontend fires several cart calls in
  // parallel right after login; without this they all merge the same source
  // and can interleave (double-counted quantities, half-moved carts).
  const claim = await prisma.cart.updateMany({
    where: { id: sourceId, cookieToken: { not: null } },
    data: { cookieToken: null },
  });
  if (claim.count === 0) return;

  const target = await prisma.cart.findUnique({
    where: { id: targetId },
    include: { items: true },
  });
  const source = await prisma.cart.findUnique({
    where: { id: sourceId },
    include: { items: true },
  });
  if (!source || !target) return;

  // Collect the writes and commit them as one unit — a merge that dies
  // halfway used to leave items split across two carts. Slot releases stay
  // OUT of the transaction on purpose: releaseSlotsToBaseGrid re-materialises
  // the base grid and swallows unique/exclusion violations, and in Postgres a
  // caught constraint error still aborts the enclosing transaction. They run
  // after the commit, so a failed merge just leaves the slots HELD until the
  // 10-minute sweep — the safe direction to fail in.
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  const slotsToRelease: string[] = [];

  // If target is empty, just move country/currency from source.
  if (!target.countryCode && source.countryCode) {
    ops.push(
      prisma.cart.update({
        where: { id: target.id },
        data: { countryCode: source.countryCode, currencyCode: source.currencyCode },
      }),
    );
  }

  // If target already has items from a different country, drop the
  // source items rather than mix currencies. Patient can re-add later.
  // CRITICAL: release HELD consultation slots before deleting the
  // source cart — otherwise those time slots stay locked until
  // `heldUntil` ticks down to zero (~10 minutes), blocking other
  // patients from booking the same time.
  if (target.countryCode && source.countryCode !== target.countryCode) {
    await releaseHeldSlotsForItems(source.items);
    await prisma.cart.deleteMany({ where: { id: sourceId } });
    return;
  }

  // Move source items to target.
  // Consultations are 1-per-line + carry a heldUntil reservation. They
  // never dupe-merge — each booked slot is its own line. Products
  // (HEALTH_TEST, PRESCRIPTION_SERVICE) dupe-merge by underlying id,
  // capped at CART_ITEM_MAX_QTY (matches /items POST).
  // Preserve the "insurance is booked alone" invariant across a guest→user
  // merge. If the target already holds items of the other kind, skip moving the
  // conflicting source item (and release its held slot) rather than build a
  // mixed cart. Checkout also refuses a mixed cart, so this only affects UX.
  const targetHasInsurance = target.items.some((t) => t.insuranceCompanyId);
  const targetHasOther = target.items.some((t) => !t.insuranceCompanyId);

  for (const item of source.items) {
    const itemIsInsurance = Boolean(item.insuranceCompanyId);
    if ((itemIsInsurance && targetHasOther) || (!itemIsInsurance && targetHasInsurance)) {
      if (item.timeSlotId) {
        slotsToRelease.push(item.timeSlotId);
      }
      continue;
    }

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
      ops.push(
        prisma.cartItem.update({
          where: { id: dupe.id },
          data: { quantity: merged },
        }),
      );
    } else {
      // Re-parent the existing row instead of copy-then-delete. Copying would
      // duplicate `timeSlotId`, which is globally @unique on CartItem, and the
      // source row is not deleted until after this loop → P2002 on every
      // guest→user merge that carries a consultation.
      ops.push(
        prisma.cartItem.update({
          where: { id: item.id },
          data: {
            cartId: target.id,
            // SECURITY: never carry a familyMemberId across a merge. The source
            // is a guest cookie cart whose items were added without an
            // authenticated ownership check, so a crafted/foreign id could ride
            // in. The owner can re-select an approved dependent on the cart page.
            familyMemberId: null,
          },
        }),
      );
    }
  }

  // deleteMany, not delete: tolerant if the row is already gone. Items still
  // sitting in the source cart (the insurance-conflict skips above) cascade
  // away with it.
  ops.push(prisma.cart.deleteMany({ where: { id: sourceId } }));
  await prisma.$transaction(ops);

  if (slotsToRelease.length) await releaseSlotsToBaseGrid(slotsToRelease);
}

function serializeCart(
  cart: Awaited<ReturnType<typeof loadFullCart>>,
  expired: SweepResult = EMPTY_SWEEP,
  enrich?: {
    doctorById: Map<string, string>;
    slotById: Map<string, Date>;
    familyById: Map<string, string>;
  },
): CartView {
  if (!cart) {
    return { ...EMPTY_CART, expiredHolds: expired.count, expiredItems: expired.items };
  }
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
      benefitSelection: i.benefitSelection,
      familyMemberId: i.familyMemberId,
      familyMemberName: i.familyMemberId
        ? enrich?.familyById.get(i.familyMemberId) ?? null
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
    expiredHolds: expired.count,
    expiredItems: expired.items,
  };
}

async function setCartCookie(reply: FastifyReply, token: string) {
  reply.setCookie(CART_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: CART_COOKIE_MAX_AGE,
    // S-013a: match authCookieOptions()'s boundary — any non-genuine-local-dev
    // environment (staging, preview) is HTTPS-reachable and must get a
    // Secure cookie, not just NODE_ENV==="production".
    secure: env.NODE_ENV !== "development",
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
      const queryParse = cartQuerySchema.safeParse(request.query);
      const requestedLocale = queryParse.success ? queryParse.data.locale : undefined;
      const { kind, healthTestId, serviceId, quantity, timeSlotId, doctorId, patient, benefitSelection, familyMemberId, insuranceCompanyId, insurancePolicyNumber, benefit, declaredCoverage } =
        body.data;
      const qty = quantity ?? 1;
      // A declared INSURANCE coverage is the same thing the legacy insurance
      // step sends, so it collapses onto the existing columns rather than
      // opening a second insurance code path.
      const declaredInsurance = declaredCoverage?.source === "INSURANCE" ? declaredCoverage : null;
      const insuranceCompanyIdValue =
        (declaredInsurance?.refId ?? insuranceCompanyId)?.trim() || null;
      const insurancePolicyValue =
        (declaredInsurance?.cardNumber ?? insurancePolicyNumber)?.trim() || null;
      /** Membership / corporate / health-plan declarations — the new columns. */
      const declaredOther =
        declaredCoverage && declaredCoverage.source !== "INSURANCE" ? declaredCoverage : null;
      /** Resolved coverage price, set by the pricing block below. */
      let declaredPriceCents: number | null = null;

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
            include: {
              country: true,
              translations: { select: { locale: true, title: true } },
            },
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
          name = requestedLocale
            ? (resolveTranslation(ht.translations, requestedLocale, ht.country.defaultLocale).tr
                ?.title ?? ht.title)
            : ht.title;
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
            include: {
              country: { include: { currency: true } },
              translations: { select: { locale: true, name: true, summary: true } },
            },
          });
          if (!svc || !svc.isActive) {
            return reply.status(404).send(errorResponse("Service not found"));
          }
          // ADMIN_ONLY services are never bookable from the storefront —
          // same 404 as a nonexistent service, so this is not an existence
          // oracle. Cart-add is the enforcement point that matters because
          // it claims the slot.
          if (svc.visibility !== "PUBLIC") {
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
          name = requestedLocale
            ? (resolveTranslation(svc.translations, requestedLocale, svc.country.defaultLocale).tr
                ?.name ?? svc.name)
            : svc.name;
          unitPriceCents = svc.basePriceCents;
          // Online consultations (GENERAL / SPECIALIST) never ship; the
          // schema default for Service.shippingCents is 0, so the admin
          // has to opt-in to a non-zero value (typically only for
          // PRESCRIPTION items the team posts to the patient).
          shippingCents = svc.shippingCents ?? 0;
          countryCode = svc.country.code;
          currencyCode = svc.country.currency.code;

          if (isConsultationKind) {
            if (!timeSlotId || !doctorId) {
              return reply
                .status(400)
                .send(errorResponse("Consultation items require timeSlotId + doctorId"));
            }

            const [assignment, slot, settings] = await Promise.all([
              prisma.serviceDoctor.findFirst({
                where: {
                  serviceId: svc.id,
                  doctorId,
                  isActive: true,
                  status: "active",
                  doctor: {
                    active: true,
                    OR: [
                      { countryId: svc.countryId },
                      { additionalCountries: { some: { active: true, countryId: svc.countryId } } },
                    ],
                  },
                },
                select: {
                  id: true,
                  doctor: {
                    select: { bookingPausedFrom: true, bookingPausedUntil: true },
                  },
                },
              }),
              prisma.doctorTimeSlot.findFirst({
                where: { id: timeSlotId, doctorId },
                select: { id: true, status: true, startAt: true, endAt: true },
              }),
              readBookingSettings(svc.country.code),
            ]);

            if (!assignment) {
              return reply.status(400).send(
                errorResponse("That doctor is not bookable for this service."),
              );
            }

            if (!slot) {
              return reply.status(400).send(
                errorResponse("That time slot does not belong to the selected doctor."),
              );
            }

            if (slot.status !== "OPEN") {
              return reply.status(409).send(
                errorResponse("That time slot is no longer available."),
              );
            }
            if (
              slotOverlapsPause(slot, svc) ||
              slotOverlapsPause(slot, assignment.doctor)
            ) {
              return reply.status(409).send(
                errorResponse(
                  "This doctor or service is not accepting online bookings at the selected time.",
                ),
              );
            }

            // Peak-hour pricing: override the flat service price with the
            // price for this specific slot's clinic-local start time. This is
            // a display-only snapshot — checkout re-derives it from current
            // config — but keeping it correct here avoids a price jump
            // between the slot picker, the cart, and the checkout summary.
            const peakConfig = await getServicePeakConfig(svc.id);
            if (peakConfig?.enabled) {
              const tz = await resolveCountryTimeZone(svc.country.code);
              const priced = computeSlotPrice({
                config: peakConfig,
                basePriceCents: svc.basePriceCents,
                fallbackCurrency: svc.country.currency.code,
                slotStartUtc: slot.startAt,
                clinicTimezone: tz,
              });
              unitPriceCents = priced.unitPriceCents;
            }

            // Insurance-company selection: validate the company covers this
            // service (active + same country) and snapshot the negotiated
            // price. Insurance wins over peak. A company that doesn't cover the
            // service is a hard 400 — never silently fall back to a price the
            // patient wasn't shown.
            if (insuranceCompanyIdValue) {
              const insurancePrice = await loadValidatedInsurancePrice(
                svc.id,
                insuranceCompanyIdValue,
              );
              if (insurancePrice == null) {
                return reply
                  .status(400)
                  .send(errorResponse("Selected insurance company does not cover this service."));
              }
              // Doctor must be in this insurer's network for this service (the
              // admin set them a payout for it). Doctors without one never take
              // that insurer's patients, so a forged doctor+insurer pair is
              // rejected here even though the picker would never offer it.
              const inNetwork = await isDoctorInInsuranceNetwork(
                svc.id,
                doctorId,
                insuranceCompanyIdValue,
              );
              if (!inNetwork) {
                return reply.status(400).send(
                  errorResponse(
                    "That doctor does not take this insurance for this service. Please pick another doctor.",
                  ),
                );
              }
              unitPriceCents = insurancePrice;
            }

            // Declared membership / corporate / health-plan coverage. Priced
            // from the admin's own configuration for the card the patient
            // typed, against the SAME peak-adjusted price they were shown. A
            // declaration that cannot be priced is a hard 400 naming the
            // reason — never a silent fall-through to the standard price the
            // patient did not agree to.
            if (declaredOther) {
              const resolved = await resolveDeclaredCoverage({
                source: declaredOther.source,
                refId: declaredOther.refId,
                cardNumber: declaredOther.cardNumber,
                service: {
                  id: svc.id,
                  countryId: svc.countryId,
                  kind: svc.kind,
                  currencyCode: svc.currencyCode ?? svc.country.currency.code,
                },
                fullPriceCents: unitPriceCents,
                locale: requestedLocale ?? null,
              });
              if (!resolved.ok) {
                return reply
                  .status(400)
                  .send(
                    errorResponse(declaredCoverageMessage(resolved.reason), {
                      declaredCoverage: resolved.reason,
                    }),
                  );
              }
              unitPriceCents = resolved.unitPriceCents;
              declaredPriceCents = resolved.unitPriceCents;
            }

            // Commission markets (Brazil): our receipt bills the commission,
            // which is price − doctor payout. With no payout configured the
            // commission would silently be the FULL price and the doctor would
            // be owed nothing on paper, so the pair isn't sellable at all.
            // Same shape as the insurance-network gate above — a missing payout
            // row means "not bookable", not "payout is zero".
            const sellable = await isLineSellableInCommissionMarket({
              countryCode: svc.country.code,
              serviceId: svc.id,
              doctorId,
              insuranceCompanyId: insuranceCompanyIdValue,
            });
            if (!sellable) {
              return reply.status(400).send(
                errorResponse(
                  "That doctor is not available for this service right now. Please pick another doctor.",
                ),
              );
            }

            if (settings) {
              if (settings.bookingEnabled === false) {
                return reply.status(503).send(
                  errorResponse(
                    "Online bookings are paused for this country. Please contact us by email.",
                  ),
                );
              }
              if (settings.requirePhone && !patient?.phone?.trim()) {
                return reply.status(400).send(
                  errorResponse("A phone number is required for bookings in this country."),
                );
              }
              if (settings.requireDateOfBirth && !patientDob) {
                return reply.status(400).send(
                  errorResponse("A date of birth is required for bookings in this country."),
                );
              }
              // Per-country national-ID enforcement. Format validation
              // (NATIONAL_ID_VALIDATORS) runs on the direct /api/appointments
              // path; cart flow checks presence only — the booking form
              // already enforces format client-side and the value just
              // rides on the snapshot to the appointment-mint webhook.
              if (settings.requireNationalId && !patient?.nationalIdNumber?.trim()) {
                return reply.status(400).send(
                  errorResponse("A national ID number is required for bookings in this country."),
                );
              }
              if (settings.requireAddress) {
                const missing: string[] = [];
                if (!patient?.addressLine1?.trim()) missing.push("street address");
                if (!patient?.addressCity?.trim()) missing.push("city");
                if (!patient?.addressPostalCode?.trim()) missing.push("postal code");
                if (missing.length > 0) {
                  return reply.status(400).send(
                    errorResponse(
                      `Address required for this country. Missing: ${missing.join(", ")}.`,
                    ),
                  );
                }
              }
            }

            // Country identity-document rule (BR: CPF or passport; CZ:
            // passport or ID card number). Outside the `if (settings)` block
            // on purpose — a country missing its settings row must not skip
            // the requirement.
            const identityError = identityDocumentError(svc.country.code, {
              nationalIdNumber: patient?.nationalIdNumber,
              passportNumber: patient?.passportNumber,
            });
            if (identityError) {
              return reply.status(400).send(errorResponse(identityError));
            }

            // Dual GDPR consent — both required for every cart-first
            // consultation booking regardless of country (legal
            // requirement, not country-specific). Enforced OUTSIDE the
            // `if (settings)` block so a missing BookingSetting row can
            // never silently skip consent. Stored independently so
            // platform consent can be withdrawn without nuking the
            // clinical record.
            if (patient?.gdprConsentClinic !== true) {
              return reply.status(400).send(
                errorResponse(
                  "Clinic data sharing consent is required to book a consultation.",
                ),
              );
            }
            if (patient?.gdprConsentPlatform !== true) {
              return reply.status(400).send(
                errorResponse(
                  "Platform processing consent is required to book a consultation.",
                ),
              );
            }
            if (patient?.crossBorderConsentAccepted !== true) {
              return reply.status(400).send(
                errorResponse(
                  "Cross-border medical file access consent is required to book a consultation.",
                ),
              );
            }
          }
        }
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not validate item"));
      }

      // Resolve cart
      const activeCart = await resolveActiveCart(request, reply);
      const userId = activeCart.userId;
      let cart = activeCart.cart;

      // Family-member targeting (Premium family usage). Only a logged-in
      // patient can book for an approved dependent, and the dependent MUST
      // belong to them — this is the server-side spoof guard (the pricing
      // engine re-checks ownership again at preview + checkout). Guests get a
      // 401 so the UI can prompt login.
      let familyMember:
        | { id: string; fullName: string; email: string | null; dateOfBirth: Date | null }
        | null = null;
      if (familyMemberId) {
        if (!userId) {
          return reply
            .status(401)
            .send(errorResponse("Log in to book for a family member"));
        }
        const fm = await prisma.familyMember.findFirst({
          where: { id: familyMemberId, primaryUserId: userId },
          select: { id: true, fullName: true, email: true, dateOfBirth: true },
        });
        if (!fm) {
          return reply.status(403).send(errorResponse("Family member not found"));
        }
        familyMember = fm;
      }

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
          cart = await loadFullCart(newCart.id);
        }
      }

      if (!cart) {
        return reply.status(500).send(errorResponse("Cart resolution failed"));
      }

      const expiredHolds = await sweepExpiredHolds(cart.id);
      if (expiredHolds.count > 0) {
        const freshCart = await loadFullCart(cart.id);
        if (!freshCart) {
          return reply.status(404).send(errorResponse("Cart not found"));
        }
        cart = freshCart;
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

      // A declared-coverage booking is made ALONE. It goes through a manual
      // card-verification flow (no instant checkout), so it can't share a cart
      // with pay-now items — and a cart that already holds one can't take
      // anything else. Either direction is a 409 asking the patient to clear
      // the cart first. Applies to every declared source, not just insurance:
      // the parked-order gate at checkout is one flag for the whole order, so
      // a mixed cart would strand the pay-now lines behind a verification.
      const cartHasCoverage = cart.items.some(
        (i) => i.insuranceCompanyId || i.declaredCoverageSource,
      );
      const addingCoverage = Boolean(insuranceCompanyIdValue || declaredOther);
      if (addingCoverage && cart.items.length > 0) {
        return reply.status(409).send(
          errorResponse(
            "A booking that uses insurance, a membership or a plan card must be made on its own. Clear your cart first, then add this booking.",
            { conflict: "insurance_must_be_alone" },
          ),
        );
      }
      if (cartHasCoverage) {
        return reply.status(409).send(
          errorResponse(
            "Your cart has a booking awaiting card verification. Check out or clear it before adding other items.",
            { conflict: "cart_has_insurance" },
          ),
        );
      }

      // Cart-level benefit (§11.4), recorded BEFORE the line is created so a
      // rejected benefit — an enrollment that is not this patient's, or one
      // whose term has lapsed — never leaves a half-written cart behind.
      //
      // Guests are ignored rather than rejected: they hold no benefits
      // (decision 6), and their one legitimate source, insurance, is a per-line
      // concept that travels in `insuranceCompanyId` above.
      if (benefit && userId) {
        const saved = await setCartBenefit(userId, {
          source: benefit.source,
          refId: benefit.refId ?? null,
        });
        if (!saved.ok) {
          return reply.status(saved.status).send(errorResponse(saved.message));
        }
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
        const existingInCart = timeSlotId
          ? cart.items.find((i) => i.timeSlotId === timeSlotId)
          : null;
        if (existingInCart) {
          return okResponse(await serializeFreshCart(cart.id, expiredHolds));
        }

        const slotTaken = timeSlotId
          ? await prisma.cartItem.findUnique({ where: { timeSlotId } })
          : null;
        if (slotTaken) {
          return reply
            .status(409)
            .send(errorResponse("That time slot is no longer available"));
        }
      }

      // For consultation items: reserve the consultation's real length
      // (base grid + consume) OPEN → HELD atomically BEFORE creating the
      // CartItem. The picked slot is the first base slot; we hold the
      // consecutive base slots covering the service duration as one collapsed
      // HELD row. If another patient grabbed any of them we bail with 409.
      if (isConsultation && timeSlotId && doctorId) {
        const svc = serviceId
          ? await prisma.service.findUnique({
              where: { id: serviceId },
              select: { durationMinutes: true },
            })
          : null;
        try {
          await prisma.$transaction(async (tx) => {
            const held = await holdConsecutiveSlots(
              tx,
              timeSlotId,
              svc?.durationMinutes ?? null,
            );
            if (held.doctorId !== doctorId) throw new SlotAlreadyTakenError();
            const [servicePolicy, doctorPolicy, assignment, bookingSetting] =
              await Promise.all([
                tx.service.findFirst({
                  where: {
                    id: serviceId,
                    isActive: true,
                    visibility: "PUBLIC",
                    country: { code: countryCode, isActive: true },
                  },
                  select: { bookingPausedFrom: true, bookingPausedUntil: true },
                }),
                tx.doctor.findFirst({
                  where: {
                    id: doctorId,
                    active: true,
                    OR: [
                      { country: { code: countryCode, isActive: true } },
                      {
                        additionalCountries: {
                          some: {
                            active: true,
                            country: { code: countryCode, isActive: true },
                          },
                        },
                      },
                    ],
                  },
                  select: { bookingPausedFrom: true, bookingPausedUntil: true },
                }),
                tx.serviceDoctor.findFirst({
                  where: { serviceId, doctorId, isActive: true, status: "active" },
                  select: { id: true },
                }),
                tx.bookingSetting.findFirst({
                  where: { country: { code: countryCode } },
                  select: { bookingEnabled: true },
                }),
              ]);
            if (
              !servicePolicy ||
              !doctorPolicy ||
              !assignment ||
              bookingSetting?.bookingEnabled === false ||
              slotOverlapsPause(held, servicePolicy) ||
              slotOverlapsPause(held, doctorPolicy)
            ) {
              throw new SlotAlreadyTakenError();
            }
          });
        } catch (err) {
          if (err instanceof SlotAlreadyTakenError) {
            return reply
              .status(409)
              .send(errorResponse("That time slot is no longer available"));
          }
          throw err;
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
            // Per-line benefit choice (default PAY_NORMAL never reserves a
            // credit) + the approved dependent this line is booked for. Both are
            // consultation-only concepts — products always pay normally with no
            // beneficiary, regardless of what the client sent.
            benefitSelection: isConsultation ? benefitSelection ?? "PAY_NORMAL" : "PAY_NORMAL",
            familyMemberId: isConsultation ? familyMember?.id ?? null : null,
            // Consultation patient snapshot. Stamped here so cart →
            // order → webhook can mint the Appointment without
            // collecting any of this at checkout. When booking for a family
            // member, fall back to the member's identity if the client didn't
            // supply explicit patient fields.
            patientFullName: patient?.fullName ?? familyMember?.fullName ?? null,
            patientEmail: patient?.email ?? familyMember?.email ?? null,
            patientPhone: patient?.phone ? patient.phone : null,
            patientDateOfBirth: patientDob ?? familyMember?.dateOfBirth ?? null,
            patientNotes: patient?.notes ? patient.notes : null,
            patientConsentAcceptedAt: patient?.consentAccepted ? new Date() : null,
            bookingForOther: patient?.bookingForOther ?? false,
            // New booking snapshot — mirrors the Appointment columns the
            // post-payment webhook will write when minting from this row.
            patientNationalIdNumber: patient?.nationalIdNumber || null,
            patientPassportNumber: patient?.passportNumber || null,
            patientUtenteNumber: patient?.utenteNumber || null,
            patientTimezone: patient?.patientTimezone || null,
            patientAddressLine1: patient?.addressLine1 || null,
            patientAddressLine2: patient?.addressLine2 || null,
            patientAddressCity: patient?.addressCity || null,
            patientAddressState: patient?.addressState || null,
            patientAddressPostalCode: patient?.addressPostalCode || null,
            patientAddressCountryCode: patient?.addressCountryCode || null,
            patientGdprConsentClinic: patient?.gdprConsentClinic === true,
            patientGdprConsentPlatform: patient?.gdprConsentPlatform === true,
            patientGdprConsentedAt:
              patient?.gdprConsentClinic === true &&
              patient?.gdprConsentPlatform === true
                ? new Date()
                : null,
            // GDPR opt-IN: only an explicit true counts as consent (Art. 4(11) —
            // silence/absence is not consent).
            patientWhatsappConsent: patient?.whatsappConsent === true,
            patientCrossBorderConsentAccepted: patient?.crossBorderConsentAccepted === true,
            patientMedicalAccessConsentScope: patient?.medicalAccessConsentScope ?? "DIRECT",
            // Insurance snapshot (consultation-only). unitPriceCents above is
            // already the validated insurance price when a company is selected.
            // The policy/card number is stored encrypted (phi:v1: envelope),
            // same as PatientProfile.insurancePolicyNumber.
            insuranceCompanyId: isConsultation ? insuranceCompanyIdValue : null,
            insurancePolicyNumber:
              isConsultation && insuranceCompanyIdValue && insurancePolicyValue
                ? encryptPhi(insurancePolicyValue)
                : null,
            insurancePriceCents: isConsultation && insuranceCompanyIdValue ? unitPriceCents : null,
            // Declared membership / corporate / health-plan coverage. Card
            // number encrypted like the insurance policy number — it is a
            // membership identifier tied to a named patient.
            declaredCoverageSource: isConsultation && declaredOther ? declaredOther.source : null,
            declaredCoverageRefId: isConsultation && declaredOther ? declaredOther.refId : null,
            declaredCoverageCardNumber:
              isConsultation && declaredOther ? encryptPhi(declaredOther.cardNumber) : null,
            declaredCoveragePriceCents: isConsultation ? declaredPriceCents : null,
          },
        });
      } catch (err) {
        // Rollback the held run if cart item creation failed.
        if (isConsultation && timeSlotId) {
          await releaseSlotsToBaseGrid([timeSlotId]);
        }
        // Two concurrent requests (double-click, retry-after-validation-error)
        // can both pass the slotTaken check above before either creates its
        // CartItem — the DB's unique constraint on timeSlotId is the real
        // guard. Surface that race as the same friendly 409 instead of a
        // raw 500 Prisma error.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          return reply
            .status(409)
            .send(errorResponse("That time slot is no longer available"));
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

      const { cart, userId } = await resolveActiveCart(request, reply);
      if (!cart) return reply.status(404).send(errorResponse("Cart not found"));

      // Sweep expired holds before mutating
      const expired = await sweepExpiredHolds(cart.id);
      const sweptCart = expired.count > 0 ? await loadFullCart(cart.id) : cart;
      if (!sweptCart) return reply.status(404).send(errorResponse("Cart not found"));

      const item = sweptCart.items.find((i) => i.id === params.data.itemId);
      if (!item) return reply.status(404).send(errorResponse("Item not found"));

      // Consultation items are always qty=1 (slot-based)
      const isConsultation =
        item.kind === "GENERAL_CONSULTATION" ||
        item.kind === "SPECIALIST_CONSULTATION";
      if (isConsultation && body.data.quantity !== undefined && body.data.quantity !== 1) {
        return reply
          .status(400)
          .send(errorResponse("Consultation items are unique per slot"));
      }

      // Re-check family-member ownership when (re)targeting a dependent. Same
      // spoof guard as add-to-cart: the member must belong to the logged-in
      // user. `null` clears the target (book for self).
      let familyTargetUpdate: { familyMemberId: string | null } | undefined;
      if (body.data.familyMemberId !== undefined) {
        if (body.data.familyMemberId === null) {
          familyTargetUpdate = { familyMemberId: null };
        } else {
          if (!userId) {
            return reply
              .status(401)
              .send(errorResponse("Log in to book for a family member"));
          }
          const fm = await prisma.familyMember.findFirst({
            where: { id: body.data.familyMemberId, primaryUserId: userId },
            select: { id: true },
          });
          if (!fm) {
            return reply.status(403).send(errorResponse("Family member not found"));
          }
          familyTargetUpdate = { familyMemberId: fm.id };
        }
      }

      await prisma.cartItem.update({
        where: { id: item.id },
        data: {
          ...(body.data.quantity !== undefined ? { quantity: body.data.quantity } : {}),
          ...(body.data.benefitSelection !== undefined
            ? { benefitSelection: body.data.benefitSelection }
            : {}),
          ...(familyTargetUpdate ?? {}),
        },
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
      const sweptCart = expired.count > 0 ? await loadFullCart(cart.id) : cart;
      if (!sweptCart) return reply.status(404).send(errorResponse("Cart not found"));

      const item = sweptCart.items.find((i) => i.id === params.data.itemId);
      // If sweep already removed this item we still report a clean cart
      if (!item) {
        return okResponse(await serializeFreshCart(sweptCart.id, expired));
      }

      await prisma.cartItem.delete({ where: { id: item.id } });

      // Return the held run to the base grid for consultation items.
      if (item.timeSlotId) {
        await releaseSlotsToBaseGrid([item.timeSlotId]);
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

    // Return all held runs to the base grid before deleting cart items
    const heldSlotIds = cart.items
      .map((i) => i.timeSlotId)
      .filter((id): id is string => Boolean(id));
    if (heldSlotIds.length > 0) {
      await releaseSlotsToBaseGrid(heldSlotIds);
    }

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        countryCode: "",
        currencyCode: "",
        abandonedEmailSentAt: null,
        // An emptied cart has no benefit choice. Leaving one behind means the
        // next cart silently inherits it — and a stale NONE would suppress a
        // corporate member's discount from then on, invisibly.
        ...clearedCartBenefitFields(),
      },
    });
    return okResponse(EMPTY_CART);
  });
};

export default cartRoute;
