import { describe, expect, it } from "vitest";
import {
  creditReasonLabel,
  creditsUsed,
  formatCreditDelta,
  formatPerkUnlockNote,
  interpolate,
  perkStatus,
  pluralTemplate,
  progressPercent,
  progressRatio,
  remainingCredits,
} from "./format";

describe("interpolate", () => {
  it("replaces known tokens", () => {
    expect(interpolate("Hello {name}, {n} left", { name: "Ann", n: 3 })).toBe("Hello Ann, 3 left");
  });
  it("leaves unknown tokens untouched", () => {
    expect(interpolate("{a} {b}", { a: "x" })).toBe("x {b}");
  });
});

describe("pluralTemplate", () => {
  it("picks singular only for exactly 1", () => {
    expect(pluralTemplate(1, "one", "many")).toBe("one");
    expect(pluralTemplate(0, "one", "many")).toBe("many");
    expect(pluralTemplate(2, "one", "many")).toBe("many");
  });
});

describe("formatPerkUnlockNote", () => {
  const copy = {
    universal: "Perks unlock after {months} paid months.",
    universalSingular: "Perks unlock after {months} paid month.",
  };
  it("is data-driven from the months value (plural)", () => {
    expect(formatPerkUnlockNote(2, copy)).toBe("Perks unlock after 2 paid months.");
  });
  it("uses the singular template for 1 month", () => {
    expect(formatPerkUnlockNote(1, copy)).toBe("Perks unlock after 1 paid month.");
  });
  it("returns null when nothing is gated", () => {
    expect(formatPerkUnlockNote(null, copy)).toBeNull();
    expect(formatPerkUnlockNote(0, copy)).toBeNull();
  });
  it("honours a non-2 configured value (not hardcoded)", () => {
    expect(formatPerkUnlockNote(3, copy)).toBe("Perks unlock after 3 paid months.");
  });
});

describe("remainingCredits", () => {
  it("never goes negative", () => {
    expect(remainingCredits(4, 6)).toBe(2);
    expect(remainingCredits(8, 6)).toBe(0);
  });
});

describe("progressRatio / progressPercent", () => {
  it("clamps to [0,1]", () => {
    expect(progressRatio(3, 6)).toBe(0.5);
    expect(progressRatio(9, 6)).toBe(1);
    expect(progressRatio(-1, 6)).toBe(0);
  });
  it("treats a non-positive target as complete", () => {
    expect(progressRatio(0, 0)).toBe(1);
  });
  it("rounds percent", () => {
    expect(progressPercent(1, 3)).toBe(33);
  });
});

describe("perkStatus", () => {
  it("MONTH_1 is always unlocked", () => {
    expect(perkStatus({ unlockMode: "MONTH_1", unlockAfterPaidMonths: null }, 0)).toBe("unlocked");
  });
  it("AFTER_PAID_MONTHS gates on the rule's own month count", () => {
    expect(perkStatus({ unlockMode: "AFTER_PAID_MONTHS", unlockAfterPaidMonths: 2 }, 1)).toBe("locked");
    expect(perkStatus({ unlockMode: "AFTER_PAID_MONTHS", unlockAfterPaidMonths: 2 }, 2)).toBe("unlocked");
    expect(perkStatus({ unlockMode: "AFTER_PAID_MONTHS", unlockAfterPaidMonths: 3 }, 2)).toBe("locked");
  });
  it("MANUAL_APPROVAL is its own state", () => {
    expect(perkStatus({ unlockMode: "MANUAL_APPROVAL", unlockAfterPaidMonths: null }, 9)).toBe("manual");
  });
});

describe("creditsUsed", () => {
  it("derives used from granted minus remaining", () => {
    expect(creditsUsed(3, 1)).toBe(2);
    expect(creditsUsed(3, 3)).toBe(0);
  });
  it("clamps when remaining exceeds granted (manual adjustments)", () => {
    expect(creditsUsed(2, 5)).toBe(0);
  });
});

describe("creditReasonLabel", () => {
  const labels = {
    reason_MONTHLY_GRANT: "Monthly credits added",
    reason_ADJUSTMENT: "Manual adjustment",
  };
  it("maps a known reason via the copy map", () => {
    expect(creditReasonLabel("MONTHLY_GRANT", labels)).toBe("Monthly credits added");
    expect(creditReasonLabel("ADJUSTMENT", labels)).toBe("Manual adjustment");
  });
  it("humanises an unmapped reason instead of showing the raw enum", () => {
    expect(creditReasonLabel("RESET_EXPIRE", labels)).toBe("reset expire");
  });
});

describe("formatCreditDelta", () => {
  it("signs positive and negative deltas with a real minus glyph", () => {
    expect(formatCreditDelta(2)).toBe("+2");
    expect(formatCreditDelta(-1)).toBe("−1");
    expect(formatCreditDelta(0)).toBe("0");
  });
});
