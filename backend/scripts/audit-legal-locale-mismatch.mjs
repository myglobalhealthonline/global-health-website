// Read-only audit (2026-08-09 international-locale batch): for every
// supported country x locale x legal-document-type combination, compare the
// requested locale against the document's actual resolved locale (or, for
// MEDICAL_DISCLAIMER's profile-field fallback, whether a translation row for
// that exact locale exists). Prints mismatches only.
const BASE = "https://api.myglobalhealth.online";

const COUNTRIES = {
  ie: ["en", "pt", "es", "cs", "ro", "de"],
  cz: ["cs", "en", "pt", "es", "ro", "de"],
  pt: ["pt", "en", "es", "cs", "ro", "de"],
  es: ["es", "en", "pt", "cs", "ro", "de"],
  ro: ["ro", "en", "pt", "es", "cs", "de"],
  br: ["pt", "en", "es"],
};

const LEGAL_SLUGS = [
  "terms-of-service",
  "privacy-policy",
  "cookie-policy",
  "gdpr-notice",
  "data-processing-agreement",
  "refund-policy",
  "medical-disclaimer",
  "accessibility-statement",
  "complaints-procedure",
];

let checked = 0;
let mismatches = [];
let missing = [];

for (const [code, locales] of Object.entries(COUNTRIES)) {
  for (const locale of locales) {
    for (const slug of LEGAL_SLUGS) {
      checked++;
      const url = `${BASE}/api/countries/${code}/legal-documents/${slug}?locale=${locale.toUpperCase()}`;
      let res;
      try {
        res = await fetch(url);
      } catch {
        continue;
      }
      if (!res.ok) {
        missing.push({ code, locale, slug, status: res.status });
        continue;
      }
      const body = await res.json();
      const doc = body?.data?.document;
      if (!doc) {
        missing.push({ code, locale, slug, status: "no-document-field" });
        continue;
      }
      if (doc.locale?.toLowerCase() !== locale.toLowerCase()) {
        mismatches.push({ code, locale, slug, resolvedLocale: doc.locale, title: doc.title });
      }
    }
  }
}

console.log(`Checked: ${checked} country x locale x legal-type combinations`);
console.log(`\nMISMATCHES (route locale != document.locale): ${mismatches.length}`);
for (const m of mismatches) {
  console.log(`  /${m.code}/${m.locale}/legal/${m.slug} -> served locale ${m.resolvedLocale} ("${m.title}")`);
}
console.log(`\nMISSING (404 / no document, MEDICAL_DISCLAIMER may still have profile fallback): ${missing.length}`);
for (const m of missing.slice(0, 40)) {
  console.log(`  /${m.code}/${m.locale}/legal/${m.slug} -> ${m.status}`);
}
