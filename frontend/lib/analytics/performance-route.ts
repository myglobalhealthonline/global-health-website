/** Public templates only. Never record content IDs, personal paths or queries. */
export function performanceRoute(pathname: string): string | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const localized = path.match(/^\/(ireland|czechia|portugal|spain|romania|brazil)\/(en|cs|pt|es|ro|de)(\/.*)?$/);
  const prefix = localized ? `/${localized[1]}/${localized[2]}` : "";
  const tail = localized ? localized[3] || "/" : path;
  if (/^\/(|about|faq|contact|privacy|terms|blog|doctors|lab-tests|pricing|book|gp-consultation-online|see-a-specialist|repeat-prescription-request)$/.test(tail)) {
    return prefix + (tail === "/" ? "/" : tail);
  }
  const detail = tail.match(/^\/(blog|doctors|services|health|tools|lab-tests|legal)\/[^/]+$/);
  return detail ? `${prefix}/${detail[1]}/:slug` : null;
}
