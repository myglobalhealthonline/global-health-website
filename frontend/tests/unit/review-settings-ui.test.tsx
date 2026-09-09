import { Children, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const { patch, authorize, readSettings } = vi.hoisted(() => ({ patch: vi.fn(async (body: unknown) => ({ ok: true, body })), authorize: vi.fn(), readSettings: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); }, usePathname: () => "/admin/settings/reviews" }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/admin/require-admin-action", () => ({ requireAdminAction: authorize }));
vi.mock("@/lib/admin/admin-api", () => ({
  fetchAdminReviewSettings: async () => { readSettings(); return ({ ok: true, data: {
    automation: { enabled: false, delayHours: 24, maxFollowups: 1, followupIntervalDays: 7 },
    doctify: { reviewUrl: "https://www.doctify.com/ie/review/Qatcoi/single", aggregate: null },
    trustpilot: { reviewUrl: null, aggregate: null }, google: { aggregate: null }, primaryProvider: null,
    destinations: [{ countryCode: "CZ", countryName: "Czechia", isActive: true, sendReviewRequests: false, googleReviewUrl: "https://g.page/r/CZPoObaUvwL8ECE/review" }],
  } }); },
  patchAdminReviewSettings: patch,
  fetchReviewEmailPreviews: async () => ({ ok: true, data: [] }),
}));
import Page from "@/app/(portal)/(admin)/admin/settings/reviews/page";
import { ReviewActivity } from "@/app/(portal)/(admin)/admin/settings/reviews/ReviewActivity";
vi.mock("@/lib/admin/admin-api/settings", () => ({
  fetchReviewActivity: async () => ({ ok: true, data: { rows: [], total: 0, page: 1, pageSize: 25, counts: { sent: 4 } } }),
  actOnReviewActivity: vi.fn(),
}));

function findAction(node: ReactNode): ((data: FormData) => Promise<void>) | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode; action?: (data: FormData) => Promise<void> }>(child)) continue;
    if (child.type === "form") return child.props.action;
    const action = findAction(child.props.children);
    if (action) return action;
  }
}
beforeEach(() => { vi.clearAllMocks(); });
it("opens GBP setup by default and keeps optional website fields separate", async () => {
  const html = renderToStaticMarkup(await Page({}));
  expect(html).toContain("Google Business Profile (GBP) links by country");
  expect(html).toContain("https://g.page/r/CZPoObaUvwL8ECE/review");
  expect(html).toContain("Save review links");
  expect(html).not.toContain('name="primaryProvider"');
});
it.each(["links", "automation"])("saving %s cannot clear settings on another tab", async (section) => {
  const page = await Page({ searchParams: Promise.resolve({ tab: section }) });
  const action = findAction(page)!;
  const data = new FormData();
  Object.entries({ section, doctifyReviewUrl: "https://www.doctify.com/ie/review/Qatcoi/single", googleReviewUrl_CZ: "https://g.page/r/CZPoObaUvwL8ECE/review", sendReviewRequests_CZ: "false", delayHours: "24", maxFollowups: "1", followupIntervalDays: "7" }).forEach(([key, value]) => data.set(key, value));
  await expect(action(data)).rejects.toThrow(`tab=${section}`);
  expect(authorize).toHaveBeenCalledOnce();
  expect(Object.keys(patch.mock.calls[0][0] as object).sort()).toEqual(section === "links" ? ["destinations", "doctify", "trustpilot"] : ["automation"]);
});
it("activity cards filter by status, keep the country and reset pagination", async () => {
  const html = renderToStaticMarkup(await ReviewActivity({ searchParams: { country: "CZ", page: "5" } }));
  expect(html).toContain('href="?tab=activity&amp;status=sent&amp;country=CZ"');
  expect(html).toContain("No review emails to show");
  expect(html).not.toContain("Review confirmed by provider");
});
it.each([true, false])("saves the GBP checkbox as %s with a fresh settings read", async (enabled) => {
  const action = findAction(await Page({}))!;
  const data = new FormData();
  data.set("section", "links");
  data.set("googleReviewUrl_CZ", "https://g.page/r/CZPoObaUvwL8ECE/review");
  data.set("sendReviewRequests_CZ", String(enabled));
  await expect(action(data)).rejects.toThrow("success=Review%20settings%20saved");
  expect(readSettings).toHaveBeenCalledTimes(2);
  expect(patch).toHaveBeenCalledWith(expect.objectContaining({ destinations: [{ countryCode: "CZ", sendReviewRequests: enabled, googleReviewUrl: "https://g.page/r/CZPoObaUvwL8ECE/review" }] }));
});
it("website ratings are optional and point back to GBP setup", async () => {
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ tab: "website" }) }));
  expect(html).toContain("Add or edit GBP and Doctify review links");
  expect(html).toContain("Edit website ratings and widget settings");
  expect(html).not.toMatch(/<details[^>]* open/);
});
