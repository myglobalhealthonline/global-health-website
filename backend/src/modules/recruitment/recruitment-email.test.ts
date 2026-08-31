import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

const state: {
  query: Record<string, unknown> | null;
  email: Record<string, unknown> | null;
} = { query: null, email: null };

let sendNotification: typeof import("./recruitment-email.js")["sendRecruitmentApplicationNotification"];

before(async () => {
  mock.module("../../config/env.js", {
    namedExports: {
      env: {
        NODE_ENV: "test",
        RECRUITMENT_NOTIFICATION_EMAIL: "careers@myglobalhealth.online",
      },
    },
  });
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        jobApplication: {
          findUnique: async (query: Record<string, unknown>) => {
            state.query = query;
            return {
              submittedAt: new Date("2026-08-31T12:00:00.000Z"),
              fullName: "Jane Candidate",
              email: "jane@example.com",
              phone: "+353 1 234 5678",
              message: "Private candidate message",
              cvStorageKey: "recruitment/cv/random.pdf",
              jobListing: { title: "General Practitioner", country: { name: "Ireland" } },
            };
          },
        },
      },
    },
  });
  mock.module("../../lib/email/send-email.js", {
    namedExports: {
      absoluteSiteUrl: (path: string) => `https://example.test${path}`,
      sendEmail: async (email: Record<string, unknown>) => {
        state.email = email;
        return { ok: true, id: "email-1", mode: "smtp" };
      },
    },
  });
  ({ sendRecruitmentApplicationNotification: sendNotification } = await import(
    "./recruitment-email.js"
  ));
});

beforeEach(() => {
  state.query = null;
  state.email = null;
});

describe("recruitment notification privacy", () => {
  it("selects and sends only job context, never applicant PII or CV data", async () => {
    await sendNotification("application-1");

    const email = state.email;
    const query = state.query;
    assert.ok(email);
    assert.ok(query);
    assert.equal(email.to, "careers@myglobalhealth.online");
    const selectedFields = JSON.stringify(query.select) ?? "";
    for (const forbiddenField of ["fullName", "email", "phone", "message", "cvStorageKey"]) {
      assert.equal(selectedFields.includes(forbiddenField), false);
    }
    const serializedEmail = JSON.stringify(email);
    for (const forbiddenValue of [
      "Jane Candidate",
      "jane@example.com",
      "+353 1 234 5678",
      "Private candidate message",
      "random.pdf",
    ]) {
      assert.equal(serializedEmail.includes(forbiddenValue), false, `must exclude ${forbiddenValue}`);
    }
    assert.match(serializedEmail, /General Practitioner/);
    assert.match(serializedEmail, /Ireland/);
  });
});
