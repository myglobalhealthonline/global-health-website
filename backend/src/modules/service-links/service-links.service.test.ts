import { mock, test } from "node:test";
import assert from "node:assert/strict";

test("public link callouts never fall back to the market default locale", async () => {
  const link = (id: string, locales: string[]) => ({
    id,
    type: "COMPLEMENTARY",
    anchorSlot: null,
    priority: 0,
    targetHref: null,
    target: { slug: id },
    translations: locales.map((locale) => ({ locale, heading: `${id}-${locale}`, body: null, ctaLabel: id })),
  });
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        serviceLink: {
          findMany: async () => [link("es-only", ["ES"]), link("both", ["ES", "EN"])],
        },
      },
    },
  });
  const { resolveServiceLinksForPage } = await import("./service-links.service.js");

  const en = await resolveServiceLinksForPage("svc", "EN");
  assert.deepEqual(en.map((l) => l.heading), ["both-EN"]);

  const es = await resolveServiceLinksForPage("svc", "ES");
  assert.deepEqual(es.map((l) => l.heading), ["es-only-ES", "both-ES"]);
});
