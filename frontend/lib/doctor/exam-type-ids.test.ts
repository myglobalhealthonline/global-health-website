import { describe, expect, it } from "vitest";
import { buildExamTypeIdsField } from "./exam-type-ids";

/**
 * Alignment is the whole point of this helper: the backend reads the result
 * positionally against the exams lines, so an off-by-one silently attaches the
 * wrong catalogue id — and therefore the wrong price and the wrong result
 * match — to a real patient's exam.
 */
describe("buildExamTypeIdsField", () => {
  const glucose = { id: "et_glucose", name: "Glucose" };
  const cbc = { id: "et_cbc", name: "Full blood count" };

  it("returns an empty string when nothing was picked from the catalogue", () => {
    expect(buildExamTypeIdsField("Glucose\nChest X-Ray", [])).toBe("");
  });

  it("returns an empty string when no pick survives in the textarea", () => {
    // Doctor picked, then deleted the line and typed something else.
    expect(buildExamTypeIdsField("Chest X-Ray", [glucose])).toBe("");
  });

  it("aligns ids to their lines and leaves free-typed lines blank", () => {
    expect(buildExamTypeIdsField("Chest X-Ray\nGlucose\nUrine dip", [glucose])).toBe(
      "\net_glucose\n",
    );
  });

  it("keeps ids on the right lines after the doctor reorders them", () => {
    expect(buildExamTypeIdsField("Full blood count\nGlucose", [glucose, cbc])).toBe(
      "et_cbc\net_glucose",
    );
  });

  it("preserves blank lines so the index alignment cannot shift", () => {
    expect(buildExamTypeIdsField("Glucose\n\nFull blood count", [glucose, cbc])).toBe(
      "et_glucose\n\net_cbc",
    );
  });

  it("consumes each pick once when the same exam is listed twice", () => {
    // Two identical lines, one pick — the second line stays unpriced rather
    // than claiming the same catalogue row twice.
    expect(buildExamTypeIdsField("Glucose\nGlucose", [glucose])).toBe("et_glucose\n");
  });

  it("matches on the trimmed label, so stray whitespace does not lose the id", () => {
    expect(buildExamTypeIdsField("  Glucose  ", [glucose])).toBe("et_glucose");
  });

  it("handles CRLF line endings", () => {
    expect(buildExamTypeIdsField("Chest X-Ray\r\nGlucose", [glucose])).toBe("\net_glucose");
  });
});
