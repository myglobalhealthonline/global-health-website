import { describe, expect, it } from "vitest";
import type { SubscriptionView } from "@/lib/api/me-subscription";
import {
  activeSubscriptionFor,
  safeReturnTo,
  subscribeHref,
} from "./pricing-personalization";

function sub(overrides: Partial<SubscriptionView>): SubscriptionView {
  return {
    plan: { id: "plan_1", slug: "essential", name: "Essential", monthlyPriceCents: 2000, currencyCode: "EUR" },
    countryCode: "ie",
    status: "ACTIVE",
    currentPeriodEnd: null,
    paidMonthsCount: 1,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

describe("activeSubscriptionFor", () => {
  it("keeps ACTIVE and PAST_DUE subs in the viewed country (case-insensitive)", () => {
    expect(activeSubscriptionFor(sub({}), "IE")).not.toBeNull();
    expect(activeSubscriptionFor(sub({ status: "PAST_DUE" }), "ie")).not.toBeNull();
  });

  it("drops subs from another country — plans are per-country", () => {
    expect(activeSubscriptionFor(sub({ countryCode: "pt" }), "ie")).toBeNull();
  });

  it("drops non-live subs and no sub at all", () => {
    expect(activeSubscriptionFor(sub({ status: "CANCELLED" }), "ie")).toBeNull();
    expect(activeSubscriptionFor(sub({ countryCode: null }), "ie")).toBeNull();
    expect(activeSubscriptionFor(null, "ie")).toBeNull();
  });
});

describe("safeReturnTo", () => {
  it("accepts in-site relative paths only", () => {
    expect(safeReturnTo("/ireland/en/cart")).toBe("/ireland/en/cart");
    expect(safeReturnTo("https://evil.test/x")).toBeUndefined();
    expect(safeReturnTo("//evil.test")).toBeUndefined();
    expect(safeReturnTo("//evil")).toBeUndefined(); // protocol-relative open redirect
    expect(safeReturnTo("/x?y=1")).toBeUndefined();
    expect(safeReturnTo(null)).toBeUndefined();
  });
});

describe("subscribeHref", () => {
  it("sends anonymous visitors through login with the subscribe action preserved", () => {
    expect(subscribeHref("plan_1", "ie", "en", false)).toBe(
      "/login?next=%2Faccount%2Fsubscribe%3Fplan%3Dplan_1%26country%3Die%26lang%3Den",
    );
  });

  it("sends authenticated visitors straight to confirm, carrying returnTo", () => {
    expect(subscribeHref("plan_1", "ie", "en", true, "/ireland/en/cart")).toBe(
      "/account/subscribe?plan=plan_1&country=ie&lang=en&returnTo=%2Fireland%2Fen%2Fcart",
    );
  });
});
