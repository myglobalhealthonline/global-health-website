import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("live availability fetchers", () => {
  it("keeps a 404 as a genuine empty service-availability result", async () => {
    const { getServiceAggregatedAvailability } = await import("./get-service-availability");
    fetchMock.mockResolvedValueOnce(response(404, { ok: false }));

    await expect(getServiceAggregatedAvailability("ie", "gp")).resolves.toMatchObject({ slots: [] });
  });

  it("throws a retryable error for a failed service-availability response", async () => {
    const { AvailabilityUnavailableError } = await import("./availability-fetch");
    const { getServiceAggregatedAvailability } = await import("./get-service-availability");
    fetchMock.mockResolvedValueOnce(response(503, { ok: false }));

    await expect(getServiceAggregatedAvailability("ie", "gp")).rejects.toBeInstanceOf(AvailabilityUnavailableError);
  });

  it("rejects malformed successful availability payloads instead of treating them as no slots", async () => {
    const { AvailabilityUnavailableError } = await import("./availability-fetch");
    const { getGpAvailability } = await import("./get-gp-availability");
    const { getServiceDoctorAvailability } = await import("./get-doctor-availability");
    fetchMock.mockResolvedValueOnce(response(200, { ok: true, data: { service: null, slots: "bad" } }));
    await expect(getGpAvailability("ie", "en")).rejects.toBeInstanceOf(AvailabilityUnavailableError);

    fetchMock.mockResolvedValueOnce(response(200, { ok: true, data: { slots: {} } }));
    await expect(getServiceDoctorAvailability("ie", "gp", "doctor")).rejects.toBeInstanceOf(AvailabilityUnavailableError);
  });

  it("maps a network timeout to a retryable error", async () => {
    const { AvailabilityUnavailableError } = await import("./availability-fetch");
    const { getGpAvailability } = await import("./get-gp-availability");
    fetchMock.mockRejectedValueOnce(Object.assign(new Error("timed out"), { name: "TimeoutError" }));

    await expect(getGpAvailability("ie", "en")).rejects.toBeInstanceOf(AvailabilityUnavailableError);
  });
});
