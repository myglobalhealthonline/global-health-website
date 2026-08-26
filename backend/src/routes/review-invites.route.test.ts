import assert from "node:assert/strict";
import { afterEach, before, beforeEach, describe, it, mock } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";

const state: {
  invite: Record<string, unknown> | null;
  destinations: Array<{ provider: "GOOGLE" | "DOCTIFY" | "TRUSTPILOT"; url: string }>;
} = {
  invite: null,
  destinations: [],
};

let app: FastifyInstance | null = null;
let reviewInvitesRoute: (typeof import("./review-invites.route.js"))["default"];

before(async () => {
  mock.module("../modules/review-invites/review-invite.service.js", {
    namedExports: {
      createReviewInviteForAppointment: async () => null,
      getReviewInviteByToken: async () => state.invite,
      submitReviewInvite: async () => ({ ok: true }),
    },
  });
  mock.module("../modules/settings/settings.service.js", {
    namedExports: {
      getPatientReviewDestinations: async () => state.destinations,
    },
  });

  const routeModule = await import("./review-invites.route.js");
  reviewInvitesRoute = routeModule.default as unknown as typeof reviewInvitesRoute;
});

beforeEach(async () => {
  state.invite = {
    appointment: { countryCode: "IE" },
    customerName: "Jane Patient",
    doctorName: "Dr Review",
    serviceName: "General practice",
    localeCode: "en",
    submittedAt: null,
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  };
  state.destinations = [
    {
      provider: "GOOGLE",
      url: "https://search.google.com/local/writereview?placeid=ie",
    },
  ];

  app = Fastify();
  await app.register(reviewInvitesRoute);
  await app.ready();
});

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }
});

describe("GET /api/public/reviews/rate", () => {
  it("keeps the thank-you state available after submission even once the token has expired", async () => {
    state.invite = {
      ...state.invite,
      submittedAt: new Date("2026-08-01T10:00:00.000Z"),
      expiresAt: new Date("2026-08-10T00:00:00.000Z"),
    };

    const response = await app!.inject({
      method: "GET",
      url: "/api/public/reviews/rate?token=submitted-token",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.ok, true);
    assert.equal(body.data.submitted, true);
    assert.deepEqual(body.data.destinations, state.destinations);
  });

  it("still blocks an unsubmitted expired invite", async () => {
    state.invite = {
      ...state.invite,
      submittedAt: null,
      expiresAt: new Date("2026-08-10T00:00:00.000Z"),
    };

    const response = await app!.inject({
      method: "GET",
      url: "/api/public/reviews/rate?token=expired-token",
    });

    assert.equal(response.statusCode, 410);
    const body = response.json();
    assert.equal(body.ok, false);
  });
});
