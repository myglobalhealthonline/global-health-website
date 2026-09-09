import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import Fastify, { type FastifyInstance, type FastifyPluginAsync } from "fastify";

type CountryCodeFilter = string | { equals: string; mode: string } | undefined;

const storedCountry = { id: "country-ie", code: "ie", defaultLocale: "EN" };
const clinic = {
  id: "clinic-ie",
  countryId: storedCountry.id,
  name: "Dublin Clinic",
  slug: "dublin-clinic",
  city: "Dublin",
  active: true,
  country: { code: storedCountry.code, name: "Ireland" },
};

let app: FastifyInstance;
let clinicWhere: { active: boolean; country?: { code: CountryCodeFilter } } | undefined;
let policyWrites: Array<{ countryId: string; countryCode: string }> = [];
let publicContentCalls: string[] = [];

function matchesStoredCode(filter: CountryCodeFilter): boolean {
  if (typeof filter === "string") return filter === storedCountry.code;
  return filter?.mode === "insensitive" && filter.equals.toLowerCase() === storedCountry.code;
}

before(async () => {
  mock.module("../utils/admin-auth.js", {
    namedExports: { verifyAdminAccess: async () => ({ ok: true, method: "session" }) },
  });
  mock.module("../db/prisma.js", {
    namedExports: {
      prisma: {
        country: {
          findFirst: async ({ where }: { where: { code: CountryCodeFilter } }) =>
            matchesStoredCode(where.code) ? { id: storedCountry.id } : null,
          findUnique: async ({ where }: { where: { code: string } }) =>
            where.code === storedCountry.code ? storedCountry : null,
        },
        clinic: {
          count: async ({ where }: { where: typeof clinicWhere }) => {
            clinicWhere = where;
            return matchesStoredCode(where?.country?.code) ? 1 : 0;
          },
          findMany: async ({ where }: { where: typeof clinicWhere }) =>
            matchesStoredCode(where?.country?.code) ? [clinic] : [],
        },
        $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
      },
    },
  });
  mock.module("../modules/data-policy/country-data-policy.service.js", {
    namedExports: {
      getDataPolicy: async () => null,
      listDataPolicies: async () => [],
      upsertDataPolicy: async (input: { countryId: string; countryCode: string }) => {
        policyWrites.push(input);
      },
    },
  });
  mock.module("../modules/page-content/page-content.service.js", {
    namedExports: {
      getPublicPageContent: async (countryCode: string) => {
        publicContentCalls.push(countryCode);
        return {
          record: countryCode === storedCountry.code
            ? { body: "Published", resolvedLocale: "EN", mixedLocaleFields: [] }
            : null,
          disabled: false,
        };
      },
    },
  });

  app = Fastify();
  for (const path of [
    "./admin-clinics.route.js",
    "./admin-data-policy.route.js",
    "./page-content.route.js",
    "./pages.route.js",
  ]) {
    await app.register((await import(path)).default as unknown as FastifyPluginAsync);
  }
  await app.ready();
});

after(async () => app.close());
beforeEach(() => {
  clinicWhere = undefined;
  policyWrites = [];
  publicContentCalls = [];
});

describe("country-code route lookups", () => {
  it("lists lowercase-stored clinics for either input case", async () => {
    for (const code of ["ie", "IE"]) {
      const response = await app.inject({ url: `/api/admin/clinics?countryCode=${code}` });
      assert.equal(response.statusCode, 200);
      assert.equal(response.json().data.clinics[0].id, clinic.id);
    }
    assert.deepEqual(clinicWhere?.country?.code, {
      equals: "IE",
      mode: "insensitive",
    });
  });

  it("saves policies for either input case and rejects a missing country", async () => {
    const payload = {
      retentionYears: 10,
      storageRegion: "EU",
      requiresLocalStorage: false,
    };
    for (const code of ["ie", "IE"]) {
      const response = await app.inject({
        method: "PUT",
        url: `/api/admin/data-policy/${code}`,
        payload,
      });
      assert.equal(response.statusCode, 200);
    }
    assert.deepEqual(
      policyWrites.map(({ countryId, countryCode }) => ({ countryId, countryCode })),
      [
        { countryId: storedCountry.id, countryCode: "IE" },
        { countryId: storedCountry.id, countryCode: "IE" },
      ],
    );

    const missing = await app.inject({
      method: "PUT",
      url: "/api/admin/data-policy/XX",
      payload,
    });
    assert.equal(missing.statusCode, 404);
    assert.equal(policyWrites.length, 2);
  });

  it("normalizes uppercase public page codes at both route boundaries", async () => {
    for (const path of ["page-content", "pages"]) {
      const response = await app.inject({
        url: `/api/countries/IE/${path}/HOME`,
      });
      assert.equal(response.statusCode, 200);
    }
    assert.deepEqual(publicContentCalls, ["ie", "ie"]);
  });
});
