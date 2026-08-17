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
});
