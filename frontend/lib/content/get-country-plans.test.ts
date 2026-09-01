import { describe, expect, it, vi } from "vitest";

const { fetchPlansByCountry } = vi.hoisted(() => ({ fetchPlansByCountry: vi.fn() }));
vi.mock("@/lib/api/site-content-api", () => ({ fetchPlansByCountry }));
vi.mock("@/lib/content/public-content-source", () => ({ logPublicContentFallback: vi.fn() }));

import { getCountryPlansResult } from "./get-country-plans";

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
  it("distinguishes a successful empty catalogue from a failed request", async () => {
    fetchPlansByCountry.mockResolvedValueOnce({ ok: true, data: { plans: [] } });
    await expect(getCountryPlansResult("pt", "pt")).resolves.toEqual({ ok: true, plans: [] });

    fetchPlansByCountry.mockResolvedValueOnce({ ok: false, status: 503, message: "unavailable" });
    await expect(getCountryPlansResult("pt-failure", "pt")).resolves.toEqual({ ok: false, plans: [] });
  });

  it("rejects malformed catalogues instead of treating them as empty", async () => {
    fetchPlansByCountry.mockResolvedValueOnce({ ok: true, data: {} });
    await expect(getCountryPlansResult("pt-missing-plans", "pt")).resolves.toEqual({ ok: false, plans: [] });

    fetchPlansByCountry.mockResolvedValueOnce({
      ok: true,
      data: { plans: [{ ...validPlan, monthlyPriceCents: "5000" }] },
    });
    await expect(getCountryPlansResult("pt-invalid-price", "pt")).resolves.toEqual({ ok: false, plans: [] });

    fetchPlansByCountry.mockResolvedValueOnce({
      ok: true,
      data: { plans: [{ ...validPlan, perks: [{ perkKey: "FAMILY_USAGE", unlockMode: "INVALID", unlockAfterPaidMonths: null }] }] },
    });
    await expect(getCountryPlansResult("pt-invalid-perk", "pt")).resolves.toEqual({ ok: false, plans: [] });
  });
});
