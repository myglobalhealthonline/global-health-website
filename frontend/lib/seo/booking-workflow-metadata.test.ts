import type { Metadata } from "next";
import { describe, expect, it } from "vitest";
import { applyBookingWorkflowIndexing } from "./booking-workflow-metadata";
import { BOOKING_WORKFLOW_PARAM_KEYS } from "@/lib/routing/book-href";

const CLEAN_BOOK_URL = "https://www.myglobalhealth.online/czechia/cs/book";

function cleanBookMetadata(): Metadata {
  return {
    title: "Book your consultation",
    alternates: { canonical: CLEAN_BOOK_URL },
    robots: { index: true, follow: true },
  };
}

describe("booking workflow metadata", () => {
  it("keeps the clean /book landing page indexable", () => {
    const metadata = applyBookingWorkflowIndexing(cleanBookMetadata(), {});

    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates?.canonical?.toString()).toBe(CLEAN_BOOK_URL);
  });

  it.each(BOOKING_WORKFLOW_PARAM_KEYS)(
    "marks /book?%s workflow state noindex, follow and keeps the clean canonical",
    (key) => {
      const metadata = applyBookingWorkflowIndexing(cleanBookMetadata(), {
        [key]: "workflow-value",
      });

      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(metadata.alternates?.canonical?.toString()).toBe(CLEAN_BOOK_URL);
    },
  );

  it("keeps tracking-only variants indexable under the clean canonical", () => {
    const metadata = applyBookingWorkflowIndexing(cleanBookMetadata(), {
      utm_source: "newsletter",
      gclid: "test-click-id",
    });

    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates?.canonical?.toString()).toBe(CLEAN_BOOK_URL);
  });

  // Google appends these to its own organic/Ads landing URLs. Treating them as
  // booking state would noindex a real search entry point.
  it.each(["srsltid", "_gl", "wbraid", "gbraid", "utm_id", "ttclid", "mc_cid"])(
    "keeps /book?%s= indexable — it is a click-tracking parameter, not wizard state",
    (key) => {
      const metadata = applyBookingWorkflowIndexing(cleanBookMetadata(), {
        [key]: "tracking-value",
      });

      expect(metadata.robots).toEqual({ index: true, follow: true });
    },
  );

  it("noindexes unknown non-tracking state so future wizard keys fail closed", () => {
    const metadata = applyBookingWorkflowIndexing(cleanBookMetadata(), {
      futureBookingStep: "value",
    });

    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("noindexes an explicitly present workflow key even when its value is empty", () => {
    const metadata = applyBookingWorkflowIndexing(cleanBookMetadata(), { doctor: "" });

    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("returns a new metadata object without mutating the clean metadata", () => {
    const clean = cleanBookMetadata();
    const metadata = applyBookingWorkflowIndexing(clean, { doctor: "dr-x" });

    expect(metadata).not.toBe(clean);
    expect(clean.robots).toEqual({ index: true, follow: true });
  });
});
