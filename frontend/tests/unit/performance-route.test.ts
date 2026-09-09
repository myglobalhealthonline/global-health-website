import { describe, expect, it } from "vitest";
import { performanceRoute } from "@/lib/analytics/performance-route";

describe("performance route privacy", () => {
  it("drops booking query strings and detail identifiers", () => {
    expect(performanceRoute("/ireland/en/book?patient=secret#token")).toBe("/ireland/en/book");
    expect(performanceRoute("/brazil/pt/doctors/someone")).toBe("/brazil/pt/doctors/:slug");
  });
  it.each(["/account/patient", "/admin/patients/email", "/share/token", "/brazil/consent", "/ireland/en/checkout/success"])("excludes %s", (path) => {
    expect(performanceRoute(path)).toBeNull();
  });
});
