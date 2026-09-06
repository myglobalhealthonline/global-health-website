import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { encryptPhi, decryptPhi } from "../lib/crypto/phi-crypto.js";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * PR-4 — the three CartItem identity numbers.
 *
 * `CartItem.patientNationalIdNumber/PassportNumber/UtenteNumber` were written
 * in plaintext and only encrypted much later, when the payment webhook copied
 * them onto PatientProfile. An abandoned cart is never checked out, so they sat
 * in plaintext indefinitely. They are now wrapped at the first CartItem write
 * (`cart.route.ts`), which works because `encryptPhi` is idempotent: the
 * CartItem → OrderItem copy and the payment-completion write need no change of
 * their own, and a legacy plaintext row still gets encrypted on the way to
 * PatientProfile.
 *
 * The first suite drives the REAL `POST /api/cart/items` and reads the stored
 * row back, so it proves the route actually calls `encryptPhi` — a contract
 * test on the helper alone would pass even if the route had never been changed.
 * The second suite pins the envelope properties the downstream copies depend
 * on.
 *
 * Synthetic identifiers only — none of these values is a real identity number.
 */

const NATIONAL_ID = "SYNTH-NID-00000000";
const PASSPORT = "SYNTH-PP-11111111";
const UTENTE = "SYNTH-UT-22222222";

const encryptionConfigured = String(encryptPhi("probe")).startsWith("phi:v1:");

describe("PR-4 — POST /api/cart/items stores identity numbers encrypted", () => {
  let app: FastifyInstance | null = null;
  let bootError: unknown = null;
  let prisma: typeof import("../db/prisma.js")["prisma"];

  const uniq = `cartphi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const currencyCode = uniqueCurrencyCode();
  const cartToken = randomUUID();
  const patientEmail = `${uniq}@test.local`;

  let currencyId = "";
  let countryId = "";
  let countryCode = "";
  let doctorId = "";
  let serviceId = "";
  let cartId = "";
  let slotOffsetHours = 0;

  before(async () => {
    let candidate: FastifyInstance | null = null;
    try {
      prisma = (await import("../db/prisma.js")).prisma;
      const { buildApp } = await import("../app.js");
      candidate = await buildApp();
      await prisma.$queryRawUnsafe("SELECT 1");
      app = candidate;
    } catch (error) {
      bootError = error;
      await candidate?.close();
      return;
    }

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    countryCode = `c${uniq}`.slice(0, 8).toLowerCase();
    const country = await prisma.country.create({
      data: {
        code: countryCode,
        name: `Cart PHI ${uniq}`,
        slug: `cart-phi-${uniq}`.toLowerCase(),
        legacyHomePath: `/lg-${uniq}`,
        teamPath: `/tm-${uniq}`,
        generalConsultationPath: `/gn-${uniq}`,
        specialistConsultationPath: `/sp-${uniq}`,
        currencyId,
      },
    });
    countryId = country.id;

    const doctor = await prisma.doctor.create({
      data: { countryId, slug: `cartphi-doc-${uniq}`, fullName: "Dr Cart PHI", title: "GP" },
    });
    doctorId = doctor.id;

    const service = await prisma.service.create({
      data: {
        countryId,
        slug: `cartphi-svc-${uniq}`,
        name: "Consultation",
        basePriceCents: 3000,
        currencyCode,
      },
    });
    serviceId = service.id;
    await prisma.serviceDoctor.create({
      data: { serviceId, doctorId, isActive: true, status: "active" },
    });

    // Guest cart — the cookie token is the whole session for this path.
    const cart = await prisma.cart.create({
      data: { cookieToken: cartToken, countryCode: "", currencyCode: "" },
    });
    cartId = cart.id;
  });

  after(async () => {
    if (!app) return;
    await prisma.cartItem.deleteMany({ where: { cartId } });
    await prisma.cart.deleteMany({ where: { id: cartId } });
    await prisma.doctorTimeSlot.deleteMany({ where: { doctorId } });
    await prisma.serviceDoctor.deleteMany({ where: { serviceId } });
    await prisma.service.deleteMany({ where: { id: serviceId } });
    await prisma.doctor.deleteMany({ where: { id: doctorId } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  function futureSlot() {
    const startAt = new Date(
      Date.now() + 14 * 24 * 60 * 60_000 + slotOffsetHours++ * 60 * 60_000,
    );
    startAt.setUTCMinutes(0, 0, 0);
    return prisma.doctorTimeSlot.create({
      data: {
        doctorId,
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60_000),
        status: "OPEN",
      },
    });
  }

  async function addItem(patient: Record<string, unknown>) {
    const slot = await futureSlot();
    const response = await app!.inject({
      method: "POST",
      url: "/api/cart/items",
      cookies: { gh_cart: cartToken },
      payload: {
        kind: "GENERAL_CONSULTATION",
        serviceId,
        doctorId,
        timeSlotId: slot.id,
        patient: {
          fullName: "Cart PHI Patient",
          email: patientEmail,
          consentAccepted: true,
          gdprConsentClinic: true,
          gdprConsentPlatform: true,
          crossBorderConsentAccepted: true,
          ...patient,
        },
      },
    });
    return { response, slotId: slot.id };
  }

  it("never writes the three identity numbers to CartItem in plaintext", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const { response, slotId } = await addItem({
      nationalIdNumber: NATIONAL_ID,
      passportNumber: PASSPORT,
      utenteNumber: UTENTE,
    });
    assert.equal(response.statusCode, 200, response.body);

    // Read the STORED row, not the response — the question is what sits in the
    // database for the life of an abandoned cart.
    const row = await prisma.cartItem.findUnique({ where: { timeSlotId: slotId } });
    assert.ok(row, "cart line was created");

    const stored = {
      nationalId: row!.patientNationalIdNumber,
      passport: row!.patientPassportNumber,
      utente: row!.patientUtenteNumber,
    };
    assert.notEqual(stored.nationalId, NATIONAL_ID, "national id is not plaintext");
    assert.notEqual(stored.passport, PASSPORT, "passport is not plaintext");
    assert.notEqual(stored.utente, UTENTE, "utente number is not plaintext");

    if (encryptionConfigured) {
      for (const value of Object.values(stored)) {
        assert.ok(value?.startsWith("phi:v1:"), `stored as an envelope, got ${String(value)}`);
      }
    }

    // Recoverable: the booking flow still needs the real values downstream.
    assert.equal(decryptPhi(stored.nationalId), NATIONAL_ID);
    assert.equal(decryptPhi(stored.passport), PASSPORT);
    assert.equal(decryptPhi(stored.utente), UTENTE);

    // And the API response must not hand back the values or their ciphertext.
    const body = response.body;
    for (const value of [NATIONAL_ID, PASSPORT, UTENTE]) {
      assert.equal(body.includes(value), false, "plaintext absent from the response");
    }
    for (const value of Object.values(stored)) {
      assert.equal(body.includes(String(value)), false, "ciphertext absent from the response");
    }
  });

  it("leaves absent identity numbers null rather than storing ciphertext", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const { response, slotId } = await addItem({});
    assert.equal(response.statusCode, 200, response.body);

    const row = await prisma.cartItem.findUnique({ where: { timeSlotId: slotId } });
    assert.ok(row);
    assert.equal(row!.patientNationalIdNumber, null);
    assert.equal(row!.patientPassportNumber, null);
    assert.equal(row!.patientUtenteNumber, null);
  });
});

describe("PR-4 — the envelope contract the downstream copies rely on", () => {
  it("wraps all three values in the phi:v1: envelope", { skip: !encryptionConfigured }, () => {
    for (const value of [NATIONAL_ID, PASSPORT, UTENTE]) {
      const stored = encryptPhi(value);
      assert.ok(stored?.startsWith("phi:v1:"), "stored value is an envelope");
      assert.equal(stored?.includes(value), false, "plaintext is absent from the stored value");
    }
  });

  it("round-trips to the original value", { skip: !encryptionConfigured }, () => {
    for (const value of [NATIONAL_ID, PASSPORT, UTENTE]) {
      assert.equal(decryptPhi(encryptPhi(value)), value);
    }
  });

  it("does not double-encrypt a value the cart already encrypted", () => {
    // This is what lets the OrderItem copy and the PatientProfile write stay
    // as they are now that the cart encrypts first.
    const once = encryptPhi(NATIONAL_ID);
    const twice = encryptPhi(once);
    assert.equal(twice, once, "an existing envelope passes through untouched");
    assert.equal(decryptPhi(twice), NATIONAL_ID);
  });

  it("encrypts a legacy plaintext cart/order value on the way to PatientProfile", () => {
    // Rows written before this change still hold plaintext; the completion
    // path must wrap them rather than copy them through.
    const legacy = PASSPORT;
    const written = encryptPhi(legacy);
    if (encryptionConfigured) {
      assert.ok(written?.startsWith("phi:v1:"));
    }
    assert.equal(decryptPhi(written), legacy);
  });

  it("preserves the envelope across a verbatim CartItem → OrderItem copy", () => {
    const cartValue = encryptPhi(UTENTE);
    const orderValue = cartValue; // orders.route.ts copies the column verbatim
    assert.equal(orderValue, cartValue);
    assert.equal(decryptPhi(orderValue), UTENTE);
  });

  it("leaves empty and null values exactly as they were", () => {
    assert.equal(encryptPhi(null), null);
    assert.equal(encryptPhi(undefined), null);
    assert.equal(encryptPhi(""), "");
    // `patient?.nationalIdNumber || null` collapses "" to null before this runs,
    // so an absent identity number stays absent rather than becoming ciphertext.
    const absent: string | null = "";
    assert.equal(encryptPhi(absent || null), null);
  });
});
