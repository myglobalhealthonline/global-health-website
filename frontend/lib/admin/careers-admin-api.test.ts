import { beforeEach, describe, expect, it, vi } from "vitest";

const { adminRequest } = vi.hoisted(() => ({ adminRequest: vi.fn() }));
vi.mock("@/lib/admin/admin-api/core", () => ({ adminRequest }));

import { createAdminJobGroup, updateAdminJobGroup } from "@/lib/admin/admin-api/careers";

describe("careers admin API", () => {
  beforeEach(() => adminRequest.mockReset());

  it("uses the atomic job-group endpoints for localized writes", () => {
    const body = {
      countryId: "country-cz",
      slug: "doctor",
      workplaceMode: "REMOTE" as const,
      status: "DRAFT" as const,
      closesAt: null,
      localizations: [{
        locale: "CS" as const,
        title: "Praktický lékař",
        department: "Medicína",
        location: "Česko",
        employmentType: "Smlouva",
        minimumExperience: null,
        descriptionHtml: "<p>Role</p>",
      }],
    };

    createAdminJobGroup(body);
    updateAdminJobGroup("job_1", body);

    expect(adminRequest).toHaveBeenNthCalledWith(1, "/api/admin/job-groups", {
      method: "POST",
      body,
    });
    expect(adminRequest).toHaveBeenNthCalledWith(2, "/api/admin/job-groups/job_1", {
      method: "PATCH",
      body,
    });
  });

  it("passes a status-only group archive without copying the job record", () => {
    updateAdminJobGroup("job_1", { status: "ARCHIVED" });

    expect(adminRequest).toHaveBeenCalledWith("/api/admin/job-groups/job_1", {
      method: "PATCH",
      body: { status: "ARCHIVED" },
    });
  });
});
