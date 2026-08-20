import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const localesRoot = path.resolve(process.cwd(), "locales");
const baseLocale = "en";
const placeholderPattern = /\{([A-Za-z0-9_]+)\}/g;
const ignoredNamespaceKeys = {
  "account.json": new Set(["portal.adminPortal", "portal.userPortal", "portal.rootBreadcrumb"]),
  "subscription.json": new Set([
    "pricing.trust_card1_title",
    "pricing.trust_card1_subtitle",
    "pricing.trust_card2_title",
    "pricing.trust_card2_subtitle",
    "pricing.trust_card3_title",
    "pricing.trust_card3_subtitle",
  ]),
};

/** Namespaces where a locale legitimately carries only PART of the base key set.
 *
 *  `faq-markets.json` is market-scoped, not locale-mirrored: each locale holds
 *  FAQ copy only for the markets that actually speak it (cs -> cz, es -> es,
 *  pt -> br + pt, ro -> ro, de -> none yet). lib/content/country-faq.ts is built
 *  around exactly that: `MarketFaqDoc` is a Partial, `getMarketFaq` falls back
 *  and reports `exact: false` so a non-native rendering can be noindexed, and
 *  `marketFaqLocales` drives hreflang and the sitemap off the locales that
 *  genuinely have copy. Demanding parity with English here would mean
 *  translating the Irish market FAQ into Czech purely to satisfy this script,
 *  which is the precise outcome that module exists to prevent: an English
 *  answer under a translated heading, emitted as FAQPage schema on a YMYL
 *  medical page.
 *
 *  Only the missing-key rule is relaxed. Extra keys still fail (a market key
 *  English does not have is a typo), and so do placeholder mismatches on the
 *  keys a locale does carry. */
const partialNamespaces = new Set(["faq-markets.json"]);

function flattenJson(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.reduce(
      (acc, item, index) => ({ ...acc, ...flattenJson(item, prefix ? `${prefix}.${index}` : String(index)) }),
      {},
    );
  }
  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, child]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      return { ...acc, ...flattenJson(child, nextPrefix) };
    }, {});
  }
  return { [prefix]: value };
}

function sortedPlaceholders(value) {
  if (typeof value !== "string") return [];
  return Array.from(value.matchAll(placeholderPattern), (match) => match[1]).sort();
}

function diffSet(actual, expected) {
  return actual.filter((item) => !expected.includes(item));
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  const localeEntries = await readdir(localesRoot, { withFileTypes: true });
  const localeDirs = localeEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (!localeDirs.includes(baseLocale)) {
    throw new Error(`Base locale '${baseLocale}' is missing under ${localesRoot}`);
  }

  const baseDir = path.join(localesRoot, baseLocale);
  const baseNamespaces = (await readdir(baseDir))
    .filter((name) => name.endsWith(".json"))
    .sort();

  const failures = [];

  for (const locale of localeDirs.filter((entry) => entry !== baseLocale)) {
    const localeDir = path.join(localesRoot, locale);
    const localeNamespaces = (await readdir(localeDir))
      .filter((name) => name.endsWith(".json"))
      .sort();

    const extraNamespaces = diffSet(localeNamespaces, baseNamespaces);
    const missingNamespaces = diffSet(baseNamespaces, localeNamespaces);

    for (const namespace of missingNamespaces) {
      failures.push(`${locale}/${namespace}: missing namespace file`);
    }
    for (const namespace of extraNamespaces) {
      failures.push(`${locale}/${namespace}: extra namespace file`);
    }

    for (const namespace of baseNamespaces.filter((name) => localeNamespaces.includes(name))) {
      const [baseJson, localeJson] = await Promise.all([
        readJson(path.join(baseDir, namespace)),
        readJson(path.join(localeDir, namespace)),
      ]);
      const baseFlat = flattenJson(baseJson);
      const localeFlat = flattenJson(localeJson);
      const ignoredKeys = ignoredNamespaceKeys[namespace] ?? new Set();
      const baseKeys = Object.keys(baseFlat).filter((key) => !ignoredKeys.has(key)).sort();
      const localeKeys = Object.keys(localeFlat).filter((key) => !ignoredKeys.has(key)).sort();

      if (!partialNamespaces.has(namespace)) {
        for (const key of diffSet(baseKeys, localeKeys)) {
          failures.push(`${locale}/${namespace}:${key}: missing key`);
        }
      }
      for (const key of diffSet(localeKeys, baseKeys)) {
        failures.push(`${locale}/${namespace}:${key}: extra key`);
      }

      for (const key of baseKeys.filter((entry) => localeKeys.includes(entry))) {
        const basePlaceholders = sortedPlaceholders(baseFlat[key]);
        const localePlaceholders = sortedPlaceholders(localeFlat[key]);
        if (basePlaceholders.join("|") !== localePlaceholders.join("|")) {
          failures.push(
            `${locale}/${namespace}:${key}: placeholder mismatch (base=${basePlaceholders.join(",") || "none"} locale=${localePlaceholders.join(",") || "none"})`,
          );
        }
      }
    }
  }

  if (failures.length > 0) {
    console.error("Locale key check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Locale key check passed for ${localeDirs.length} locales across ${baseNamespaces.length} namespaces.`);
}

await main();
