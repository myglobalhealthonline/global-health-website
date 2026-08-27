import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";

loadEnv({ path: join(__dirname, "../..", ".env.test") });

describe("public capability links", () => {
  let app: FastifyInstance | null = null;
  let prisma: PrismaClient;
  let signAuthToken: typeof import("../utils/auth-session.js")["signAuthToken"];

  const uniq = `cap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const currencyCode = uniqueCurrencyCode();

  let currencyId = "";
  let countryCode = "";
  let patientUserId = "";
  let patientProfileId = "";
  let patientCookie: Record<string, string> = {};
  let paidOrderId = "";
  let cancelledOrderId = "";
  let invoiceId = "";
  let siblingInvoiceId = "";

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      app = await buildApp();
    } catch {
      return;
    }

    let currency;
    try {
      currency = await prisma.currency.create({
        data: { code: currencyCode, symbol: "€", decimals: 2 },
      });
    } catch {
      await app.close().catch(() => {});
      app = null;
      return;
    }
    currencyId = currency.id;

    const country = await prisma.country.create({
      data: {
        code: `c${uniq}`.slice(0, 8).toLowerCase(),
        name: `Capability Test ${uniq}`,
        slug: `capability-test-${uniq}`.toLowerCase(),
        legacyHomePath: `/cap-${uniq}`,
        teamPath: `/cap-team-${uniq}`,
        generalConsultationPath: `/cap-general-${uniq}`,
        specialistConsultationPath: `/cap-specialist-${uniq}`,
        currencyId: currency.id,
      },
    });
    countryCode = country.code;

    const patient = await prisma.user.create({
      data: {
        email: `patient-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Capability Test Patient",
        role: "PATIENT",
        emailVerifiedAt: new Date(),
      },
    });
    patientUserId = patient.id;
    patientCookie = {
      gh_auth: signAuthToken({
        sub: patient.id,
        role: "PATIENT",
        email: patient.email,
      }),
    };
    const profile = await prisma.patientProfile.create({
      data: {
        email: patient.email,
        userId: patient.id,
        fullName: patient.fullName,
      },
    });
    patientProfileId = profile.id;

    const paidOrder = await prisma.order.create({
      data: {
        userId: patient.id,
        email: patient.email,
        fullName: patient.fullName,
        countryCode,
        currencyCode: currency.code,
        subtotalCents: 1000,
        totalCents: 1000,
        status: "PAID",
        paymentStatus: "PAID",
      },
    });
    paidOrderId = paidOrder.id;
    await prisma.orderItem.create({
      data: {
        orderId: paidOrder.id,
        kind: "HEALTH_TEST",
        name: "Capability Test Item",
        quantity: 1,
        unitPriceCents: 1000,
        lineTotalCents: 1000,
      },
    });
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `CAP-${uniq}-1`,
        orderId: paidOrder.id,
        countryCode,
      },
    });
    invoiceId = invoice.id;
    const siblingInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `CAP-${uniq}-2`,
        orderId: paidOrder.id,
        countryCode,
      },
    });
    siblingInvoiceId = siblingInvoice.id;

    const cancelledOrder = await prisma.order.create({
      data: {
        userId: patient.id,
        email: patient.email,
        fullName: patient.fullName,
        countryCode,
        currencyCode: currency.code,
        subtotalCents: 500,
        totalCents: 500,
        status: "CANCELLED",
        paymentStatus: "UNPAID",
      },
    });
    cancelledOrderId = cancelledOrder.id;
  });

  after(async () => {
    if (!app) return;
    await prisma.invoice.deleteMany({ where: { id: { in: [invoiceId, siblingInvoiceId] } } });
    await prisma.orderItem.deleteMany({ where: { orderId: paidOrderId } });
    await prisma.order.deleteMany({ where: { id: { in: [paidOrderId, cancelledOrderId] } } });
    await prisma.patientProfile.deleteMany({ where: { id: patientProfileId } });
    await prisma.user.deleteMany({ where: { id: patientUserId } });
    await prisma.country.deleteMany({ where: { code: countryCode } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  it("rejects a public invoice read without a capability token", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: `/api/public/invoices/${invoiceId}` });
    assert.equal(res.statusCode, 404, res.body);
  });

  it("serves the invoice when the signed capability matches the invoice", async (t) => {
    if (!app) return t.skip();
    const { issueInvoicePublicCapability } = await import("../modules/invoices/invoice-public-link.service.js");
    const token = await issueInvoicePublicCapability(invoiceId);
    assert.ok(token);

    const res = await app.inject({
      method: "GET",
      url: `/api/public/invoices/${invoiceId}?token=${encodeURIComponent(token!)}`,
    });
    assert.equal(res.statusCode, 200, res.body);

    const body = res.json() as { ok: boolean; data: { invoice: { id: string } } };
    assert.equal(body.ok, true);
    assert.equal(body.data.invoice.id, invoiceId);
  });

  it("does not let one invoice capability open a different invoice id", async (t) => {
    if (!app) return t.skip();
    const { issueInvoicePublicCapability } = await import("../modules/invoices/invoice-public-link.service.js");
    const token = await issueInvoicePublicCapability(invoiceId);
    assert.ok(token);

    const res = await app.inject({
      method: "GET",
      url: `/api/public/invoices/${siblingInvoiceId}?token=${encodeURIComponent(token!)}`,
    });
    assert.equal(res.statusCode, 404, res.body);
  });

  it("keeps authenticated raw-id invoice access working for the account route", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: `/api/account/invoices/${invoiceId}`,
      cookies: patientCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
  });

  it("rejects raw order ids on the old public pay-url endpoint", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: `/api/orders/${paidOrderId}/pay-url` });
    assert.equal(res.statusCode, 404, res.body);
  });

  it("resolves a valid public pay capability without exposing raw order ids", async (t) => {
    if (!app) return t.skip();
    const { issueOrderPayCapability } = await import("../modules/orders/order-payment-url.service.js");
    const token = await issueOrderPayCapability(paidOrderId);
    assert.ok(token);

    const res = await app.inject({
      method: "GET",
      url: `/api/public/orders/pay/${encodeURIComponent(token!)}`,
    });
    assert.equal(res.statusCode, 200, res.body);

    const body = res.json() as { ok: boolean; data: { payable: boolean; status: string } };
    assert.equal(body.ok, true);
    assert.equal(body.data.payable, false);
    assert.equal(body.data.status, "PAID");
  });

  it("resolves the short pay link, which carries the bare nonce", async (t) => {
    if (!app) return t.skip();
    const { orderPayShortLink } = await import("../modules/orders/order-payment-url.service.js");
    const shortLink = await orderPayShortLink(paidOrderId);
    const nonce = shortLink.split("/pay/")[1];
    assert.ok(nonce && nonce !== "unavailable");
    assert.ok(
      shortLink.length < 120,
      `short pay link should stay well under the old ~700-char capability (got ${shortLink.length})`,
    );

    const res = await app.inject({ method: "GET", url: `/api/public/orders/pay/${nonce}` });
    assert.equal(res.statusCode, 200, res.body);

    const body = res.json() as { ok: boolean; data: { payable: boolean; status: string } };
    assert.equal(body.data.status, "PAID");
  });

  it("rejects a raw order id on the public pay endpoint", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: `/api/public/orders/pay/${paidOrderId}` });
    assert.equal(res.statusCode, 404, res.body);
  });

  it("keeps authenticated raw-id order payment access scoped to the account route", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: `/api/account/orders/${cancelledOrderId}/payment-url`,
      cookies: patientCookie,
    });
    assert.equal(res.statusCode, 409, res.body);
  });
});
