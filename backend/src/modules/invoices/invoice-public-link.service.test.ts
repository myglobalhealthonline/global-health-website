import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

const state = {
  nonceByInvoiceId: new Map<string, string | null>([["inv_1", null]]),
};

let issueInvoicePublicCapability: (typeof import("./invoice-public-link.service.js"))["issueInvoicePublicCapability"];
let verifyInvoicePublicCapability: (typeof import("./invoice-public-link.service.js"))["verifyInvoicePublicCapability"];

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        invoice: {
          findUnique: async ({
            where,
          }: {
            where: { id: string };
          }) => {
            if (!state.nonceByInvoiceId.has(where.id)) return null;
            return { publicAccessNonce: state.nonceByInvoiceId.get(where.id) ?? null };
          },
          updateMany: async ({
            where,
            data,
          }: {
            where: { id: string; publicAccessNonce: null };
            data: { publicAccessNonce: string };
          }) => {
            if (!state.nonceByInvoiceId.has(where.id)) return { count: 0 };
            if (state.nonceByInvoiceId.get(where.id) !== null) return { count: 0 };
            state.nonceByInvoiceId.set(where.id, data.publicAccessNonce);
            return { count: 1 };
          },
        },
      },
    },
  });
  mock.module("../../utils/public-capability.js", {
    namedExports: {
      generateCapabilityNonce: () => "invoice-nonce",
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

  ({ issueInvoicePublicCapability, verifyInvoicePublicCapability } = await import(
    "./invoice-public-link.service.js"
  ));
});

beforeEach(() => {
  state.nonceByInvoiceId.set("inv_1", null);
});

describe("invoice public capability", () => {
  it("issues a signed capability and verifies it against the live invoice nonce", async () => {
    const token = await issueInvoicePublicCapability("inv_1");

    assert.equal(token, "invoice-public:inv_1:invoice-nonce");
    assert.equal(await verifyInvoicePublicCapability("inv_1", token ?? undefined), true);
  });

  it("rejects a token after the invoice nonce rotates", async () => {
    const token = await issueInvoicePublicCapability("inv_1");
    state.nonceByInvoiceId.set("inv_1", "rotated-nonce");

    assert.equal(await verifyInvoicePublicCapability("inv_1", token ?? undefined), false);
  });

  it("rejects a missing token", async () => {
    assert.equal(await verifyInvoicePublicCapability("inv_1", undefined), false);
  });
});
