import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getGpAvailability } = vi.hoisted(() => ({ getGpAvailability: vi.fn() }));

vi.mock("@/lib/content/get-gp-availability", () => ({ getGpAvailability }));

import { GET } from "@/app/api/public/gp-availability/route";

describe("gp availability route", () => {
  beforeEach(() => {
    getGpAvailability.mockResolvedValue({
      service: null,
      clinicTimezone: "Europe/Dublin",
      slots: [],
      bookability: null,
    });
  });

  it("forwards the clinic-calendar horizon explicitly", async () => {
    const response = await GET(
      new NextRequest("https://example.test/api/public/gp-availability?country=ie&language=en&days=2&clinicDays=1"),
    );

    expect(response.status).toBe(200);
    expect(getGpAvailability).toHaveBeenCalledWith("ie", "en", 2, true);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
