import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTrustpilotAfsSnippet, toTrustpilotLocale } from "./afs-trigger.js";

/** Pull the JSON payload back out of the <script> block, the way
 *  Trustpilot's parser does, so the tests assert on parsed data rather
 *  than on string formatting. */
function parseSnippet(snippet: string): Record<string, unknown> {
  const match = /<script type="application\/json\+trustpilot">\n([\s\S]*)\n<\/script>/.exec(
    snippet,
  );
  assert.ok(match, "snippet is not a well-formed application/json+trustpilot block");
  return JSON.parse(match[1]) as Record<string, unknown>;
}

describe("Trustpilot AFS structured snippet", () => {
  const trigger = {
    customerEmail: "patient@example.com",
    customerName: "Maria",
    referenceId: "appt_123",
  };

  it("carries the three fields Trustpilot's parser requires", () => {
    assert.deepEqual(parseSnippet(buildTrustpilotAfsSnippet(trigger)), {
      recipientName: "Maria",
      recipientEmail: "patient@example.com",
      referenceId: "appt_123",
    });
  });

  it("adds the locale only when one was resolved", () => {
    const withLocale = parseSnippet(
      buildTrustpilotAfsSnippet({ ...trigger, locale: "pt-BR" }),
    );
    assert.equal(withLocale.locale, "pt-BR");
    assert.equal("locale" in parseSnippet(buildTrustpilotAfsSnippet(trigger)), false);
  });

  it("carries nothing beyond those fields", () => {
    // Everything in this block is disclosed to Trustpilot. A regression that
    // adds the doctor, service or appointment date here is a privacy problem,
    // not a formatting one — so the field set is asserted, not just its shape.
    assert.deepEqual(Object.keys(parseSnippet(buildTrustpilotAfsSnippet(trigger))).sort(), [
      "recipientEmail",
      "recipientName",
      "referenceId",
    ]);
  });

  it("survives a name that would otherwise close the script block", () => {
    const snippet = buildTrustpilotAfsSnippet({
      ...trigger,
      customerName: 'A</script><script>alert(1)</script>',
    });
    // Exactly one opening and one closing tag — the payload can't break out.
    assert.equal(snippet.match(/<script/g)?.length, 1);
    assert.equal(snippet.match(/<\/script>/g)?.length, 1);
    // ...and the name still round-trips intact for Trustpilot.
    assert.equal(parseSnippet(snippet).recipientName, 'A</script><script>alert(1)</script>');
  });

  it("quotes in a name don't corrupt the JSON", () => {
    const snippet = buildTrustpilotAfsSnippet({ ...trigger, customerName: 'Ana "Nina" Sá' });
    assert.equal(parseSnippet(snippet).recipientName, 'Ana "Nina" Sá');
  });
});

describe("Trustpilot locale mapping", () => {
  it("maps our locale codes to Trustpilot's ISO 15897 tags", () => {
    assert.equal(toTrustpilotLocale("pt-br"), "pt-BR");
    assert.equal(toTrustpilotLocale("en"), "en-GB");
    assert.equal(toTrustpilotLocale("CS"), "cs-CZ");
  });

  it("omits anything it can't map rather than guessing", () => {
    assert.equal(toTrustpilotLocale("kl-GL"), undefined);
    assert.equal(toTrustpilotLocale(null), undefined);
    assert.equal(toTrustpilotLocale(""), undefined);
  });
});
