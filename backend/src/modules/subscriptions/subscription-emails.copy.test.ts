import assert from "node:assert/strict";
import { describe, it } from "node:test";
import en from "./email-copy/en.json";
import pt from "./email-copy/pt.json";
import es from "./email-copy/es.json";
import cs from "./email-copy/cs.json";
import ro from "./email-copy/ro.json";
import de from "./email-copy/de.json";

/**
 * Patient subscription email copy must exist in every active locale with an
 * identical key set (no per-key fallback at send time), and the EN templates
 * must keep their interpolation tokens. Pure — no DB.
 */
describe("subscription email copy", () => {
  const bundles = { en, pt, es, cs, ro, de } as Record<string, unknown>;

  function keys(obj: unknown, prefix = ""): string[] {
    if (!obj || typeof obj !== "object") return [prefix];
    return Object.entries(obj as Record<string, unknown>)
      .flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
      .sort();
  }

  it("has identical key sets across all active locales", () => {
    const base = keys(en);
    for (const [code, bundle] of Object.entries(bundles)) {
      assert.deepEqual(keys(bundle), base, `locale ${code} key set differs from en`);
    }
  });

  it("keeps data-driven tokens in EN templates", () => {
    assert.match(en.confirmed.subject, /\{plan\}/);
    assert.match(en.confirmed.p2, /\{credits\}/);
    assert.match(en.perkUnlocked.p1, /\{perk\}/);
    assert.match(en.perkUnlocked.p1, /\{months\}/);
    assert.match(en.reminder.p1, /\{date\}/);
    assert.match(en.canceled.p2, /\{date\}/);
    assert.match(en.wellnessEarned.p1, /\{balance\}/);
  });

  it("never implies in-person care or prescriptions in EN", () => {
    const all = JSON.stringify(en).toLowerCase();
    assert.ok(!all.includes("in-person"), "no in-person wording");
    assert.ok(!all.includes("in person"), "no in person wording");
    assert.ok(!all.includes("prescription"), "no prescription wording");
  });
});
