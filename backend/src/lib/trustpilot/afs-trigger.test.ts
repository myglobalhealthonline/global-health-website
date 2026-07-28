import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTrustpilotAfsSnippet } from "./afs-trigger.js";

describe("Trustpilot AFS structured snippet", () => {
  const trigger = {
    customerEmail: "patient@example.com",
    customerName: "Maria",
    referenceId: "appt_123",
  };

  it("carries the three fields Trustpilot's parser reads", () => {
    const snippet = buildTrustpilotAfsSnippet(trigger);
    assert.match(snippet, /id="trustpilot-email">patient@example\.com</);
    assert.match(snippet, /id="trustpilot-name">Maria</);
    assert.match(snippet, /id="trustpilot-ref">appt_123</);
  });

  it("carries nothing beyond those fields", () => {
    // Everything in this block is disclosed to Trustpilot. A regression that
    // adds the doctor, service or appointment date here is a privacy problem,
    // not a formatting one — so the field count is asserted.
    const snippet = buildTrustpilotAfsSnippet(trigger);
    assert.equal(snippet.match(/<span /g)?.length, 3);
  });

  it("escapes names so a quote can't break out of the markup", () => {
    const snippet = buildTrustpilotAfsSnippet({
      ...trigger,
      customerName: 'A"><script>alert(1)</script>',
    });
    assert.ok(!snippet.includes("<script>"));
    assert.match(snippet, /&quot;&gt;&lt;script&gt;/);
  });

  it("stays hidden from any human reading the message", () => {
    assert.match(buildTrustpilotAfsSnippet(trigger), /display:none/);
  });
});
