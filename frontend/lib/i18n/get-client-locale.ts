import { resolveLocale } from "./resolve-locale";
import type { LocaleCode } from "./types";

export function readClientLocale(): LocaleCode {
  try {
    const match = document.cookie.match(/(?:^|;\s*)gh_locale=([^;]+)/);
    const raw = match ? decodeURIComponent(match[1]) : "";
    return resolveLocale({ cookieLocale: raw });
  } catch {
    return "en";
  }
}
