/**
 * Self-check for the doctor-bio normalizer.
 *
 *   node --import tsx scripts/lib/normalize-bio.test.ts
 *
 * No DB, no network. Fails loudly on the first broken expectation.
 */
import assert from "node:assert/strict";
import { fixDashes, normalizeBio } from "./normalize-bio.js";

// --- dashes -----------------------------------------------------------------
assert.equal(
  fixDashes("experience in Medical Oncology — one of the most trained clinicians in Ireland."),
  "experience in Medical Oncology, one of the most trained clinicians in Ireland.",
  "lowercase after dash -> comma",
);
assert.equal(
  fixDashes("cannot replace in-person care — Dr Ali cannot prescribe chemotherapy here."),
  "cannot replace in-person care. Dr Ali cannot prescribe chemotherapy here.",
  "new capitalised clause after dash -> full stop",
);
assert.equal(
  fixDashes("eight years at Shaukat Khanum — a JCI-accredited cancer centre — where she worked"),
  "eight years at Shaukat Khanum, a JCI-accredited cancer centre, where she worked",
  "paired dashes -> paired commas",
);
assert.equal(fixDashes("Worked 2010—2015 in Cork"), "Worked 2010-2015 in Cork", "numeric range -> hyphen");
assert.equal(
  fixDashes("trained in Ireland and the UK — including Dublin"),
  "trained in Ireland and the UK, including Dublin",
  "dash after a conjunction never becomes a full stop",
);
assert.ok(!fixDashes("a — b — c — d").includes("—"), "no dash survives");

// --- plain text -------------------------------------------------------------
const plain = normalizeBio(
  "Dr X is a GP with ten years of experience — across Ireland and Spain.\n\nWhat he treats:\n• Acute illness — fever, flu, sore throat\n• Chronic disease — diabetes and hypertension\n\nHis approach: he listens first.",
);
assert.equal(
  plain,
  "<p>Dr X is a GP with ten years of experience, across Ireland and Spain.</p>" +
    "<h3>What he treats</h3>" +
    "<ul><li><strong>Acute illness:</strong> fever, flu, sore throat</li>" +
    "<li><strong>Chronic disease:</strong> diabetes and hypertension</li></ul>" +
    "<p>His approach: he listens first.</p>",
  "plain text -> paragraphs, heading, bullet list",
);

// --- paste-damaged html -----------------------------------------------------
const pasted = normalizeBio(
  '<p><span style="color:rgb(51, 51, 51)">Dr Y is a <b>cardiologist</b>.</span></p><p><br /></p><p>&nbsp;</p><p>She trained in Prague — Charles University.</p>',
);
assert.equal(
  pasted,
  "<p>Dr Y is a <strong>cardiologist</strong>.</p><p>She trained in Prague, Charles University.</p>",
  "colour spans, empty paragraphs and <b> are cleaned",
);

// --- idempotence ------------------------------------------------------------
for (const sample of [plain, pasted]) {
  assert.equal(normalizeBio(sample), sample, "normalizing twice changes nothing");
}

// --- content preservation ---------------------------------------------------
const source =
  "Dr Z works in Cork — Mercy University Hospital — and in Galway.\n\nWhat she offers — online:\n• Second opinions — reviewing reports\n";
const words = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .toLowerCase()
    .match(/\p{L}+/gu)!
    .join(" ");
assert.equal(
  words(normalizeBio(source)),
  words(source),
  "no words are added or dropped, only punctuation and markup change",
);

console.log("normalize-bio: all checks passed");
