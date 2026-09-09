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

const stops: unknown[][] = [];
let app: FastifyInstance | null = null;
let reviewInvitesRoute: (typeof import("./review-invites.route.js"))["default"];

before(async () => {
  mock.module("../modules/review-invites/review-campaign.service.js", { namedExports: { stopReviewCampaign: async (...args: unknown[]) => { stops.push(args); } } });
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
  stops.length = 0;
  state.invite = {
    id: "invite1",
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
  it("expires submitted invitations too", async () => {
    state.invite = {
      ...state.invite,
      submittedAt: new Date("2026-08-01T10:00:00.000Z"),
      expiresAt: new Date("2026-08-10T00:00:00.000Z"),
    };

    const response = await app!.inject({
      method: "GET",
      url: "/api/public/reviews/rate?token=submitted-token",
    });

    assert.equal(response.statusCode, 410);
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

it("GET exposes providers immediately without private/clinical data or stopping reminders", async () => {
 const response = await app!.inject({ method: "GET", url: "/api/public/reviews/rate?token=valid" });
 assert.equal(response.statusCode, 200);
 assert.deepEqual(response.json().data.destinations, state.destinations);
 assert.equal(response.json().data.invite, undefined);
 assert.equal(response.json().data.submitted, false);
 assert.equal(response.headers["cache-control"], "no-store");
 assert.equal(response.headers["referrer-policy"], "no-referrer");
 assert.deepEqual(stops, []);
});
it("only explicit POST records provider choice and returns configured URL", async () => {
 const response = await app!.inject({ method: "POST", url: "/api/public/reviews/action", payload: { token: "valid", action: "provider_opened", provider: "GOOGLE" } });
 assert.equal(response.statusCode, 200);
 assert.deepEqual(stops, [["invite1", "provider_opened", "GOOGLE"]]);
 assert.equal(response.json().data.url, state.destinations[0].url);
});
it("rejects removed providers without stopping the sequence", async () => {
 const response = await app!.inject({ method: "POST", url: "/api/public/reviews/action", payload: { token: "valid", action: "provider_opened", provider: "DOCTIFY" } });
 assert.equal(response.statusCode, 400);
 assert.deepEqual(stops, []);
});
it("records self-report and optout only through POST", async () => {
 for (const action of ["patient_reviewed", "opted_out"]) {
 const response = await app!.inject({ method: "POST", url: "/api/public/reviews/action", payload: { token: "valid", action } });
 assert.equal(response.statusCode, 200);
 }
 assert.equal(stops.length, 2);
});
it("rejects repeated or oversized query tokens safely", async () => {
 for (const token of ["x&token=y", "x".repeat(257)]) {
 const response = await app!.inject({ method: "GET", url: "/api/public/reviews/rate?token=" + token });
 assert.equal(response.statusCode, 400);
 }
});
