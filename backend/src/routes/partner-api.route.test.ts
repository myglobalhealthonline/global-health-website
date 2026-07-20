import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import {
  callerMayAccessCountry,
  hashPartnerApiKey,
} from "../modules/partner-api/partner-api-key.service.js";
import {
  partnerAvailabilityQuerySchema,
  partnerCreateBookingBodySchema,
} from "../validations/partner-api.schema.js";

/**
 * Guards for the partner booking API (`/api/partner/v1/*`).
 *
 * The route tests skip when buildApp can't reach Postgres, mirroring
 * `admin-manual-booking.route.test.ts`. The schema, scope, and hashing
 * tests are pure and always run — they cover the rules that must hold
 * before any booking side-effect (slot claim, patient account, payment
 * link, WhatsApp/email) is allowed to happen.
 */

/** The booking body is flat — patient fields sit alongside the ids. */
function validBookingPayload(overrides: Record<string, unknown> = {}) {
  return {
    countryCode: "ie",
    serviceId: "svc_1",
    doctorId: "doc_1",
    timeSlotId: "slot_1",
    email: "partner-patient@example.com",
    fullName: "Partner Patient",
    phone: "+353 871234567",
    ...overrides,
  };
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

describe("partner API — authentication", () => {
  let app: FastifyInstance | null = null;
  let bootError: unknown = null;

  before(async () => {
    try {
      app = await buildApp();
    } catch (err) {
      bootError = err;
    }
  });

  after(async () => {
    if (app) await app.close();
  });

  /** Every endpoint is gated by the plugin-wide onRequest hook. If a new
   *  route is added to the file without auth, one of these fails. */
  const endpoints: { method: "GET" | "POST"; url: string; payload?: unknown }[] = [
    { method: "GET", url: "/api/partner/v1/countries" },
    { method: "GET", url: "/api/partner/v1/countries/ie/catalog" },
    {
      method: "GET",
      url: "/api/partner/v1/availability?countryCode=ie&serviceId=s&doctorId=d",
    },
    { method: "POST", url: "/api/partner/v1/bookings", payload: validBookingPayload() },
  ];

  for (const endpoint of endpoints) {
    it(`rejects ${endpoint.method} ${endpoint.url} with no API key`, async (t) => {
      if (!app) {
        t.skip(`buildApp() failed — DB likely offline: ${describeError(bootError)}`);
        return;
      }
      const res = await app.inject({
        method: endpoint.method,
        url: endpoint.url,
        ...(endpoint.payload ? { payload: endpoint.payload } : {}),
      });
      assert.equal(res.statusCode, 401, `expected 401, got ${res.statusCode}`);
    });
  }

  it("rejects a malformed API key without revealing whether it exists", async (t) => {
    if (!app) {
      t.skip(`buildApp() failed — DB likely offline: ${describeError(bootError)}`);
      return;
    }
    const res = await app.inject({
      method: "GET",
      url: "/api/partner/v1/countries",
      headers: { "x-api-key": "not-a-real-key" },
    });
    assert.equal(res.statusCode, 401);
    // Same message as a missing key — no oracle for key existence.
    assert.match(res.json().message, /Invalid or missing API key/);
  });
});

describe("partner API — key hashing", () => {
  it("hashes deterministically to a sha256 hex digest", () => {
    const key = "ghp_live_abcdef";
    const first = hashPartnerApiKey(key);
    assert.equal(first, hashPartnerApiKey(key));
    assert.match(first, /^[0-9a-f]{64}$/);
  });

  it("produces a different digest for a different key", () => {
    assert.notEqual(hashPartnerApiKey("ghp_live_a"), hashPartnerApiKey("ghp_live_b"));
  });
});

describe("partner API — country scoping", () => {
  const scoped = {
    clientId: "c1",
    name: "Scoped",
    allowedCountryCodes: ["pt", "es"],
  };
  const unscoped = { clientId: "c2", name: "Unscoped", allowedCountryCodes: [] };

  it("allows a country inside the scope", () => {
    assert.equal(callerMayAccessCountry(scoped, "pt"), true);
  });

  it("denies a country outside the scope", () => {
    assert.equal(callerMayAccessCountry(scoped, "ie"), false);
  });

  it("treats an empty scope list as unrestricted", () => {
    assert.equal(callerMayAccessCountry(unscoped, "ie"), true);
    assert.equal(callerMayAccessCountry(unscoped, "br"), true);
  });

  it("compares case-insensitively", () => {
    assert.equal(callerMayAccessCountry(scoped, "PT"), true);
    assert.equal(callerMayAccessCountry(scoped, " Es "), true);
  });
});

describe("partner API — booking schema", () => {
  it("accepts a minimal flat payload and normalises the email", () => {
    const parsed = partnerCreateBookingBodySchema.safeParse(
      validBookingPayload({ email: "Partner-Patient@Example.COM" }),
    );
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.email, "partner-patient@example.com");
    }
  });

  it("requires an international phone number", () => {
    const parsed = partnerCreateBookingBodySchema.safeParse(
      validBookingPayload({ phone: "0871234567" }),
    );
    assert.equal(parsed.success, false);
  });

  it("accepts the fiscal number, PT utente number and a one-line address", () => {
    const parsed = partnerCreateBookingBodySchema.safeParse(
      validBookingPayload({
        taxIdNumber: "123456789",
        utenteNumber: "987654321",
        address: "Rua Augusta 100, 1100-053 Lisboa",
      }),
    );
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.taxIdNumber, "123456789");
      assert.equal(parsed.data.address, "Rua Augusta 100, 1100-053 Lisboa");
    }
  });

  /** The old nested shape must fail loudly, not be silently dropped. */
  it("rejects the old nested patient object", () => {
    const nested = {
      countryCode: "ie",
      serviceId: "svc_1",
      doctorId: "doc_1",
      timeSlotId: "slot_1",
      patient: {
        email: "partner-patient@example.com",
        fullName: "Partner Patient",
        phone: "+353 871234567",
      },
    };
    assert.equal(partnerCreateBookingBodySchema.safeParse(nested).success, false);
  });

  /** These were removed from the contract — the server decides them, so a
   *  caller sending them must be told rather than silently ignored. */
  it("rejects fields the service now controls", () => {
    for (const [field, value] of [
      ["durationMinutes", 45],
      ["consultationMode", "IN_PERSON"],
      ["clinicId", "clinic_1"],
      ["locationAddress", "123 Main St"],
      ["insuranceCompanyId", "ins_1"],
      ["insurancePolicyNumber", "POL-1"],
    ] as const) {
      assert.equal(
        partnerCreateBookingBodySchema.safeParse(
          validBookingPayload({ [field]: value }),
        ).success,
        false,
        `${field} should be rejected`,
      );
    }
  });

  it("rejects the old split address fields", () => {
    for (const field of ["addressLine1", "addressCity", "addressCountryCode"]) {
      assert.equal(
        partnerCreateBookingBodySchema.safeParse(
          validBookingPayload({ [field]: "x" }),
        ).success,
        false,
        `${field} should be rejected in favour of address`,
      );
    }
  });

  it("rejects unknown keys so a typo'd field is never silently ignored", () => {
    const parsed = partnerCreateBookingBodySchema.safeParse(
      validBookingPayload({ doctor_id: "doc_2" }),
    );
    assert.equal(parsed.success, false);
  });

  it("requires the identifiers the availability call hands out", () => {
    for (const field of ["serviceId", "doctorId", "timeSlotId", "countryCode"]) {
      const payload = validBookingPayload();
      delete (payload as Record<string, unknown>)[field];
      assert.equal(
        partnerCreateBookingBodySchema.safeParse(payload).success,
        false,
        `${field} should be required`,
      );
    }
  });
});

describe("partner API — availability schema", () => {
  it("defaults the window to 14 days and coerces a string", () => {
    const parsed = partnerAvailabilityQuerySchema.safeParse({
      countryCode: "ie",
      serviceId: "svc_1",
      doctorId: "doc_1",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.equal(parsed.data.days, 14);

    const coerced = partnerAvailabilityQuerySchema.safeParse({
      countryCode: "ie",
      serviceId: "svc_1",
      doctorId: "doc_1",
      days: "7",
    });
    assert.equal(coerced.success, true);
    if (coerced.success) assert.equal(coerced.data.days, 7);
  });

  it("caps the window at 30 days", () => {
    assert.equal(
      partnerAvailabilityQuerySchema.safeParse({
        countryCode: "ie",
        serviceId: "svc_1",
        doctorId: "doc_1",
        days: 90,
      }).success,
      false,
    );
  });

  it("requires service and doctor", () => {
    assert.equal(
      partnerAvailabilityQuerySchema.safeParse({ countryCode: "ie" }).success,
      false,
    );
  });
});
