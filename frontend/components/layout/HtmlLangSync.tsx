"use client";

import { useEffect } from "react";

/**
 * Corrects `document.documentElement.lang` for `/{country}/{lang}/…` routes.
 *
 * The root layout ships a static "en" default (P-001 — see
 * `getRootHtmlLang()`) so it never needs `cookies()`/`headers()`. This
 * component is rendered from `[country]/[lang]/layout.tsx`, which DOES
 * receive `lang` as a real route param, and writes it onto the existing
 * `<html>` element after mount — a single attribute write, no reflow, no
 * flash of unstyled content, no dynamic API.
 */
export function HtmlLangSync({ lang }: { lang: string }) {
  useEffect(() => {
    if (document.documentElement.lang !== lang) {
      document.documentElement.lang = lang;
    }
  }, [lang]);
  return null;
}
