import { describe, expect, it, vi } from "vitest";

const { fetchDoctorByCountryAndSlug, getPublicDoctorBySlug, resolveDoctorProfileImageUrl } =
  vi.hoisted(() => ({
    fetchDoctorByCountryAndSlug: vi.fn(),
    getPublicDoctorBySlug: vi.fn(),
    resolveDoctorProfileImageUrl: vi.fn(),
  }));

vi.mock("@/lib/api/site-content-api", () => ({ fetchDoctorByCountryAndSlug }));
vi.mock("@/lib/content/get-public-doctors", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPublicDoctorBySlug,
  normalizePublicDoctorRecord: (row: unknown) => row,
}));
vi.mock("@/lib/content/get-public-assets", () => ({ resolveDoctorProfileImageUrl }));

import { resolveDoctorProfilePageData } from "./doctor-profile-data";

/** Minimal shape `resolveDoctorProfilePageData` reads off a normalized record. */
function record(slug: string, countryName: string) {
  return {
    slug,
    fullName: "Dr. Tiago Silva",
    title: "General Medicine",
    countryName,
    countryCode: countryName === "Portugal" ? "pt" : "ie",
    teamPath: "/portugal/en/doctors",
    bio: "Bio.",
    languages: ["Portuguese"],
    qualifications: [],
    specialties: [],
  };
}

describe("resolveDoctorProfilePageData market scoping", () => {
  it("flags a doctor who exists globally but is not rostered in the route country", async () => {
    resolveDoctorProfileImageUrl.mockResolvedValue(undefined);
    // Country-scoped lookup 404s for every slug candidate; global roster hits.
    fetchDoctorByCountryAndSlug.mockResolvedValue({ ok: false, status: 404 });
    getPublicDoctorBySlug.mockResolvedValue(record("dr-tiago-silva", "Portugal"));

    const data = await resolveDoctorProfilePageData("dr-tiago-silva", "en", "ie");

    expect(data.wrongMarket).toBe(true);
    expect(data.recordFound).toBe(false);
    // Never the global record's country — the page must not render at all.
    expect(data.indexable).toBe(false);
  });

  it("404s (not redirects) a slug that exists nowhere", async () => {
    resolveDoctorProfileImageUrl.mockResolvedValue(undefined);
    fetchDoctorByCountryAndSlug.mockResolvedValue({ ok: false, status: 404 });
    getPublicDoctorBySlug.mockResolvedValue(undefined);

    const data = await resolveDoctorProfilePageData("dr-nobody-here", "en", "ie");

    expect(data.wrongMarket).toBe(false);
    expect(data.missingConfirmed).toBe(true);
  });

  it("still falls back to the global roster on a NON-404 country failure", async () => {
    resolveDoctorProfileImageUrl.mockResolvedValue(undefined);
    fetchDoctorByCountryAndSlug.mockResolvedValue({ ok: false, status: 503 });
    getPublicDoctorBySlug.mockResolvedValue(record("dr-outage-case", "Portugal"));

    const data = await resolveDoctorProfilePageData("dr-outage-case", "en", "pt");

    expect(data.wrongMarket).toBe(false);
    expect(data.recordFound).toBe(true);
    // A blip must not stamp noindex on a live profile.
    expect(data.indexable).toBe(true);
  });

  it("renders normally when the country-scoped record resolves", async () => {
    resolveDoctorProfileImageUrl.mockResolvedValue(undefined);
    fetchDoctorByCountryAndSlug.mockResolvedValue({
      ok: true,
      data: { doctor: record("dr-cross-listed", "Portugal") },
    });
    getPublicDoctorBySlug.mockResolvedValue(undefined);

    const data = await resolveDoctorProfilePageData("dr-cross-listed", "en", "ie");

    expect(data.wrongMarket).toBe(false);
    expect(data.recordFound).toBe(true);
  });
});
