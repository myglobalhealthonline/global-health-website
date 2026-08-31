import { beforeEach, describe, expect, it, vi } from "vitest";

const { adminRequest } = vi.hoisted(() => ({ adminRequest: vi.fn() }));
vi.mock("@/lib/admin/admin-api/core", () => ({ adminRequest }));

import { updateAdminJob } from "@/lib/admin/admin-api/careers";

describe("careers admin API", () => {
  beforeEach(() => adminRequest.mockReset());

  it("passes a status-only archive patch without copying the job record", () => {
    updateAdminJob("job_1", { status: "ARCHIVED" });

    expect(adminRequest).toHaveBeenCalledWith("/api/admin/jobs/job_1", {
      method: "PATCH",
      body: { status: "ARCHIVED" },
    });
  });
});
