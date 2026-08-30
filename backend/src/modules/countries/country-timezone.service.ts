import { prisma } from "../../db/prisma.js";
import { isValidTimeZone } from "../doctor-availability/timezone.js";

/**
 * The clinic timezone a COUNTRY runs on — its `BookingSetting.timezone`.
 *
 * This is the zone every public booking surface should display slots in: the
 * patient is booking care in that country, so "16:30" has to mean 16:30 there.
 *
 * Distinct from `resolveDoctorTimeZone`, which answers a different question —
 * the zone a doctor's availability windows were AUTHORED in (their primary
 * country). The two diverge for a doctor rostered into more than one country:
 * an Ireland-primary doctor taking Czech bookings generates slots on Irish
 * wall-clock windows, and showing those raw on the Czech booking page listed
 * every slot an hour early. The underlying UTC instants are the same either
 * way; only the zone they are rendered in changes.
 *
 * Falls back to UTC — never to a real clinic zone, which would be a silent
 * wrong answer rather than an obvious one.
 */
export async function resolveCountryTimeZone(
  countryCode: string | null | undefined,
): Promise<string> {
  const code = countryCode?.trim().toLowerCase();
  if (!code) return "UTC";
  try {
    const country = await prisma.country.findFirst({
      where: { code },
      select: { bookingSetting: { select: { timezone: true } } },
    });
    const tz = country?.bookingSetting?.timezone;
    return tz && isValidTimeZone(tz) ? tz : "UTC";
  } catch {
    return "UTC";
  }
}
