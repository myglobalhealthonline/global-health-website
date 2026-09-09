import assert from "node:assert/strict";
import { before, it, mock } from "node:test";
import { LocaleCode, PageKey } from "@prisma/client";

const countryQueries: unknown[] = [];

before(() => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        country: {
          findFirst: async (query: unknown) => {
            countryQueries.push(query);
            return { id: "country-ie", defaultLocale: LocaleCode.EN, isActive: true };
          },
        },
        pageContent: { findUnique: async () => null },
        contentPage: { findUnique: async () => null },
      },
    },
  });
});

it("both public content services resolve country codes case-insensitively", async () => {
  const { getPublicPageContent } = await import("./page-content.service.js");
  const { getPublicPage } = await import("../pages/pages.service.js");

  await getPublicPageContent("IE", PageKey.HOME, LocaleCode.EN);
  await getPublicPage("IE", PageKey.HOME, LocaleCode.EN);

  assert.deepEqual(
    countryQueries.map((query) => (query as { where: unknown }).where),
    [
      { code: { equals: "IE", mode: "insensitive" } },
      { code: { equals: "IE", mode: "insensitive" } },
    ],
  );
});
