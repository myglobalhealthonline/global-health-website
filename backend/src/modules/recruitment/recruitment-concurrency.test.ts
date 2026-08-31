import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

type JobRow = {
  id: string;
  countryId: string;
  locale: "EN";
  slug: string;
  title: string;
  department: string;
  location: string;
  workplaceMode: "REMOTE";
  employmentType: string;
  minimumExperience: string | null;
  descriptionHtml: string;
  status: "PUBLISHED" | "ARCHIVED";
  publishedAt: Date;
  closesAt: Date | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const state: { job: JobRow; archiveDuringValidation: boolean } = {
  job: {} as JobRow,
  archiveDuringValidation: false,
};

let service: typeof import("./recruitment.service.js");

before(async () => {
  const tx = {
    jobListing: {
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const expectedUpdatedAt = where.updatedAt as Date;
        if (
          state.job.id !== where.id ||
          state.job.status !== where.status ||
          state.job.updatedAt.getTime() !== expectedUpdatedAt.getTime()
        ) {
          return { count: 0 };
        }
        state.job = { ...state.job, ...data } as JobRow;
        return { count: 1 };
      },
      findUnique: async () => ({
        ...state.job,
        country: { id: "country-ie", code: "ie", name: "Ireland", slug: "ireland" },
        _count: { applications: 0 },
      }),
    },
  };

  mock.module("../../config/env.js", {
    namedExports: { env: { CLAMAV_HOST: "clamav" } },
  });
  mock.module("../../services/object-storage.js", {
    namedExports: { isMediaStorageConfigured: () => true },
  });
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        jobListing: { findUnique: async () => ({ ...state.job }) },
        country: {
          findUnique: async () => {
            if (state.archiveDuringValidation) {
              state.job = {
                ...state.job,
                status: "ARCHIVED",
                updatedAt: new Date("2026-08-31T12:01:00.000Z"),
              };
            }
            return { id: "country-ie", isActive: true, defaultLocale: "EN" };
          },
        },
        countryLocale: { findUnique: async () => null },
        $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      },
    },
  });
  service = await import("./recruitment.service.js");
});

beforeEach(() => {
  state.archiveDuringValidation = false;
  state.job = {
    id: "job-1",
    countryId: "country-ie",
    locale: "EN",
    slug: "general-practitioner",
    title: "General Practitioner",
    department: "Medical",
    location: "Ireland (Remote)",
    workplaceMode: "REMOTE",
    employmentType: "Contract",
    minimumExperience: null,
    descriptionHtml: "<p>Provide remote care.</p>",
    status: "PUBLISHED",
    publishedAt: new Date("2026-08-01T00:00:00.000Z"),
    closesAt: null,
    createdByUserId: "admin-1",
    updatedByUserId: "admin-1",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-31T12:00:00.000Z"),
  };
});

describe("job update concurrency", () => {
  it("rejects a stale partial edit instead of reversing a concurrent archive", async () => {
    state.archiveDuringValidation = true;

    await assert.rejects(
      () => service.updateAdminJob("job-1", { title: "Stale title" }, "admin-2"),
      service.RecruitmentConflictError,
    );

    assert.equal(state.job.status, "ARCHIVED");
    assert.equal(state.job.title, "General Practitioner");
  });
});
