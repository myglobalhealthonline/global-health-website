import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  firstName,
  postBodySchema,
  serializeMessage,
  startThreadBodySchema,
} from "./doctor-support.route.js";
import { supportSnippet } from "../modules/support/support-notify.service.js";

/**
 * Pure-function tests for the doctor ↔ support chat. No DB, no buildApp: the
 * pieces worth pinning here are the ones that decide what a doctor sees on a
 * bubble and which surface an attachment link points at.
 */

function row(overrides: Partial<Parameters<typeof serializeMessage>[0]> = {}) {
  return {
    id: "msg_1",
    authorRole: "ADMIN" as const,
    authorUserId: "usr_admin",
    body: "Looking into it now.",
    fileName: null,
    mimeType: null,
    byteSize: null,
    storageKey: null,
    readByDoctor: false,
    createdAt: new Date("2026-08-05T09:00:00.000Z"),
    author: { fullName: "Ehtesham Naumani" },
    ...overrides,
  };
}

describe("firstName", () => {
  it("takes the first token of a full name", () => {
    assert.equal(firstName("Ehtesham Naumani"), "Ehtesham");
  });

  it("handles a single-word name", () => {
    assert.equal(firstName("Madonna"), "Madonna");
  });

  it("collapses leading and inner whitespace", () => {
    assert.equal(firstName("   Ana   Sofia Costa "), "Ana");
  });

  it("falls back when the author account is gone or unnamed", () => {
    assert.equal(firstName(null), "Support");
    assert.equal(firstName(undefined), "Support");
    assert.equal(firstName("   "), "Support");
  });
});

describe("serializeMessage", () => {
  it("exposes authorUserId so the admin surface can render \"Me\"", () => {
    const out = serializeMessage(row(), "admin", "thr_1");
    assert.equal(out.authorUserId, "usr_admin");
    assert.equal(out.authorFirstName, "Ehtesham");
    assert.equal(out.authorFullName, "Ehtesham Naumani");
  });

  it("returns no download URL for a text-only message", () => {
    assert.equal(serializeMessage(row(), "doctor", "thr_1").downloadUrl, null);
  });

  it("points the download URL at the caller's own surface", () => {
    const attachment = row({ storageKey: "support-chat/thr_1/x-scan.png", fileName: "scan.png" });
    assert.equal(
      serializeMessage(attachment, "doctor", "thr_1").downloadUrl,
      "/api/doctor/support/messages/msg_1/download",
    );
    assert.equal(
      serializeMessage(attachment, "admin", "thr_1").downloadUrl,
      "/api/admin/support/threads/thr_1/messages/msg_1/download",
    );
  });

  it("keeps createdAt as an ISO string", () => {
    assert.equal(serializeMessage(row(), "admin", "thr_1").createdAt, "2026-08-05T09:00:00.000Z");
  });
});

describe("postBodySchema", () => {
  it("trims and accepts a normal message", () => {
    const parsed = postBodySchema.safeParse({ body: "  my payout looks wrong  " });
    assert.equal(parsed.success, true);
    assert.equal(parsed.success && parsed.data.body, "my payout looks wrong");
  });

  it("rejects an empty or whitespace-only body", () => {
    assert.equal(postBodySchema.safeParse({ body: "" }).success, false);
    assert.equal(postBodySchema.safeParse({ body: "    " }).success, false);
  });

  it("rejects a body over 4000 characters", () => {
    assert.equal(postBodySchema.safeParse({ body: "x".repeat(4001) }).success, false);
    assert.equal(postBodySchema.safeParse({ body: "x".repeat(4000) }).success, true);
  });

  it("rejects a missing or non-string body", () => {
    assert.equal(postBodySchema.safeParse({}).success, false);
    assert.equal(postBodySchema.safeParse({ body: 42 }).success, false);
  });
});

describe("supportSnippet", () => {
  it("prefers the body text", () => {
    assert.equal(supportSnippet({ body: "hello", fileName: "x.png" }), "hello");
  });

  it("truncates a long body to 140 chars including the ellipsis", () => {
    const snippet = supportSnippet({ body: "a".repeat(300) });
    assert.equal(snippet?.length, 140);
    assert.ok(snippet?.endsWith("…"));
  });

  it("describes an attachment-only message", () => {
    assert.equal(supportSnippet({ body: null, fileName: "scan.png" }), "Sent a file: scan.png");
    assert.equal(supportSnippet({ body: "   ", fileName: "scan.png" }), "Sent a file: scan.png");
  });

  it("returns null when there is nothing to describe", () => {
    assert.equal(supportSnippet({}), null);
    assert.equal(supportSnippet({ body: "  ", fileName: "  " }), null);
  });
});

describe("startThreadBodySchema", () => {
  it("accepts a doctor id with a trimmed opening message", () => {
    const parsed = startThreadBodySchema.safeParse({
      doctorId: "doc_1",
      body: "  Please re-upload your registration certificate.  ",
    });
    assert.equal(parsed.success, true);
    assert.equal(
      parsed.success && parsed.data.body,
      "Please re-upload your registration certificate.",
    );
  });

  it("requires an opening message — an empty thread would notify about nothing", () => {
    assert.equal(
      startThreadBodySchema.safeParse({ doctorId: "doc_1", body: "   " }).success,
      false,
    );
    assert.equal(startThreadBodySchema.safeParse({ doctorId: "doc_1" }).success, false);
  });

  it("requires a doctor id", () => {
    assert.equal(startThreadBodySchema.safeParse({ body: "hello" }).success, false);
    assert.equal(
      startThreadBodySchema.safeParse({ doctorId: "", body: "hello" }).success,
      false,
    );
  });

  it("shares the 4000-character ceiling with a normal message", () => {
    const ok = startThreadBodySchema.safeParse({ doctorId: "doc_1", body: "x".repeat(4000) });
    const tooLong = startThreadBodySchema.safeParse({ doctorId: "doc_1", body: "x".repeat(4001) });
    assert.equal(ok.success, true);
    assert.equal(tooLong.success, false);
  });
});
