import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

type ReviewInviteRow = {
  id: string;
  channel: "INTERNAL" | "TRUSTPILOT";
  expiresAt: Date;
  localeCode?: string | null;
  scheduledFor?: Date | null;
  submittedAt?: Date | null;
};

const state: {
  appointment: Record<string, unknown> | null;
  existingInvite: ReviewInviteRow | null;
  createCalls: Array<Record<string, unknown>>;
  emailCalls: Array<Record<string, unknown>>;
  whatsappCalls: Array<Record<string, unknown>>;
  settingRows: Array<{ key: string; value: unknown }>;
} = {
  appointment: null,
  existingInvite: null,
  createCalls: [],
  emailCalls: [],
  whatsappCalls: [],
  settingRows: [],
};

let service: typeof import("./review-invite.service.js");

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        appointment: {
          findUnique: async () => state.appointment,
        },
        setting: {
          findMany: async () => state.settingRows,
        },
        reviewInvite: {
          findFirst: async () => state.existingInvite,
          create: async ({ data }: { data: Record<string, unknown> }) => {
            state.createCalls.push(data);
            return {
              id: "invite_new",
              submittedAt: null,
              ...data,
            };
          },
          count: async () => 0,
          findMany: async () => [],
          updateMany: async () => ({ count: 0 }),
          update: async () => ({}),
          findUnique: async () => null,
        },
      },
    },
  });
  mock.module("../../config/env.js", {
    namedExports: {
      env: {
        PUBLIC_SITE_URL: "https://myglobalhealth.online",
        TRUSTPILOT_MONTHLY_INVITE_LIMIT: 50,
      },
    },
  });
  mock.module("../../lib/email/templates.js", {
    namedExports: {
      sendReviewInviteEmail: async (input: Record<string, unknown>) => {
        state.emailCalls.push(input);
      },
    },
  });
  mock.module("../../lib/whatsapp/wasender.js", {
    namedExports: {
      sendWhatsAppText: async (input: Record<string, unknown>) => {
        state.whatsappCalls.push(input);
        return { ok: true };
      },
    },
  });
  mock.module("../../lib/trustpilot/afs-trigger.js", {
    namedExports: {
      isTrustpilotAfsConfigured: () => false,
      sendTrustpilotAfsTrigger: async () => ({ ok: true, message: "" }),
      toTrustpilotLocale: () => undefined,
    },
  });

  service = await import("./review-invite.service.js");
});

beforeEach(() => {
  state.appointment = {
    id: "appt_1",
    status: "COMPLETED",
    fullName: "Maria Silva",
    email: "maria@example.com",
    phone: "+351910000000",
    consultationType: "GP consultation",
    countryCode: "BR",
    notificationLocale: null,
    doctor: { fullName: "Dr Sofia Costa" },
    service: { name: "General practice" },
  };
  state.existingInvite = null;
  state.createCalls = [];
  state.emailCalls = [];
  state.whatsappCalls = [];
  state.settingRows = [
    {
      key: "review.destination:BR",
      value: {
        sendReviewRequests: true,
        googleReviewUrl: "https://search.google.com/local/writereview?placeid=br",
        doctifyReviewUrl: null,
      },
    },
  ];
});

describe("createReviewInviteForAppointment", () => {
  it("does not create or send an invite when the country toggle is disabled", async () => {
    state.settingRows = [
      {
        key: "review.destination:BR",
        value: {
          sendReviewRequests: false,
          googleReviewUrl: "https://search.google.com/local/writereview?placeid=br",
          doctifyReviewUrl: null,
        },
      },
    ];

    const result = await service.createReviewInviteForAppointment("appt_1");

    assert.equal(result, null);
    assert.equal(state.createCalls.length, 0);
    assert.equal(state.emailCalls.length, 0);
    assert.equal(state.whatsappCalls.length, 0);
  });

  it("does not send when enabled but no valid review profile is configured", async () => {
    state.settingRows = [
      {
        key: "review.destination:BR",
        value: {
          sendReviewRequests: true,
          googleReviewUrl: null,
          doctifyReviewUrl: null,
        },
      },
    ];

    const result = await service.createReviewInviteForAppointment("appt_1");

    assert.equal(result, null);
    assert.equal(state.createCalls.length, 0);
    assert.equal(state.emailCalls.length, 0);
    assert.equal(state.whatsappCalls.length, 0);
  });

  it("reuses an unexpired legacy Trustpilot invite instead of minting a second ask", async () => {
    const legacyInvite: ReviewInviteRow = {
      id: "invite_legacy",
      channel: "TRUSTPILOT",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      localeCode: "en",
      scheduledFor: new Date("2099-01-02T00:00:00.000Z"),
      submittedAt: null,
    };
    state.existingInvite = legacyInvite;

    const result = await service.createReviewInviteForAppointment("appt_1");

    assert.equal(result, legacyInvite);
    assert.equal(state.createCalls.length, 0);
    assert.equal(state.emailCalls.length, 0);
    assert.equal(state.whatsappCalls.length, 0);
  });

  it("creates the universal internal invite with the market locale and sends the hub link", async () => {
    const result = await service.createReviewInviteForAppointment("appt_1");

    assert.equal(state.createCalls.length, 1);
    assert.equal(state.createCalls[0].channel, "INTERNAL");
    assert.equal(state.createCalls[0].localeCode, "pt-br");
    assert.equal(state.createCalls[0].scheduledFor, null);
    assert.equal(result?.channel, "INTERNAL");

    assert.equal(state.emailCalls.length, 1);
    assert.equal(state.emailCalls[0].localeTitle, "Como foi a sua consulta?");
    assert.match(
      String(state.emailCalls[0].link),
      /^https:\/\/myglobalhealth\.online\/reviews\/rate\?token=/,
    );

    assert.equal(state.whatsappCalls.length, 1);
    assert.match(
      String(state.whatsappCalls[0].message),
      /^Como foi a sua consulta\?\nhttps:\/\/myglobalhealth\.online\/reviews\/rate\?token=/,
    );
  });
});
