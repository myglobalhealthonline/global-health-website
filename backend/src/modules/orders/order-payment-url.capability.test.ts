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
            where: { id: string };
          }) => {
            if (!state.nonceByOrderId.has(where.id)) return null;
            return {
              id: where.id,
              payAccessNonce: state.nonceByOrderId.get(where.id) ?? null,
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
      signPublicCapability: ({
        sub,
        purpose,
        nonce,
      }: {
        sub: string;
        purpose: string;
        nonce: string;
      }) => `${purpose}:${sub}:${nonce}`,
      verifyPublicCapability: (token: string, purpose: string) => {
        const [tokenPurpose, sub, nonce] = token.split(":");
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
  it("mints a pay token and uses it in the public short link", async () => {
    const token = await issueOrderPayCapability("order_1");
    const shortLink = await orderPayShortLink("order_1");

    assert.equal(token, "order-pay:order_1:order-nonce");
    assert.equal(shortLink, "https://www.myglobalhealth.test/pay/order-pay%3Aorder_1%3Aorder-nonce");
    assert.equal(await verifyOrderPayCapability(token ?? ""), "order_1");
  });

  it("rejects a token after the order nonce rotates", async () => {
    const token = await issueOrderPayCapability("order_1");
    state.nonceByOrderId.set("order_1", "rotated-order-nonce");

    assert.equal(await verifyOrderPayCapability(token ?? ""), null);
  });
});
