/**
 * Doctors who have permanently left and must never be re-created or re-updated
 * by a datasheet import.
 *
 * The datasheets under `backend/scripts/data/` are kept intact on purpose —
 * they are the historical record of what was published, and deleting clinical
 * content to tidy a repo is the wrong trade. But the scripts that consume them
 * are re-runnable, so a departed doctor's full profile (bio, SEO copy, FAQs,
 * registration number) sits one accidental `--apply` away from being restored.
 *
 * This is the guard for exactly that, and nothing more. It is NOT a deletion
 * mechanism: it only makes an importer skip a slug before it reads or writes.
 * Removing a doctor from the live site is still the admin's job — this stops an
 * import from silently undoing it.
 *
 * dr-grainne-ahern — confirmed departed 2026-08-08 (owner). Already removed
 * from the roster, the sitemap and every internal link; her URLs answer 410
 * Gone (frontend/lib/seo/gone-content.ts). Re-importing her would contradict
 * all of that at once.
 */
export const RETIRED_DOCTOR_SLUGS: ReadonlySet<string> = new Set(["dr-grainne-ahern"]);

/** Case-insensitive; datasheet slugs are authored by hand. */
export function isRetiredDoctorSlug(slug: string): boolean {
  return RETIRED_DOCTOR_SLUGS.has(slug.trim().toLowerCase());
}
