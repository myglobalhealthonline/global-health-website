import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

const state = {
  nonceByOrderId: new Map<string, string | null>([["order_1", null]]),
};

let issueOrderPayCapability: (typeof import("./order-payment-url.service.js"))["issueOrderPayCapability"];
let orderPayShortLink: (typeof import("./order-payment-url.service.js"))["orderPayShortLink"];
let verifyOrderPayCapability: (typeof import("./order-payment-url.service.js"))["verifyOrderPayCapability"];

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        order: {
          findUnique: async ({
            where,
          }: {
            where: { id?: string; payAccessNonce?: string };
          }) => {
            if (where.payAccessNonce !== undefined) {
              for (const [id, nonce] of state.nonceByOrderId) {
                if (nonce !== null && nonce === where.payAccessNonce) {
                  return { id, payAccessNonce: nonce };
                }
              }
              return null;
            }
            const id = where.id ?? "";
            if (!state.nonceByOrderId.has(id)) return null;
            return {
              id,
              payAccessNonce: state.nonceByOrderId.get(id) ?? null,
            };
          },
          updateMany: async ({
            where,
            data,
          }: {
            where: { id: string; payAccessNonce: null };
            data: { payAccessNonce: string };
          }) => {
            if (!state.nonceByOrderId.has(where.id)) return { count: 0 };
            if (state.nonceByOrderId.get(where.id) !== null) return { count: 0 };
            state.nonceByOrderId.set(where.id, data.payAccessNonce);
            return { count: 1 };
          },
        },
      },
    },
  });
  mock.module("../../config/env.js", {
    namedExports: {
      env: { PUBLIC_SITE_URL: "https://www.myglobalhealth.test" },
    },
  });
  mock.module("../../lib/stripe/client.js", {
    namedExports: {
      getStripeClient: () => ({ checkout: { sessions: {} } }),
      isStripeConfigured: () => true,
      resolveCheckoutPaymentMethods: async () => ({}),
    },
  });
  mock.module("../invoices/pt-stripe-invoice-data.js", {
    namedExports: { buildPtStripeInvoiceData: async () => undefined },
  });
  mock.module("../billing/checkout-branding.js", {
    namedExports: { checkoutBranding: async () => ({}) },
  });
  mock.module("./commission.service.js", {
    namedExports: { isCommissionCountry: async () => false },
  });
  mock.module("../../utils/public-capability.js", {
    namedExports: {
      generateCapabilityNonce: () => "order-nonce",
      // Three dot-separated segments on purpose: the service tells a legacy
      // signed capability from an opaque nonce by that shape.
      signPublicCapability: ({
        sub,
        purpose,
        nonce,
      }: {
        sub: string;
        purpose: string;
        nonce: string;
      }) => `${purpose}.${sub}.${nonce}`,
      verifyPublicCapability: (token: string, purpose: string) => {
        const [tokenPurpose, sub, nonce] = token.split(".");
        if (tokenPurpose !== purpose || !sub || !nonce) return null;
        return { sub, purpose, nonce };
      },
    },
  });

  ({ issueOrderPayCapability, orderPayShortLink, verifyOrderPayCapability } = await import(
    "./order-payment-url.service.js"
  ));
});

beforeEach(() => {
  state.nonceByOrderId.set("order_1", null);
});

describe("order payment capability", () => {
  it("puts the bare nonce in the short link and resolves it back", async () => {
    const shortLink = await orderPayShortLink("order_1");

    assert.equal(shortLink, "https://www.myglobalhealth.test/pay/order-nonce");
    assert.equal(await verifyOrderPayCapability("order-nonce"), "order_1");
  });

  it("still resolves a legacy signed capability already sent to patients", async () => {
    const token = await issueOrderPayCapability("order_1");

    assert.equal(token, "order-pay.order_1.order-nonce");
    assert.equal(await verifyOrderPayCapability(token ?? ""), "order_1");
  });

  it("rejects both link generations after the order nonce rotates", async () => {
    const token = await issueOrderPayCapability("order_1");
    state.nonceByOrderId.set("order_1", "rotated-order-nonce");

    assert.equal(await verifyOrderPayCapability(token ?? ""), null);
    assert.equal(await verifyOrderPayCapability("order-nonce"), null);
  });

  it("grants nothing for an unknown or empty token", async () => {
    assert.equal(await verifyOrderPayCapability("not-a-real-nonce"), null);
    assert.equal(await verifyOrderPayCapability("   "), null);
  });
});
