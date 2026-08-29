import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BookCta } from "./BookNowButton";
import { isBookingWorkflowHref } from "@/lib/routing/book-href";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("BookCta crawl surface", () => {
  it("renders booking workflow state as a button without a crawlable href", () => {
    expect(isBookingWorkflowHref("/czechia/cs/book?doctor=dr-michael-nytra")).toBe(true);
    const html = renderToStaticMarkup(
      <BookCta href="/czechia/cs/book?doctor=dr-michael-nytra">Book</BookCta>,
    );

    expect(html).toContain("<button");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("href=");
  });

  it("keeps the clean booking landing page as a crawlable link", () => {
    const html = renderToStaticMarkup(<BookCta href="/czechia/cs/book">Book</BookCta>);

    expect(html).toContain("<a");
    expect(html).toContain('href="/czechia/cs/book"');
  });

  it("renders an unavailable action as a native disabled button", () => {
    const html = renderToStaticMarkup(
      <BookCta
        href="/czechia/cs/book?doctor=dr-michael-nytra"
        bookability={{
          state: "UNAVAILABLE",
          reasonCode: "NO_OPEN_SLOT",
          nextAvailableAt: null,
        }}
        unavailableLabel="Not accepting online bookings"
      >
        Book
      </BookCta>,
    );

    expect(html).toContain("<button");
    expect(html).toContain('disabled=""');
    expect(html).toContain("Not accepting online bookings");
    expect(html).not.toContain("href=");
  });

  it("keeps RETURNING disabled and exposes its localized status description", () => {
    const html = renderToStaticMarkup(
      <BookCta
        href="/czechia/cs/book"
        bookability={{
          state: "RETURNING",
          reasonCode: "DOCTOR_PAUSED",
          nextAvailableAt: "2026-09-17T09:00:00.000Z",
        }}
        returningLabel="Appointments reopen 17 September"
      >
        Book
      </BookCta>,
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain("Appointments reopen 17 September");
    expect(html).not.toContain("href=");
  });

  it("keeps BOOKABLE active with the original CTA copy", () => {
    const html = renderToStaticMarkup(
      <BookCta
        href="/czechia/cs/book?doctor=dr-michael-nytra"
        bookability={{
          state: "BOOKABLE",
          reasonCode: null,
          nextAvailableAt: "2026-09-03T09:00:00.000Z",
        }}
        nextAvailableLabel="Next available Thursday, 3 September"
      >
        Book
      </BookCta>,
    );

    expect(html).not.toContain('disabled=""');
    expect(html).toContain("Book");
    expect(html).not.toContain("Next available Thursday, 3 September");
  });
});
