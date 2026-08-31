import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

type Row = Record<string, unknown> & {
  id: string;
  countryId: string;
  locale: "CS" | "EN";
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: Date | null;
  updatedAt: Date;
};

const state: {
  rows: Row[];
  sanitized: string[];
  transactionCalls: number;
  archiveBeforeUpdate: boolean;
  enabledLocales: Array<"CS" | "EN">;
} = { rows: [], sanitized: [], transactionCalls: 0, archiveBeforeUpdate: false, enabledLocales: ["CS", "EN"] };

const decorate = (row: Row) => ({
  ...row,
  country: { id: "country-cz", code: "cz", name: "Czechia", slug: "czechia" },
  _count: { applications: 0 },
});

const tx = {
  jobListing: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row = {
        ...data,
        id: `job-${String(data.locale).toLowerCase()}`,
        updatedAt: new Date("2026-08-31T12:00:00.000Z"),
      } as Row;
      state.rows.push(row);
      return decorate(row);
    },
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      if (state.archiveBeforeUpdate) {
        const concurrentIndex = state.rows.findIndex((row) => row.id === where.id);
        if (concurrentIndex !== -1) {
          state.rows[concurrentIndex] = {
            ...state.rows[concurrentIndex],
            status: "ARCHIVED",
            updatedAt: new Date("2026-08-31T12:01:00.000Z"),
          } as Row;
        }
        state.archiveBeforeUpdate = false;
      }
      const index = state.rows.findIndex((row) =>
        row.id === where.id && row.status === where.status && row.updatedAt === where.updatedAt,
      );
      if (index === -1) return { count: 0 };
      state.rows[index] = { ...state.rows[index], ...data } as Row;
      return { count: 1 };
    },
    findMany: async () => state.rows.map(decorate),
  },
};

let service: typeof import("./recruitment.service.js");

before(async () => {
  mock.module("../../config/env.js", { namedExports: { env: { CLAMAV_HOST: "clamav" } } });
  mock.module("../../services/object-storage.js", {
    namedExports: { isMediaStorageConfigured: () => true },
  });
  mock.module("../../utils/sanitize-html.js", {
    namedExports: {
      sanitizeCareerHtml: (html: string) => {
        state.sanitized.push(html);
        return html.replace(/<script>.*?<\/script>/g, "");
      },
    },
  });
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        country: {
          findUnique: async () => ({
            id: "country-cz",
            isActive: true,
            defaultLocale: "CS",
            countryLocales: state.enabledLocales.map((locale) => ({ locale })),
          }),
        },
        jobListing: {
          findUnique: async ({ where }: { where: { id: string } }) =>
            state.rows.find(({ id }) => id === where.id) ?? null,
          findMany: async () => state.rows,
        },
        $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => {
          state.transactionCalls++;
          return callback(tx);
        },
      },
    },
  });
  service = await import("./recruitment.service.js");
});

beforeEach(() => {
  state.rows = [];
  state.sanitized = [];
  state.transactionCalls = 0;
  state.archiveBeforeUpdate = false;
  state.enabledLocales = ["CS", "EN"];
});

const localization = (locale: "CS" | "EN", title: string) => ({
  locale,
  title,
  department: "Medical",
  location: "Remote",
  employmentType: "Contract",
  minimumExperience: null,
  descriptionHtml: `<p>${title}</p><script>bad</script>`,
});

describe("localized admin job groups", () => {
  it("creates every locale atomically and sanitizes every description", async () => {
    const result = await service.createAdminJobGroup({
      countryId: "country-cz",
      slug: "doctor",
      workplaceMode: "REMOTE",
      status: "DRAFT",
      closesAt: null,
      localizations: [localization("CS", "Praktický lékař"), localization("EN", "Doctor")],
    }, "admin-1");

    assert.equal(state.transactionCalls, 1);
    assert.equal(state.rows.length, 2);
    assert.equal(state.sanitized.length, 2);
    assert.equal(state.rows.every((row) => !String(row.descriptionHtml).includes("script")), true);
    assert.equal(result.locale, "CS");
    assert.deepEqual(result.localizations.map(({ locale }) => locale), ["CS", "EN"]);
  });

  it("archives every locale sibling from a status-only patch", async () => {
    const updatedAt = new Date("2026-08-31T12:00:00.000Z");
    state.rows = ["CS", "EN"].map((locale) => ({
      id: `job-${locale.toLowerCase()}`,
      countryId: "country-cz",
      locale,
      slug: "doctor",
      title: locale === "CS" ? "Praktický lékař" : "Doctor",
      department: "Medical",
      location: "Remote",
      workplaceMode: "REMOTE",
      employmentType: "Contract",
      minimumExperience: null,
      descriptionHtml: "<p>Role</p>",
      status: "PUBLISHED",
      publishedAt: new Date("2026-08-01T00:00:00.000Z"),
      closesAt: null,
      createdByUserId: "admin-1",
      updatedByUserId: "admin-1",
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt,
    } as Row));

    await service.updateAdminJobGroup("job-cs", { status: "ARCHIVED" }, "admin-1");

    assert.equal(state.transactionCalls, 1);
    assert.equal(state.rows.every(({ status }) => status === "ARCHIVED"), true);
  });

  it("updates existing content and adds a sanitized translation in one transaction", async () => {
    state.rows = [{
      id: "job-cs",
      countryId: "country-cz",
      locale: "CS",
      slug: "doctor",
      title: "Starý titul",
      department: "Medical",
      location: "Remote",
      workplaceMode: "REMOTE",
      employmentType: "Contract",
      minimumExperience: null,
      descriptionHtml: "<p>Old role</p>",
      status: "DRAFT",
      publishedAt: null,
      closesAt: null,
      createdByUserId: "admin-1",
      updatedByUserId: "admin-1",
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt: new Date("2026-08-31T12:00:00.000Z"),
    } as Row];

    const result = await service.updateAdminJobGroup("job-cs", {
      countryId: "country-cz",
      slug: "doctor",
      workplaceMode: "REMOTE",
      status: "DRAFT",
      closesAt: null,
      localizations: [localization("CS", "Praktický lékař"), localization("EN", "Doctor")],
    }, "admin-2");

    assert.equal(state.transactionCalls, 1);
    assert.equal(state.rows.length, 2);
    assert.equal(state.rows.find(({ locale }) => locale === "CS")?.title, "Praktický lékař");
    assert.equal(state.rows.find(({ locale }) => locale === "EN")?.title, "Doctor");
    assert.equal(state.rows.every((row) => !String(row.descriptionHtml).includes("script")), true);
    assert.equal(result?.previousStatus, "DRAFT");
    assert.deepEqual(result?.job.localizations.map(({ locale }) => locale), ["CS", "EN"]);
  });

  it("rejects a stale grouped edit instead of reversing a concurrent archive", async () => {
    state.rows = [{
      id: "job-cs",
      countryId: "country-cz",
      locale: "CS",
      slug: "doctor",
      title: "Praktický lékař",
      department: "Medical",
      location: "Remote",
      workplaceMode: "REMOTE",
      employmentType: "Contract",
      minimumExperience: null,
      descriptionHtml: "<p>Role</p>",
      status: "DRAFT",
      publishedAt: null,
      closesAt: null,
      createdByUserId: "admin-1",
      updatedByUserId: "admin-1",
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt: new Date("2026-08-31T12:00:00.000Z"),
    } as Row];
    state.archiveBeforeUpdate = true;

    await assert.rejects(
      () => service.updateAdminJobGroup("job-cs", {
        status: "DRAFT",
        localizations: [localization("CS", "Stale title")],
      }, "admin-2"),
      service.RecruitmentConflictError,
    );

    assert.equal(state.rows[0]?.status, "ARCHIVED");
    assert.equal(state.rows[0]?.title, "Praktický lékař");
  });

  it("keeps an existing translation editable after that locale is disabled for new content", async () => {
    const updatedAt = new Date("2026-08-31T12:00:00.000Z");
    state.rows = ["CS", "EN"].map((locale) => ({
      id: `job-${locale.toLowerCase()}`,
      countryId: "country-cz",
      locale,
      slug: "doctor",
      title: locale === "CS" ? "Praktický lékař" : "Doctor",
      department: "Medical",
      location: "Remote",
      workplaceMode: "REMOTE",
      employmentType: "Contract",
      minimumExperience: null,
      descriptionHtml: "<p>Role</p>",
      status: "DRAFT",
      publishedAt: null,
      closesAt: null,
      createdByUserId: "admin-1",
      updatedByUserId: "admin-1",
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt,
    } as Row));
    state.enabledLocales = ["CS"];

    const result = await service.updateAdminJobGroup("job-cs", {
      status: "DRAFT",
      localizations: [localization("CS", "Praktický lékař"), localization("EN", "Updated doctor")],
    }, "admin-2");

    assert.equal(result?.job.localizations.length, 2);
    assert.equal(state.rows.find(({ locale }) => locale === "EN")?.title, "Updated doctor");
  });
});
