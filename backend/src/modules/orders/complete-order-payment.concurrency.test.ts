import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";
import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma } from "@prisma/client";

/**
 * PM-1 — two concurrent deliveries of the SAME Stripe event.
 *
 * `payments.route.ts` dedupes with a read-then-act pair of `findUnique`s
 * outside any transaction, so both deliveries get past it. What actually
 * settles the race is the `ProcessedWebhookEvent.stripeEventId` insert inside
 * `markOrderPaidFromStripeSession`'s transaction — same commit as the PAID
 * flip and the outbox rows, so the loser rolls back having applied nothing.
 *
 * This asserts both halves of that: the business effects happen exactly once,
 * AND the loser answers with a retry-safe deduped result instead of throwing a
 * P2002 that would have cost a needless 500 and a Stripe retry.
 *
 * Synthetic ids only. No DB, no network, no Stripe, no personal data.
 */

const ORDER_ID = "order-pm1";
const EVENT_ID = "evt_pm1_synthetic";

type Row = Record<string, unknown>;

const store: {
  order: Row;
  processedEvents: Set<string>;
  /** Orders with post-payment automations enqueued. A Set, because the real
   *  `enqueueOrderPaidAutomations` uses `skipDuplicates` — being called again
   *  on a redelivery is a no-op, not a second set of side effects. */
  outboxOrders: Set<string>;
  /** Orders with a Meta Conversions API Purchase enqueued — same
   *  `skipDuplicates` semantics as `outboxOrders`. */
  metaCapiOrders: Set<string>;
} = {
  order: {},
  processedEvents: new Set(),
  outboxOrders: new Set(),
  metaCapiOrders: new Set(),
};

const effects = { creditCommits: 0, opsAlerts: 0 };
/** Arms one simulated failure inside the PAID transaction, after the event row. */
let failOutboxOnce = false;
/** Model reported on the simulated unique violation; see uniqueViolation(). */
let conflictModelName = "ProcessedWebhookEvent";

/** Releases waiters only once `need` transactions have started, so both read pre-flip state. */
let barrier: { need: number; seen: number; gate: Promise<void>; open: () => void } | null = null;

function armBarrier(need: number) {
  let open!: () => void;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  barrier = { need, seen: 0, gate, open };
}

async function waitAtBarrier() {
  const b = barrier;
  if (!b) return;
  b.seen += 1;
  if (b.seen >= b.need) b.open();
  await b.gate;
}

/**
 * The shape Prisma 7.9.1 actually produces for this violation on Postgres 18,
 * captured from a real duplicate insert: `modelName` plus a nested driver
 * error, and NO `meta.target`. Faking `target` here would have let a
 * predicate that only reads `target` pass this test while doing nothing in
 * production.
 */
function uniqueViolation(
  modelName = "ProcessedWebhookEvent",
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.9.1",
    meta: {
      modelName,
      driverAdapterError: {
        name: "DriverAdapterError",
        cause: {
          originalCode: "23505",
          kind: "UniqueConstraintViolation",
          constraint: { fields: ['"stripeEventId"'] },
        },
      },
    },
  });
}

let service: typeof import("./complete-order-payment.service.js");
const log = { info: () => {}, warn: () => {}, error: () => {} };

before(async () => {
  /**
   * Undo log so a thrown transaction body reverts its own writes, as Postgres
   * would. Scoped per transaction with AsyncLocalStorage: two concurrent
   * deliveries interleave, and a shared log would let the loser roll back the
   * winner writes.
   */
  const txUndo = new AsyncLocalStorage<(() => void)[]>();
  function onRollback(step: () => void) {
    txUndo.getStore()?.push(step);
  }
  function write(row: Row, data: Row) {
    const previous = Object.fromEntries(Object.keys(data).map((k) => [k, row[k]]));
    onRollback(() => Object.assign(row, previous));
    Object.assign(row, data);
  }

  const prisma: Record<string, unknown> = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const undo: (() => void)[] = [];
      return txUndo.run(undo, async () => {
        try {
          return await fn(prisma);
        } catch (error) {
          for (const step of undo.reverse()) step();
          throw error;
        }
      });
    },
  };
  Object.assign(prisma, {
    order: {
      findUnique: async ({ where }: { where: Row }) => {
        // First statement of the transaction — hold here so both deliveries
        // observe the order before either has flipped it.
        await waitAtBarrier();
        return where.id === ORDER_ID ? { ...store.order, items: [] } : null;
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        if (where.id !== ORDER_ID) throw new Error("unexpected order id");
        write(store.order, data);
        return { ...store.order };
      },
    },
    processedWebhookEvent: {
      findUnique: async ({ where }: { where: Row }) =>
        store.processedEvents.has(where.stripeEventId as string) ? { id: "pwe-1" } : null,
      create: async ({ data }: { data: Row }) => {
        const id = data.stripeEventId as string;
        if (store.processedEvents.has(id)) throw uniqueViolation(conflictModelName);
        store.processedEvents.add(id);
        onRollback(() => store.processedEvents.delete(id));
        return { id: "pwe-1", stripeEventId: id };
      },
    },
    orderItem: { findMany: async () => [] },
  });

  mock.module("../../db/prisma.js", { namedExports: { prisma } });
  mock.module("../outbox/outbox.js", {
    namedExports: {
      enqueueOrderPaidAutomations: async (_tx: unknown, orderId: string) => {
        if (failOutboxOnce) {
          failOutboxOnce = false;
          throw new Error("simulated outbox failure");
        }
        if (store.outboxOrders.has(orderId)) return;
        store.outboxOrders.add(orderId);
        onRollback(() => store.outboxOrders.delete(orderId));
      },
      // Enqueued in the same transaction as the PAID flip. Tracked separately
      // from `outboxOrders` so a test can tell the two enqueues apart, and
      // rolled back with the transaction like the automations row above.
      enqueueMetaCapiPurchase: async (_tx: unknown, orderId: string) => {
        if (store.metaCapiOrders.has(orderId)) return;
        store.metaCapiOrders.add(orderId);
        onRollback(() => store.metaCapiOrders.delete(orderId));
      },
    },
  });
  mock.module("../subscriptions/ops/ops-alert.js", {
    namedExports: {
      emitOpsAlert: async () => {
        effects.opsAlerts += 1;
      },
    },
  });
  mock.module("../subscriptions/checkout-pricing.service.js", {
    namedExports: {
      commitOrderCreditReservations: async () => {
        effects.creditCommits += 1;
      },
    },
  });
  mock.module("../coupons/coupon-release.service.js", {
    namedExports: { markCouponRedemptionConsumed: async () => undefined },
  });
  mock.module("../lab-orders/lab-requisitions.service.js", {
    namedExports: { markRequisitionsReadyOnOrderPaid: async () => undefined },
  });
  mock.module("../../lib/email/templates.js", {
    namedExports: { sendOrderConfirmationEmail: async () => undefined },
  });
  mock.module("../../lib/stripe/client.js", {
    namedExports: { getStripeClient: () => ({}), isStripeConfigured: () => false },
  });
  mock.module("../admin-orders/generate-order-meet-link.service.js", {
    namedExports: { orderHasConsultationItem: () => false, orderIsPaidForMeet: () => false },
  });
  mock.module("../automation/pre-payment-flow.service.js", {
    namedExports: { stopPrePaymentFlowOnPaid: async () => undefined },
  });
  mock.module("../../lib/crypto/phi-crypto.js", {
    namedExports: { encryptPhi: (v: string) => `enc:${v}` },
  });
  mock.module("../cross-border-rx/cross-border-rx.service.js", {
    namedExports: {
      onCrossBorderRxFeePaid: async () => undefined,
      linkCrossBorderUpgradeOnPaid: async () => undefined,
    },
  });
  mock.module("../consents/promote-appointment-consents.js", {
    namedExports: { promoteAppointmentConsents: async () => undefined },
  });

  service = await import("./complete-order-payment.service.js");
});

beforeEach(() => {
  store.order = {
    id: ORDER_ID,
    email: "buyer@example.test",
    userId: null,
    status: "PENDING",
    paymentStatus: "PENDING",
    paidAt: null,
    stripePaymentIntentId: null,
    stripeInvoiceId: null,
  };
  store.processedEvents = new Set();
  store.outboxOrders = new Set();
  store.metaCapiOrders = new Set();
  effects.creditCommits = 0;
  effects.opsAlerts = 0;
  failOutboxOnce = false;
  conflictModelName = "ProcessedWebhookEvent";
  barrier = null;
});

const session = {
  id: "cs_test_pm1",
  payment_intent: "pi_pm1",
  invoice: null,
  client_reference_id: ORDER_ID,
  metadata: { kind: "order", orderId: ORDER_ID },
};

function deliver() {
  return service.completeOrderPaymentFromCheckoutSession(
    ORDER_ID,
    session,
    { stripeEventId: EVENT_ID, eventType: "checkout.session.completed" },
    log,
  );
}

describe("PM-1 — concurrent delivery of one Stripe event", () => {
  it("applies the payment once and answers both deliveries without throwing", async () => {
    armBarrier(2);
    const [a, b] = await Promise.all([deliver(), deliver()]);

    assert.deepEqual(
      [a.alreadyPaid, b.alreadyPaid].sort(),
      [false, true],
      "exactly one delivery does the work; the other is deduped",
    );
    assert.equal(a.orderId, ORDER_ID);
    assert.equal(b.orderId, ORDER_ID);
    assert.equal(store.order.status, "PAID");
    assert.equal(store.order.paymentStatus, "PAID");
    assert.equal(store.processedEvents.size, 1, "one durable event identity");
    assert.equal(store.outboxOrders.size, 1, "post-payment automations enqueued once");
  });

  it("a sequential redelivery of the same event is still deduped", async () => {
    const first = await deliver();
    assert.equal(first.alreadyPaid, false);
    const second = await deliver();
    assert.equal(second.alreadyPaid, true);
    assert.equal(store.outboxOrders.size, 1);
    assert.equal(store.processedEvents.size, 1);
  });

  it("a unique conflict on a DIFFERENT model is not treated as this race", async () => {
    // `Payment.stripeEventId` is unique too. A P2002 from anything but
    // ProcessedWebhookEvent is a real failure Stripe must retry, not a
    // deduped success — otherwise a future write in this transaction could be
    // silently swallowed.
    conflictModelName = "Payment";
    armBarrier(2);
    const settled = await Promise.allSettled([deliver(), deliver()]);
    const rejected = settled.filter((r) => r.status === "rejected");
    assert.equal(rejected.length, 1, "the loser surfaces the failure");
    assert.equal(
      (rejected[0] as PromiseRejectedResult).reason.code,
      "P2002",
      "the original error is rethrown, not converted",
    );
  });

  it("a failed attempt is not left marked processed, and the Stripe retry completes it", async () => {
    // The event row is written in the SAME transaction as the PAID flip, so a
    // failure after it must roll it back. Otherwise the retry would find the
    // event "already processed" and the order would stay unpaid forever.
    failOutboxOnce = true;
    await assert.rejects(deliver(), /simulated outbox failure/);
    assert.equal(store.processedEvents.size, 0, "no processed marker survives the failure");
    assert.equal(store.order.paymentStatus, "PENDING", "the PAID flip rolled back too");

    const retried = await deliver();
    assert.equal(retried.alreadyPaid, false, "the Stripe retry does the work");
    assert.equal(store.order.paymentStatus, "PAID");
    assert.equal(store.processedEvents.size, 1);
    assert.equal(store.outboxOrders.size, 1, "automations enqueued exactly once across both attempts");
  });
});
