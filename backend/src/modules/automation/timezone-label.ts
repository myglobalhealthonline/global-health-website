/**
 * Human-readable timezone labels for notifications.
 *
 * Patients do not know what "GMT+1" or "CET" means, so notification times are
 * labelled with the country the timezone belongs to ("14:00 (Portugal)").
 *
 * Countries that span several timezones are deliberately absent from the map
 * below: "United States" would not identify a time, so those zones fall back to
 * the city carried by the IANA identifier ("14:00 (New York)").
 */

const COUNTRY_BY_TIMEZONE: Record<string, string> = {
  // Europe
  "Europe/Amsterdam": "NL",
  "Europe/Andorra": "AD",
  "Europe/Athens": "GR",
  "Europe/Belgrade": "RS",
  "Europe/Berlin": "DE",
  "Europe/Bratislava": "SK",
  "Europe/Brussels": "BE",
  "Europe/Bucharest": "RO",
  "Europe/Budapest": "HU",
  "Europe/Copenhagen": "DK",
  "Europe/Dublin": "IE",
  "Europe/Gibraltar": "GI",
  "Europe/Helsinki": "FI",
  "Europe/Kiev": "UA",
  "Europe/Kyiv": "UA",
  "Europe/Ljubljana": "SI",
  "Europe/London": "GB",
  "Europe/Luxembourg": "LU",
  "Europe/Malta": "MT",
  "Europe/Monaco": "MC",
  "Europe/Oslo": "NO",
  "Europe/Paris": "FR",
  "Europe/Prague": "CZ",
  "Europe/Riga": "LV",
  "Europe/Rome": "IT",
  "Europe/Sarajevo": "BA",
  "Europe/Skopje": "MK",
  "Europe/Sofia": "BG",
  "Europe/Stockholm": "SE",
  "Europe/Tallinn": "EE",
  "Europe/Tirane": "AL",
  "Europe/Vaduz": "LI",
  "Europe/Vienna": "AT",
  "Europe/Vilnius": "LT",
  "Europe/Warsaw": "PL",
  "Europe/Zagreb": "HR",
  "Europe/Zurich": "CH",
  "Atlantic/Reykjavik": "IS",

  // Portugal — mainland only; Madeira shares it, the Azores do not.
  "Europe/Lisbon": "PT",
  "Atlantic/Madeira": "PT",

  // Spain — mainland only; the Canary Islands run an hour behind.
  "Europe/Madrid": "ES",

  // Rest of world, single-timezone countries we see patients from.
  "Africa/Cairo": "EG",
  "Africa/Casablanca": "MA",
  "Africa/Johannesburg": "ZA",
  "Africa/Lagos": "NG",
  "Africa/Nairobi": "KE",
  "Africa/Tunis": "TN",
  "America/Bogota": "CO",
  "America/Lima": "PE",
  "America/Santiago": "CL",
  "Asia/Bangkok": "TH",
  "Asia/Dhaka": "BD",
  "Asia/Dubai": "AE",
  "Asia/Hong_Kong": "HK",
  "Asia/Jerusalem": "IL",
  "Asia/Karachi": "PK",
  "Asia/Kolkata": "IN",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Manila": "PH",
  "Asia/Qatar": "QA",
  "Asia/Riyadh": "SA",
  "Asia/Seoul": "KR",
  "Asia/Singapore": "SG",
  "Asia/Tokyo": "JP",
  "Pacific/Auckland": "NZ",
};

const UTC_ALIASES = new Set(["UTC", "GMT", "Etc/UTC", "Etc/GMT", "Universal", "Zulu"]);

function cityFromTimezone(timeZone: string): string {
  const city = timeZone.split("/").pop() ?? timeZone;
  return city.replace(/_/g, " ");
}

/**
 * Country (or city, for countries with several timezones) that names the given
 * IANA timezone, in the reader's language. Falls back to "UTC" when the zone is
 * missing or unrecognisable.
 */
export function timezoneLabel(
  timeZone: string | null | undefined,
  locale: string,
): string {
  const tz = timeZone?.trim();
  if (!tz || UTC_ALIASES.has(tz)) return "UTC";

  const countryCode = COUNTRY_BY_TIMEZONE[tz];
  if (countryCode) {
    try {
      const name = new Intl.DisplayNames([locale], { type: "region" }).of(countryCode);
      if (name && name !== countryCode) return name;
    } catch {
      // fall through to the city label
    }
  }

  return cityFromTimezone(tz);
}
