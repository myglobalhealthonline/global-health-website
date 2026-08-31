import { describe, expect, it } from "vitest";
import {
  classifyPublicJobs,
  groupJobsByDepartment,
  normalizePublicJob,
  type PublicJob,
} from "./get-public-jobs";

const job = (overrides: Partial<PublicJob> = {}): PublicJob => ({
  id: "job_1", slug: "doctor", title: "Doctor", department: "Medical",
  location: "Remote", workplaceMode: "REMOTE", employmentType: "Contract",
  minimumExperience: null, publishedAt: "2026-08-31T00:00:00.000Z",
  closesAt: null, updatedAt: "2026-08-31T00:00:00.000Z", ...overrides,
});

describe("public jobs boundary", () => {
  it("rejects malformed records instead of rendering partial jobs", () => {
    expect(normalizePublicJob({ ...job(), workplaceMode: "ANYWHERE" })).toBeNull();
    expect(normalizePublicJob({ ...job(), id: "" })).toBeNull();
  });

  it("groups departments alphabetically without mutating the input", () => {
    const input = [job({ id: "2", department: "Technology" }), job({ id: "1" })];
    const original = [...input];
    expect(groupJobsByDepartment(input).map((group) => group.department)).toEqual(["Medical", "Technology"]);
    expect(input).toEqual(original);
  });

  it.each([undefined, null, {}, "not-an-array"])(
    "treats a missing or non-array jobs payload as unavailable",
    (jobs) => expect(classifyPublicJobs(jobs)).toEqual({ state: "unavailable", jobs: [] }),
  );

  it("distinguishes a valid empty result from an invalid non-empty result", () => {
    expect(classifyPublicJobs([])).toEqual({ state: "empty", jobs: [] });
    expect(classifyPublicJobs([{ ...job(), id: "" }, { arbitrary: true }])).toEqual({
      state: "unavailable",
      jobs: [],
    });
  });

  it("keeps valid rows when a non-empty payload also contains malformed rows", () => {
    expect(classifyPublicJobs([job(), { arbitrary: true }])).toEqual({
      state: "loaded",
      jobs: [job()],
    });
  });
});
