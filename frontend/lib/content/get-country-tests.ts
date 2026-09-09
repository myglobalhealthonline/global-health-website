import "server-only";
import {
  fetchTestDetail,
  fetchTestsByCountry,
  type PublicTestCard,
  type PublicTestDetail,
} from "@/lib/api/site-content-api";

/**
 * Server-side readers for the public "Book a Test" catalogue.
 *
 * Thin on purpose. The publication gate — exam active AND bookable AND carried
 * by an active centre in a live market — lives in the backend service so all
 * three endpoints agree; re-filtering here would let the two drift, and a page
 * that hides what the availability endpoint still serves is worse than either.
 */

export async function getCountryBookableTests(
  countryCode: string,
  locale?: string,
): Promise<PublicTestCard[]> {
  const result = await fetchTestsByCountry(countryCode, locale);
  if (!result.ok) return [];
  return result.data?.tests ?? [];
}

/** Null when the exam does not exist here, or is not published. */
export async function getBookableTestBySlug(
  countryCode: string,
  slug: string,
  locale?: string,
): Promise<PublicTestDetail | null> {
  const result = await fetchTestDetail(countryCode, slug, locale);
  if (!result.ok) return null;
  return result.data?.test ?? null;
}
