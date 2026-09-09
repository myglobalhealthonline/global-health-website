import { DateTime, IANAZone } from "luxon";
import { z } from "zod";

export const birthdaySettingsSchema = z.object({
  enabled: z.boolean(),
  discountPercent: z.number().int().min(1).max(100).nullable(),
  validityDays: z.number().int().min(1).max(365),
}).strict().refine((v) => !v.enabled || v.discountPercent !== null, {
  path: ["discountPercent"], message: "Set a discount before enabling birthday emails",
});

export type BirthdaySettings = z.infer<typeof birthdaySettingsSchema>;
export const DEFAULT_BIRTHDAY_SETTINGS: BirthdaySettings = {
  enabled: false, discountPercent: null, validityDays: 30,
};

export function birthdayTimezone(patientZone: string | null, countryZone: string | null): string | null {
  return [patientZone, countryZone].find((zone) => zone && IANAZone.isValidZone(zone)) ?? null;
}

/** DOB is a date-only value stored at UTC midnight; do not shift it into a timezone. */
export function birthdayWindow(dob: Date, now: Date, timezone: string, validityDays: number) {
  const local = DateTime.fromJSDate(now, { zone: timezone });
  const birth = DateTime.fromJSDate(dob, { zone: "UTC" });
  if (!local.isValid || !birth.isValid || birth.toISODate()! > local.toISODate()!) return null;
  const day = birth.month === 2 && birth.day === 29 && !local.isInLeapYear ? 28 : birth.day;
  if (local.month !== birth.month || local.day !== day || local.hour < 9) return null;
  return {
    year: local.year,
    validFrom: local.startOf("day").toJSDate(),
    validUntil: local.startOf("day").plus({ days: validityDays }).minus({ milliseconds: 1 }).toJSDate(),
  };
}
