import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { getRequestContext } from "@/lib/routing/get-request-context";

export const runtimeRoutingCases = [
  { path: "/home", expectedCountry: "ie" },
  { path: "/home-pt", expectedCountry: "pt" },
  { path: "/home-sp", expectedCountry: "sp" },
  { path: "/home-cz", expectedCountry: "cz" },
  { path: "/home-rm", expectedCountry: "rm" },
  { path: "/unknown-path", expectedCountry: "ie" },
] as const;

export const runtimeLocaleCases = [
  { explicit: "pt", cookie: null, accept: null, expectedLocale: "pt" },
  { explicit: null, cookie: "ro", accept: null, expectedLocale: "ro" },
  { explicit: "xx", cookie: null, accept: "es-ES,es;q=0.9", expectedLocale: "es" },
  { explicit: null, cookie: null, accept: "fr-FR,fr;q=0.9", expectedLocale: "en" },
] as const;

/** Lightweight runtime validation utility (no test runner required). */
export function validateRuntimeAdapters() {
  const countryChecks = runtimeRoutingCases.map((testCase) => {
    const resolved = getRequestContext({ pathname: testCase.path });
    return {
      ...testCase,
      actualCountry: resolved.countryCode,
      pass: resolved.countryCode === testCase.expectedCountry,
    };
  });

  const localeChecks = runtimeLocaleCases.map((testCase) => {
    const resolved = resolveLocale({
      explicitLocale: testCase.explicit,
      cookieLocale: testCase.cookie,
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
