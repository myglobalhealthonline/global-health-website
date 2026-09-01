import { describe, expect, it, vi } from "vitest";

const { fetchPlansByCountry } = vi.hoisted(() => ({ fetchPlansByCountry: vi.fn() }));
vi.mock("@/lib/api/site-content-api", () => ({ fetchPlansByCountry }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  hasPublicApiBaseUrl: () => true,
}));
vi.mock("@/lib/content/public-content-source", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  logPublicContentFallback: vi.fn(),
}));

import { getCountryPlans, getCountryPlansResult } from "./get-country-plans";
import { PublicContentRequestError, PublicContentUnavailableError } from "./public-content-source";

const validPlan = {
  id: "plan-1",
  slug: "base",
  name: "Base",
  shortDescription: null,
  longDescription: null,
  badgeLabel: null,
  isFeatured: false,
  displayOrder: 0,
  monthlyPriceCents: 5000,
  currencyCode: "EUR",
  billingInterval: "MONTHLY",
  monthlyConsultationCredits: 1,
  wellnessCreditsPerMonth: 0,
  features: [],
  hasSpecialistDiscount: false,
  perkUnlockMonths: null,
  perks: [],
  wellnessKits: [],
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("getCountryPlansResult", () => {
  it("distinguishes a successful empty catalogue from transient failures", async () => {
    fetchPlansByCountry.mockResolvedValueOnce({ ok: true, data: { plans: [] } });
    await expect(getCountryPlansResult("pt", "pt")).resolves.toEqual({ ok: true, plans: [] });

    fetchPlansByCountry.mockResolvedValueOnce({ ok: false, status: 404, message: "not found" });
    await expect(getCountryPlansResult("pt-not-found", "pt")).rejects.toBeInstanceOf(PublicContentRequestError);

    fetchPlansByCountry.mockResolvedValueOnce({ ok: false, status: 503, message: "unavailable" });
    await expect(getCountryPlansResult("pt-failure", "pt")).rejects.toBeInstanceOf(PublicContentUnavailableError);

    fetchPlansByCountry.mockResolvedValueOnce({ ok: false, message: "timeout" });
    await expect(getCountryPlansResult("pt-timeout", "pt")).rejects.toBeInstanceOf(PublicContentUnavailableError);

    fetchPlansByCountry.mockResolvedValueOnce({ ok: false, status: 503, message: "unavailable" });
    await expect(getCountryPlans("pt-portal", "pt")).resolves.toEqual([]);
  });

  it("rejects malformed catalogues instead of treating them as empty", async () => {
    fetchPlansByCountry.mockResolvedValueOnce({ ok: true, data: {} });
    await expect(getCountryPlansResult("pt-missing-plans", "pt")).rejects.toBeInstanceOf(PublicContentUnavailableError);

    fetchPlansByCountry.mockResolvedValueOnce({
      ok: true,
      data: { plans: [{ ...validPlan, monthlyPriceCents: "5000" }] },
    });
    await expect(getCountryPlansResult("pt-invalid-price", "pt")).rejects.toBeInstanceOf(PublicContentUnavailableError);

    fetchPlansByCountry.mockResolvedValueOnce({
      ok: true,
      data: { plans: [{ ...validPlan, perks: [{ perkKey: "FAMILY_USAGE", unlockMode: "INVALID", unlockAfterPaidMonths: null }] }] },
    });
    await expect(getCountryPlansResult("pt-invalid-perk", "pt")).rejects.toBeInstanceOf(PublicContentUnavailableError);
  });
});
