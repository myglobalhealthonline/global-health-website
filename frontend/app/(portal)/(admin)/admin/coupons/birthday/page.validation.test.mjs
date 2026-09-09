// Run with Node 24: node "frontend/app/(portal)/(admin)/admin/coupons/birthday/page.validation.test.mjs"
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { runInThisContext } from "node:vm";

// Exercise the page's actual validator without loading Next.js or requiring dependencies.
const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const validator = source.slice(source.indexOf("function parseSettings("), source.indexOf("const fields:"));
const parse = runInThisContext(`(${stripTypeScriptTypes(validator)})`);
assert.deepEqual(parse(false, "", "30", false).settings, {
  enabled: false, discountPercent: null, validityDays: 30,
});
assert.ok(parse(true, "", "30", false).error);
assert.ok(parse(false, "", "30", true).error);
for (const discount of ["0", "101", "1.5", "NaN", "Infinity"]) {
  assert.ok(parse(true, discount, "30", false).error, discount);
}
for (const validity of ["", "0", "366", "1.5", "NaN", "Infinity"]) {
  assert.ok(parse(true, "20", validity, false).error, validity);
}
for (const discount of ["1", "100"]) {
  for (const validity of ["1", "365"]) {
    assert.equal(parse(true, discount, validity, true).settings.discountPercent, Number(discount));
  }
}
console.log("Birthday offer validation: passed");
