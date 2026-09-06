import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  COUNTRY_BLOCKER_LABELS,
  COUNTRY_CONFIG_LABELS,
  canConfirmCountryDelete,
  describeCounts,
  parseCountryImpactResponse,
  type CountryImpactLoad,
} from "@/app/(portal)/(admin)/admin/_components/country-delete-impact";
import { DeleteCountryButton } from "@/app/(portal)/(admin)/admin/_components/delete-country-button";
import type {
  CountryDeleteBlockers,
  CountryDeleteImpact,
  CountryDeleteRemovableConfiguration,
} from "@/lib/admin/admin-api";

/**
 * AZ-3 — the admin country permanent-delete confirmation.
 *
 * The dialog is a warning, not the guard: `purgeAdminCountry` recounts every
 * blocker inside its deletion transaction under a row lock and answers 409
 * regardless of what was shown here. What these tests pin is that the admin is
 * never OFFERED a delete that would destroy durable history, that the counts
 * they see are counts and nothing else, and that a second click cannot fire a
 * second submit.
 *
 * The frontend unit suite runs without a DOM, so the decision logic lives in
 * `country-delete-impact.ts` and is exercised directly; the component itself is
 * covered by a static render.
 */

const ZERO_BLOCKERS: CountryDeleteBlockers = {
  doctors: 0,
  appointments: 0,
  clinicalRecords: 0,
  patientRecords: 0,
  membershipEnrollments: 0,
  allowanceBalances: 0,
  allowanceUsage: 0,
  subscriptions: 0,
  financialRecords: 0,
  corporateRecords: 0,
  legalDocuments: 0,
  jobListings: 0,
};

const ZERO_CONFIG: CountryDeleteRemovableConfiguration = {
  locales: 0,
  domains: 0,
  clinics: 0,
  specialties: 0,
  services: 0,
  healthTests: 0,
  pricingPlans: 0,
  membershipPlans: 0,
  contentPages: 0,
  seoLandingPages: 0,
  mediaAssets: 0,
  testCenters: 0,
  insuranceCompanies: 0,
  marketSettings: 0,
};

type ImpactOverrides = {
  blocked?: boolean;
  blockers?: Partial<CountryDeleteBlockers>;
  removableConfiguration?: Partial<CountryDeleteRemovableConfiguration>;
  detachedRecords?: Partial<CountryDeleteImpact["detachedRecords"]>;
};

const impactOf = (over: ImpactOverrides = {}): CountryDeleteImpact => {
  const blockers = { ...ZERO_BLOCKERS, ...(over.blockers ?? {}) };
  return {
    blocked: over.blocked ?? Object.values(blockers).some((n) => n > 0),
    blockers,
    removableConfiguration: { ...ZERO_CONFIG, ...(over.removableConfiguration ?? {}) },
    detachedRecords: { blogPosts: 0, faqs: 0, reviews: 0, ...(over.detachedRecords ?? {}) },
  };
};

const ready = (impact: CountryDeleteImpact): CountryImpactLoad => ({ status: "ready", impact });

describe("country delete impact — response parsing", () => {
  it("reads a successful impact payload", () => {
    const impact = impactOf({ blockers: { membershipEnrollments: 3 } });
    const load = parseCountryImpactResponse(200, { ok: true, data: impact });
    expect(load).toEqual({ status: "ready", impact });
  });

  it("treats a 404 as its own state, not an error", () => {
    expect(parseCountryImpactResponse(404, { ok: false, message: "Country not found" })).toEqual({
      status: "missing",
    });
  });

  it("surfaces the server message on a failure", () => {
    expect(
      parseCountryImpactResponse(503, { ok: false, message: "Countries data is unavailable" }),
    ).toEqual({ status: "error", message: "Countries data is unavailable" });
  });

  it("falls back to a generic message when the body is unreadable", () => {
    const load = parseCountryImpactResponse(500, null);
    expect(load.status).toBe("error");
    expect(load).toHaveProperty("message", "Could not check linked records.");
  });

  it("treats a 200 with no data as an error rather than as permission", () => {
    expect(parseCountryImpactResponse(200, { ok: true }).status).toBe("error");
  });
});

describe("country delete impact — count rendering", () => {
  it("renders only non-zero counts, singular and plural", () => {
    const blockers = { ...ZERO_BLOCKERS, membershipEnrollments: 1, appointments: 4 };
    expect(describeCounts(blockers, COUNTRY_BLOCKER_LABELS)).toBe(
      "4 appointments, 1 membership enrollment",
    );
  });

  it("renders nothing when every count is zero", () => {
    expect(describeCounts(ZERO_BLOCKERS, COUNTRY_BLOCKER_LABELS)).toBe("");
  });

  it("summarizes the configuration a safe delete would remove", () => {
    const config = { ...ZERO_CONFIG, locales: 2, services: 1 };
    expect(describeCounts(config, COUNTRY_CONFIG_LABELS)).toBe("2 locales, 1 service");
  });

  it("has a label for every blocker and configuration key the API returns", () => {
    expect(Object.keys(COUNTRY_BLOCKER_LABELS).sort()).toEqual(Object.keys(ZERO_BLOCKERS).sort());
    expect(Object.keys(COUNTRY_CONFIG_LABELS).sort()).toEqual(Object.keys(ZERO_CONFIG).sort());
  });

  it("renders no patient-identifying value — the labels are static text", () => {
    const rendered = describeCounts(
      { ...ZERO_BLOCKERS, patientRecords: 2, clinicalRecords: 1 },
      COUNTRY_BLOCKER_LABELS,
    );
    expect(rendered).toBe("1 clinical record, 2 patient records");
    expect(rendered).not.toMatch(/@|\d{4}-\d{2}-\d{2}|[A-Za-z]+\s+[A-Za-z]+@/);
  });
});

describe("country delete impact — confirm gating", () => {
  const base = { typedValue: "ireland", requiredValue: "ireland", pending: false };

  it("does not arm while the impact check is still loading", () => {
    expect(canConfirmCountryDelete({ ...base, load: { status: "loading" } })).toBe(false);
  });

  it("does not arm when the country holds durable records", () => {
    const load = ready(impactOf({ blockers: { membershipEnrollments: 1 } }));
    expect(canConfirmCountryDelete({ ...base, load })).toBe(false);
  });

  it("does not arm when the country has already been deleted", () => {
    expect(canConfirmCountryDelete({ ...base, load: { status: "missing" } })).toBe(false);
  });

  it("arms for a country with nothing durable linked", () => {
    const load = ready(impactOf({ removableConfiguration: { locales: 2 } }));
    expect(canConfirmCountryDelete({ ...base, load })).toBe(true);
  });

  it("still requires the typed slug on an unblocked country", () => {
    const load = ready(impactOf());
    expect(canConfirmCountryDelete({ ...base, load, typedValue: "irelan" })).toBe(false);
    expect(canConfirmCountryDelete({ ...base, load, typedValue: "  ireland  " })).toBe(true);
  });

  it("does not arm a second time while a submit is pending", () => {
    const load = ready(impactOf());
    expect(canConfirmCountryDelete({ ...base, load, pending: true })).toBe(false);
  });

  it("still arms when the check itself failed — the server is the authority", () => {
    const load: CountryImpactLoad = { status: "error", message: "offline" };
    expect(canConfirmCountryDelete({ ...base, load })).toBe(true);
  });
});

describe("DeleteCountryButton", () => {
  const markup = renderToStaticMarkup(
    <DeleteCountryButton
      countryId="country-1"
      countryName="Ireland"
      confirmValue="ireland"
      className="gh-btn gh-btn-danger w-full"
      ariaLabel="Delete country permanently"
    >
      Delete permanently
    </DeleteCountryButton>,
  );

  it("renders the trigger, closed, with no counts or record data on the page", () => {
    expect(markup).toContain("Delete permanently");
    expect(markup).toContain('aria-label="Delete country permanently"');
    expect(markup).not.toContain("membership enrollment");
    expect(markup).not.toContain("@");
  });

  it("is a button, never a submit — the dialog decides whether the form fires", () => {
    expect(markup).toContain('type="button"');
    expect(markup).not.toContain('type="submit"');
  });
});
