import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

const state: {
  events: string[];
  transactionCalls: number;
  applicationData: Record<string, unknown> | null;
  outboxData: Record<string, unknown> | null;
  auditData: Record<string, unknown> | null;
  listWhere: Record<string, unknown> | null;
  adminGroupTake: number | null;
  adminListSelect: Record<string, unknown> | null;
  publicJobs: Array<Record<string, unknown>>;
  publicCountry: { id: string; isActive: boolean; defaultLocale: string } | null;
} = {
  events: [],
  transactionCalls: 0,
  applicationData: null,
  outboxData: null,
  auditData: null,
  listWhere: null,
  adminGroupTake: null,
  adminListSelect: null,
  publicJobs: [],
  publicCountry: { id: "country-cz", isActive: true, defaultLocale: "CS" },
};

const tx = {
  jobListing: {
    findFirst: async () => {
      state.events.push("job-open-recheck");
      return { id: "job-1", locale: "CS" };
    },
  },
  jobApplication: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      state.events.push("application-create");
      state.applicationData = data;
      return { id: "application-1" };
    },
  },
  outbox: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      state.events.push("outbox-create");
      state.outboxData = data;
      return { id: "outbox-1" };
    },
  },
  auditLog: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      state.events.push("audit-create");
      state.auditData = data;
      return { id: "audit-1" };
    },
  },
};

let service: typeof import("./recruitment.service.js");

before(async () => {
  mock.module("../../config/env.js", {
    namedExports: {
      env: {
        CLAMAV_HOST: "clamav",
        RECRUITMENT_PRIVACY_NOTICE_VERSION: "recruitment-privacy-v1",
        RECRUITMENT_RETENTION_MONTHS: 6,
      },
    },
  });
  mock.module("../../services/object-storage.js", {
    namedExports: { isMediaStorageConfigured: () => true },
  });
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        country: {
          findUnique: async () => state.publicCountry,
        },
        jobListing: {
          findUnique: async () => ({ countryId: "country-cz", slug: "doctor" }),
          groupBy: async ({ where, skip = 0, take }: {
            where?: Record<string, unknown>;
            skip?: number;
            take?: number;
          }) => {
            state.adminGroupTake = take ?? null;
            const groups = new Map<string, { countryId: string; slug: string; _max: { updatedAt: Date } }>();
            for (const job of state.publicJobs
              .filter((row) => !where?.locale || row.locale === where.locale)
              .filter((row) => !where?.status || row.status === where.status)) {
              const key = `${job.countryId}:${job.slug}`;
              if (!groups.has(key)) groups.set(key, {
                countryId: String(job.countryId),
                slug: String(job.slug),
                _max: { updatedAt: job.updatedAt as Date },
              });
            }
            const rows = [...groups.values()];
            return take === undefined ? rows.slice(skip) : rows.slice(skip, skip + take);
          },
          findMany: async ({ where, take, select }: {
            where?: Record<string, unknown>;
            take?: number;
            select?: Record<string, unknown>;
          }) => {
            if (where?.OR) state.adminListSelect = select ?? null;
            const slug = where?.slug;
            const excluded = typeof slug === "object" && slug !== null && "notIn" in slug
              ? (slug as { notIn: string[] }).notIn
              : [];
            const jobs = state.publicJobs
              .filter((job) => !where?.locale || job.locale === where.locale)
              .filter((job) => typeof slug !== "string" || job.slug === slug)
              .filter((job) => !excluded.includes(String(job.slug)));
            return take === undefined ? jobs : jobs.slice(0, take);
          },
        },
        $queryRaw: async () => [{ total: 1, draft: 0, published: 1, archived: 0 }],
        jobApplication: {
          count: async () => 0,
          findMany: async ({ where }: { where: Record<string, unknown> }) => {
            state.listWhere = where;
            return [];
          },
        },
        $transaction: async (
          input: Promise<unknown>[] | ((client: typeof tx) => Promise<unknown>),
        ) => {
          state.transactionCalls++;
          return Array.isArray(input) ? Promise.all(input) : input(tx);
        },
      },
    },
  });
  service = await import("./recruitment.service.js");
});

beforeEach(() => {
  state.events = [];
  state.transactionCalls = 0;
  state.applicationData = null;
  state.outboxData = null;
  state.auditData = null;
  state.listWhere = null;
  state.adminGroupTake = null;
  state.adminListSelect = null;
  state.publicJobs = [];
  state.publicCountry = { id: "country-cz", isActive: true, defaultLocale: "CS" };
});

function publicJob(slug: string, locale: string, title: string) {
  return {
    id: `${slug}-${locale}`,
    slug,
    locale,
    title,
    department: "Medical",
    location: "Remote",
    workplaceMode: "REMOTE",
    employmentType: "Contract",
    minimumExperience: null,
    descriptionHtml: `<p>${title}</p>`,
    publishedAt: new Date("2026-08-31T00:00:00.000Z"),
    closesAt: null,
    updatedAt: new Date("2026-08-31T00:00:00.000Z"),
    countryId: "country-cz",
    status: "PUBLISHED",
    country: { id: "country-cz", code: "cz", name: "Czechia", slug: "czechia", defaultLocale: "CS" },
    _count: { applications: 0 },
  };
}

describe("public recruitment locale fallback", () => {
  it("prefers the requested locale and deduplicates listings that share a slug", async () => {
    state.publicJobs = [
      publicJob("doctor", "CS", "Praktický lékař"),
      publicJob("doctor", "EN", "General practitioner"),
      publicJob("nurse", "CS", "Sestra"),
    ];

    const jobs = await service.listPublicJobs("CZ", "EN" as never);

    assert.deepEqual(jobs.map((job) => [job.slug, job.locale, job.title]), [
      ["doctor", "EN", "General practitioner"],
      ["nurse", "CS", "Sestra"],
    ]);
  });

  it("falls back to the country's default locale for a detail page", async () => {
    state.publicJobs = [
      publicJob("doctor", "DE", "Hausarzt"),
      publicJob("doctor", "CS", "Praktický lékař"),
    ];

    const job = await service.getPublicJob("doctor", "CZ", "EN" as never);

    assert.equal(job?.locale, "CS");
    assert.equal(job?.title, "Praktický lékař");
  });

  it("uses a deterministic tertiary locale when requested and default content are absent", async () => {
    state.publicJobs = [
      publicJob("doctor", "PT", "Médico"),
      publicJob("doctor", "DE", "Hausarzt"),
    ];

    const job = await service.getPublicJob("doctor", "CZ", "EN" as never);

    assert.equal(job?.locale, "DE");
  });

  it("applies the 200-role cap after locale deduplication", async () => {
    state.publicJobs = Array.from({ length: 205 }, (_, index) =>
      ["CS", "PT", "ES", "RO", "DE", "EN"].map((jobLocale) =>
        publicJob(`doctor-${index}`, jobLocale, `${jobLocale} Doctor ${index}`),
      )).flat();

    const jobs = await service.listPublicJobs("CZ", "EN" as never);

    assert.equal(jobs.length, 200);
    assert.equal(new Set(jobs.map((job) => job.slug)).size, 200);
    assert.ok(jobs.every((job) => job.locale === "EN"));
  });

  it("returns no public jobs for an inactive or unknown country", async () => {
    state.publicCountry = null;
    state.publicJobs = [publicJob("doctor", "CS", "Praktický lékař")];

    assert.deepEqual(await service.listPublicJobs("CZ", "CS" as never), []);
    assert.equal(await service.getPublicJob("doctor", "CZ", "CS" as never), null);
  });
});

describe("admin recruitment groups", () => {
  it("lists one canonical job per slug and aggregates localized applications", async () => {
    state.publicJobs = [
      { ...publicJob("doctor", "CS", "Praktický lékař"), _count: { applications: 2 } },
      { ...publicJob("doctor", "EN", "Doctor"), _count: { applications: 3 } },
    ];

    const result = await service.listAdminJobs({ page: 1, pageSize: 25 });

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.locale, "CS");
    assert.equal(result.items[0]?._count.applications, 5);
    assert.equal(result.pagination.total, 1);
    assert.deepEqual(result.summary, { draft: 0, published: 1, archived: 0 });
    assert.equal(state.adminGroupTake, 25);
    assert.equal(Object.hasOwn(state.adminListSelect ?? {}, "descriptionHtml"), false);
  });

  it("keeps the full grouped application total when filtering to one locale", async () => {
    state.publicJobs = [
      { ...publicJob("doctor", "CS", "Praktický lékař"), _count: { applications: 2 } },
      { ...publicJob("doctor", "EN", "Doctor"), _count: { applications: 3 } },
    ];

    const result = await service.listAdminJobs({ locale: "EN" as never, page: 1, pageSize: 25 });

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.locale, "EN");
    assert.equal(result.items[0]?._count.applications, 5);
  });
});

describe("recruitment application transaction", () => {
  it("atomically creates the application, PII-free outbox row, and receipt audit", async () => {
    const submittedAt = new Date("2026-08-31T12:00:00.000Z");
    await service.createApplicationAfterUpload({
      jobId: "job-1",
      fields: {
        fullName: "Jane Candidate",
        email: "jane@example.com",
        phone: "+353 1 234 5678",
        message: "Private candidate message",
        privacyAcknowledged: "true",
        privacyNoticeLocale: "EN",
        website: "",
      },
      cvStorageKey: "recruitment/cv/random.pdf",
      cvByteSize: 1024,
      now: submittedAt,
    });

    assert.equal(state.transactionCalls, 1);
    assert.deepEqual(state.events, [
      "job-open-recheck",
      "application-create",
      "outbox-create",
      "audit-create",
    ]);
    assert.equal(state.applicationData?.fullName, "Jane Candidate");
    assert.deepEqual(state.outboxData?.payload, { applicationId: "application-1" });
    assert.deepEqual(state.auditData?.metadata, {
      jobListingId: "job-1",
      jobLocale: "CS",
      privacyNoticeLocale: "EN",
    });
    const durableSideEffects = JSON.stringify({ outbox: state.outboxData, audit: state.auditData });
    for (const forbidden of [
      "Jane Candidate",
      "jane@example.com",
      "+353 1 234 5678",
      "Private candidate message",
      "random.pdf",
    ]) {
      assert.equal(durableSideEffects.includes(forbidden), false, `must exclude ${forbidden}`);
    }
  });

  it("uses an exclusive next-day upper boundary for date-only submittedTo filters", async () => {
    await service.listAdminApplications({
      submittedTo: new Date("2026-09-01T00:00:00.000Z"),
      page: 1,
      pageSize: 25,
    });
    assert.deepEqual(state.listWhere?.submittedAt, {
      lt: new Date("2026-09-01T00:00:00.000Z"),
    });
  });

  it("filters applications by every locale sibling of the selected job", async () => {
    await service.listAdminApplications({ jobId: "job-cs", page: 1, pageSize: 25 });

    assert.deepEqual(state.listWhere?.jobListing, {
      countryId: "country-cz",
      slug: "doctor",
    });
    assert.equal(Object.hasOwn(state.listWhere ?? {}, "jobListingId"), false);
  });
});
