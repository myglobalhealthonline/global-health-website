import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { resolveCountry } from "@/lib/routing/resolve-country";

export const runtimeRoutingCases = [
  { path: "/home", expectedCountry: "ie" },
  { path: "/home-pt", expectedCountry: "pt" },
  { path: "/home-sp", expectedCountry: "sp" },
  { path: "/home-cz", expectedCountry: "cz" },
  { path: "/home-rm", expectedCountry: "rm" },
  { path: "/unknown-path", expectedCountry: "ie" },
] as const;

export const runtimeLocaleCases = [
  { explicit: "pt", accept: null, expectedLocale: "pt" },
  { explicit: "xx", accept: "es-ES,es;q=0.9", expectedLocale: "es" },
  { explicit: null, accept: "fr-FR,fr;q=0.9", expectedLocale: "en" },
  { explicit: null, accept: null, expectedLocale: "en" },
] as const;

/** Lightweight runtime validation utility (no test runner required). */
export function validateRuntimeAdapters() {
  const countryChecks = runtimeRoutingCases.map((testCase) => {
    const resolved = resolveCountry({ pathname: testCase.path });
    return {
      ...testCase,
      actualCountry: resolved.country.code,
      pass: resolved.country.code === testCase.expectedCountry,
    };
  });

  const localeChecks = runtimeLocaleCases.map((testCase) => {
    const resolved = resolveLocale({
      explicitLocale: testCase.explicit,
      acceptLanguageHeader: testCase.accept,
      countryDefaultLocale: "en",
    });

    return {
      ...testCase,
      actualLocale: resolved,
      pass: resolved === testCase.expectedLocale,
    };
  });

  return {
    countryChecks,
    localeChecks,
    pass:
      countryChecks.every((item) => item.pass) &&
      localeChecks.every((item) => item.pass),
  };
}
