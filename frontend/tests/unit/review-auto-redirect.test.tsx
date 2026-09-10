import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ effects: [] as Array<() => unknown>, fetch: vi.fn(), action: vi.fn(), replace: vi.fn() }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(), useEffect: (effect: () => unknown) => mock.effects.push(effect) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("token=test") }));
vi.mock("@/lib/api/public-api", () => ({ fetchReviewForm: mock.fetch, performReviewAction: mock.action }));
import { ReviewRatePageClient } from "@/app/(portal)/reviews/rate/ReviewRatePageClient";
beforeEach(() => { vi.clearAllMocks(); mock.effects = []; vi.stubGlobal("window", { location: { replace: mock.replace } }); });
it.each([0, 1, 2])("redirects only when there is exactly one destination (%s)", async count => {
  mock.fetch.mockResolvedValue({ ok: true, data: { copy: {}, destinations: Array.from({ length: count }, () => ({ provider: "GOOGLE" })) } });
  mock.action.mockResolvedValue({ ok: true, data: { url: "https://g.page/example/review" } });
  renderToStaticMarkup(<ReviewRatePageClient language="en" />);
  mock.effects.forEach(effect => effect());
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(mock.action).toHaveBeenCalledTimes(count === 1 ? 1 : 0);
  expect(mock.replace).toHaveBeenCalledTimes(count === 1 ? 1 : 0);
});
it("keeps the chooser available when recording the redirect fails", async () => {
  mock.fetch.mockResolvedValue({ ok: true, data: { copy: {}, destinations: [{ provider: "GOOGLE" }] } });
  mock.action.mockResolvedValue({ ok: false });
  renderToStaticMarkup(<ReviewRatePageClient language="en" />);
  mock.effects.forEach(effect => effect());
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(mock.replace).not.toHaveBeenCalled();
});
