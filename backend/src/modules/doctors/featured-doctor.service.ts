import { getSetting, upsertSetting, deleteSetting } from "../settings/settings.service.js";

/**
 * "Featured doctor" per country — the one promoted into the FeaturedDoctor
 * spotlight at the top of the public /doctors page.
 *
 * Stored in the generic Setting key/value table (no Doctor schema column)
 * keyed `featured_doctor:<countryCode>` → `{ doctorId }`. One featured
 * doctor per country: writing a new id replaces the previous one, so the
 * admin "Feature this doctor" toggle behaves like a radio across the
 * country's roster.
 */
type FeaturedDoctorValue = { doctorId: string };

function key(countryCode: string): string {
  return `featured_doctor:${countryCode.trim().toLowerCase()}`;
}

export async function getFeaturedDoctorId(
  countryCode: string,
): Promise<string | null> {
  const value = await getSetting<FeaturedDoctorValue>(key(countryCode));
  return value?.doctorId ?? null;
}

/**
 * Set (or clear, when `doctorId` is null) the featured doctor for a
 * country. Idempotent — re-setting the same id is a no-op write.
 */
export async function setFeaturedDoctor(
  countryCode: string,
  doctorId: string | null,
): Promise<void> {
  if (doctorId === null) {
    await deleteSetting(key(countryCode));
    return;
  }
  await upsertSetting(key(countryCode), { doctorId } satisfies FeaturedDoctorValue);
}

/**
 * Bulk lookup: returns the featured doctor id for each requested country
 * code (null when none set). Used by the public list mapper to flag the
 * featured row without N reads when several countries are in play.
 */
export async function getFeaturedDoctorIds(
  countryCodes: string[],
): Promise<Record<string, string | null>> {
  const entries = await Promise.all(
    countryCodes.map(
      async (code) => [code.toLowerCase(), await getFeaturedDoctorId(code)] as const,
    ),
  );
  return Object.fromEntries(entries);
}
