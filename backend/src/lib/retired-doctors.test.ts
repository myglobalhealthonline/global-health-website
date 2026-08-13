import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { RETIRED_DOCTOR_SLUGS, isRetiredDoctorSlug } from "./retired-doctors.js";

/**
 * The datasheet importer is re-runnable and writes real doctor rows. A departed
 * clinician's full profile lives in the datasheet as the historical record, so
 * the only thing standing between an accidental `--apply` and a resurrected
 * profile is the guard at the top of `patchDoctor`.
 *
 * No DB access here — the script itself calls `main()` at module scope, so it
 * can never be imported by a test. The write-ordering assertion is therefore
 * made against the source, which is also the thing that would actually regress
 * (someone moving the guard below the first query).
 */

// `__dirname`, not `import.meta` — this package compiles to CommonJS. The
// datasheet is read as TEXT rather than imported for the same reason: it lives
// outside `rootDir: src`, so importing it fails the build even though tsx runs
// it happily.
const SCRIPTS = join(__dirname, "..", "..", "scripts");
const source = readFileSync(join(SCRIPTS, "applied", "patch-ireland-doctors-datasheet.ts"), "utf8");
const datasheet = readFileSync(join(SCRIPTS, "data", "ireland-doctors-datasheet.ts"), "utf8");

/** Every `dbSlug` the Ireland datasheet would import. */
const datasheetSlugs = [...datasheet.matchAll(/dbSlug:\s*"([^"]+)"/g)].map((m) => m[1]);

/** Body of `patchDoctor`, up to the next top-level `async function`. */
function patchDoctorBody(): string {
  const start = source.indexOf("async function patchDoctor(");
  assert.notEqual(start, -1, "patchDoctor() not found — the guard may have moved");
  const rest = source.slice(start + 1);
  const next = rest.indexOf("\nasync function ");
  return next === -1 ? rest : rest.slice(0, next);
}

describe("retired doctor slugs", () => {
  it("dr-grainne-ahern is retired", () => {
    assert.equal(isRetiredDoctorSlug("dr-grainne-ahern"), true);
    assert.equal(RETIRED_DOCTOR_SLUGS.has("dr-grainne-ahern"), true);
  });

  it("tolerates casing and surrounding whitespace", () => {
    assert.equal(isRetiredDoctorSlug("Dr-Grainne-Ahern"), true);
    assert.equal(isRetiredDoctorSlug("  dr-grainne-ahern  "), true);
  });

  it("affects no other doctor", () => {
    // Every other slug in the Ireland datasheet must still be importable.
    const others = datasheetSlugs.filter((s) => s !== "dr-grainne-ahern");
    assert.ok(others.length > 0, "datasheet has no other doctors — test is vacuous");
    for (const slug of others) {
      assert.equal(isRetiredDoctorSlug(slug), false, `${slug} must not be retired`);
    }
  });

  it("does not match a slug that merely contains the retired one", () => {
    assert.equal(isRetiredDoctorSlug("dr-grainne-ahern-jr"), false);
    assert.equal(isRetiredDoctorSlug("not-dr-grainne-ahern"), false);
  });

  it("the retired doctor is still IN the datasheet — history is not rewritten", () => {
    assert.ok(
      datasheetSlugs.includes("dr-grainne-ahern"),
      "datasheet entry was deleted; the guard replaces deletion, not the reverse",
    );
    assert.match(datasheet, /Dr\. Gráinne Ahern is an experienced General Practitioner/);
  });
});

describe("patch-ireland-doctors-datasheet guard wiring", () => {
  it("imports and calls the guard", () => {
    assert.match(source, /import \{ isRetiredDoctorSlug \} from "\.\.\/\.\.\/src\/lib\/retired-doctors\.js";/);
    assert.match(source, /isRetiredDoctorSlug\(sheet\.dbSlug\)/);
  });

  it("guards BEFORE any prisma operation in patchDoctor", () => {
    const body = patchDoctorBody();
    const guard = body.indexOf("isRetiredDoctorSlug(sheet.dbSlug)");
    const firstPrisma = body.indexOf("prisma.");
    assert.notEqual(guard, -1, "guard missing from patchDoctor");
    assert.notEqual(firstPrisma, -1, "no prisma call found — did patchDoctor change shape?");
    assert.ok(
      guard < firstPrisma,
      "the retired-slug guard must run before the first prisma call, or a retired doctor is read/written before being skipped",
    );
  });

  it("the guard returns, so no create/update/upsert can follow it", () => {
    const body = patchDoctorBody();
    const guard = body.indexOf("isRetiredDoctorSlug(sheet.dbSlug)");
    const afterGuard = body.slice(guard);
    const ret = afterGuard.indexOf("return;");
    assert.ok(ret !== -1 && ret < afterGuard.indexOf("prisma."), "guard must return before any prisma call");
  });

  it("patchDoctor is still the single entry point per doctor", () => {
    // If main() ever stops funnelling through patchDoctor, the guard is bypassed.
    assert.match(source, /for \(const sheet of IRELAND_DOCTORS\)/);
    assert.match(source, /await patchDoctor\(sheet\)/);
    const writes = [...source.matchAll(/prisma\.\w+\.(create|update|upsert|createMany|updateMany)\b/g)];
    assert.ok(writes.length > 0, "no writes found — re-check this test's assumptions");
    const patchStart = source.indexOf("async function patchDoctor(");
    for (const w of writes) {
      assert.ok(
        w.index! > patchStart,
        `write outside patchDoctor at index ${w.index} would bypass the guard: ${w[0]}`,
      );
    }
  });
});
