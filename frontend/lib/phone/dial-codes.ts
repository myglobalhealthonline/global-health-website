/**
 * App country code → international dial code, for the manual-booking phone
 * picker. Keyed by the app's country codes plus legacy aliases ("sp"/"rm")
 * so older records still resolve.
 *
 * Phones are always stored as "+<dial> <national>" (e.g. "+353 871234567")
 * so downstream WhatsApp/SMS normalization is unambiguous.
 */
export type DialOption = {
  /** Stable key for the option (app or ISO country code, lowercase). */
  key: string;
  /** E.164 calling prefix WITHOUT the leading + (e.g. "353"). */
  dial: string;
  /** Human label for the dropdown (e.g. "Ireland"). */
  label: string;
};

/** Active markets — pinned to the top of the dropdown. */
const MARKET_OPTIONS: DialOption[] = [
  { key: "ie", dial: "353", label: "Ireland" },
  { key: "cz", dial: "420", label: "Czechia" },
  { key: "pt", dial: "351", label: "Portugal" },
  { key: "es", dial: "34", label: "Spain" },
  { key: "rm", dial: "40", label: "Romania" },
  { key: "mt", dial: "356", label: "Malta" },
  { key: "br", dial: "55", label: "Brazil" },
  { key: "gb", dial: "44", label: "United Kingdom" },
  { key: "pk", dial: "92", label: "Pakistan" },
];

/** Every other country/territory, alphabetical. ISO 3166-1 alpha-2 keys. */
const WORLD_OPTIONS: DialOption[] = [
  { key: "af", dial: "93", label: "Afghanistan" },
  { key: "al", dial: "355", label: "Albania" },
  { key: "dz", dial: "213", label: "Algeria" },
  { key: "ad", dial: "376", label: "Andorra" },
  { key: "ao", dial: "244", label: "Angola" },
  { key: "ag", dial: "1268", label: "Antigua and Barbuda" },
  { key: "ar", dial: "54", label: "Argentina" },
  { key: "am", dial: "374", label: "Armenia" },
  { key: "aw", dial: "297", label: "Aruba" },
  { key: "au", dial: "61", label: "Australia" },
  { key: "at", dial: "43", label: "Austria" },
  { key: "az", dial: "994", label: "Azerbaijan" },
  { key: "bs", dial: "1242", label: "Bahamas" },
  { key: "bh", dial: "973", label: "Bahrain" },
  { key: "bd", dial: "880", label: "Bangladesh" },
  { key: "bb", dial: "1246", label: "Barbados" },
  { key: "by", dial: "375", label: "Belarus" },
  { key: "be", dial: "32", label: "Belgium" },
  { key: "bz", dial: "501", label: "Belize" },
  { key: "bj", dial: "229", label: "Benin" },
  { key: "bm", dial: "1441", label: "Bermuda" },
  { key: "bt", dial: "975", label: "Bhutan" },
  { key: "bo", dial: "591", label: "Bolivia" },
  { key: "ba", dial: "387", label: "Bosnia and Herzegovina" },
  { key: "bw", dial: "267", label: "Botswana" },
  { key: "bn", dial: "673", label: "Brunei" },
  { key: "bg", dial: "359", label: "Bulgaria" },
  { key: "bf", dial: "226", label: "Burkina Faso" },
  { key: "bi", dial: "257", label: "Burundi" },
  { key: "kh", dial: "855", label: "Cambodia" },
  { key: "cm", dial: "237", label: "Cameroon" },
  { key: "cv", dial: "238", label: "Cape Verde" },
  { key: "ky", dial: "1345", label: "Cayman Islands" },
  { key: "cf", dial: "236", label: "Central African Republic" },
  { key: "td", dial: "235", label: "Chad" },
  { key: "cl", dial: "56", label: "Chile" },
  { key: "cn", dial: "86", label: "China" },
  { key: "co", dial: "57", label: "Colombia" },
  { key: "km", dial: "269", label: "Comoros" },
  { key: "cg", dial: "242", label: "Congo" },
  { key: "cd", dial: "243", label: "Congo (DRC)" },
  { key: "cr", dial: "506", label: "Costa Rica" },
  { key: "ci", dial: "225", label: "Côte d'Ivoire" },
  { key: "hr", dial: "385", label: "Croatia" },
  { key: "cu", dial: "53", label: "Cuba" },
  { key: "cw", dial: "599", label: "Curaçao" },
  { key: "cy", dial: "357", label: "Cyprus" },
  { key: "dk", dial: "45", label: "Denmark" },
  { key: "dj", dial: "253", label: "Djibouti" },
  { key: "dm", dial: "1767", label: "Dominica" },
  { key: "do", dial: "1809", label: "Dominican Republic" },
  { key: "ec", dial: "593", label: "Ecuador" },
  { key: "eg", dial: "20", label: "Egypt" },
  { key: "sv", dial: "503", label: "El Salvador" },
  { key: "gq", dial: "240", label: "Equatorial Guinea" },
  { key: "er", dial: "291", label: "Eritrea" },
  { key: "ee", dial: "372", label: "Estonia" },
  { key: "sz", dial: "268", label: "Eswatini" },
  { key: "et", dial: "251", label: "Ethiopia" },
  { key: "fo", dial: "298", label: "Faroe Islands" },
  { key: "fj", dial: "679", label: "Fiji" },
  { key: "fi", dial: "358", label: "Finland" },
  { key: "fr", dial: "33", label: "France" },
  { key: "gf", dial: "594", label: "French Guiana" },
  { key: "pf", dial: "689", label: "French Polynesia" },
  { key: "ga", dial: "241", label: "Gabon" },
  { key: "gm", dial: "220", label: "Gambia" },
  { key: "ge", dial: "995", label: "Georgia" },
  { key: "de", dial: "49", label: "Germany" },
  { key: "gh", dial: "233", label: "Ghana" },
  { key: "gi", dial: "350", label: "Gibraltar" },
  { key: "gr", dial: "30", label: "Greece" },
  { key: "gl", dial: "299", label: "Greenland" },
  { key: "gd", dial: "1473", label: "Grenada" },
  { key: "gp", dial: "590", label: "Guadeloupe" },
  { key: "gu", dial: "1671", label: "Guam" },
  { key: "gt", dial: "502", label: "Guatemala" },
  { key: "gn", dial: "224", label: "Guinea" },
  { key: "gw", dial: "245", label: "Guinea-Bissau" },
  { key: "gy", dial: "592", label: "Guyana" },
  { key: "ht", dial: "509", label: "Haiti" },
  { key: "hn", dial: "504", label: "Honduras" },
  { key: "hk", dial: "852", label: "Hong Kong" },
  { key: "hu", dial: "36", label: "Hungary" },
  { key: "is", dial: "354", label: "Iceland" },
  { key: "in", dial: "91", label: "India" },
  { key: "id", dial: "62", label: "Indonesia" },
  { key: "ir", dial: "98", label: "Iran" },
  { key: "iq", dial: "964", label: "Iraq" },
  { key: "il", dial: "972", label: "Israel" },
  { key: "it", dial: "39", label: "Italy" },
  { key: "jm", dial: "1876", label: "Jamaica" },
  { key: "jp", dial: "81", label: "Japan" },
  { key: "jo", dial: "962", label: "Jordan" },
  { key: "ke", dial: "254", label: "Kenya" },
  { key: "ki", dial: "686", label: "Kiribati" },
  { key: "xk", dial: "383", label: "Kosovo" },
  { key: "kw", dial: "965", label: "Kuwait" },
  { key: "kg", dial: "996", label: "Kyrgyzstan" },
  { key: "la", dial: "856", label: "Laos" },
  { key: "lv", dial: "371", label: "Latvia" },
  { key: "lb", dial: "961", label: "Lebanon" },
  { key: "ls", dial: "266", label: "Lesotho" },
  { key: "lr", dial: "231", label: "Liberia" },
  { key: "ly", dial: "218", label: "Libya" },
  { key: "li", dial: "423", label: "Liechtenstein" },
  { key: "lt", dial: "370", label: "Lithuania" },
  { key: "lu", dial: "352", label: "Luxembourg" },
  { key: "mo", dial: "853", label: "Macao" },
  { key: "mg", dial: "261", label: "Madagascar" },
  { key: "mw", dial: "265", label: "Malawi" },
  { key: "my", dial: "60", label: "Malaysia" },
  { key: "mv", dial: "960", label: "Maldives" },
  { key: "ml", dial: "223", label: "Mali" },
  { key: "mh", dial: "692", label: "Marshall Islands" },
  { key: "mq", dial: "596", label: "Martinique" },
  { key: "mr", dial: "222", label: "Mauritania" },
  { key: "mu", dial: "230", label: "Mauritius" },
  { key: "mx", dial: "52", label: "Mexico" },
  { key: "fm", dial: "691", label: "Micronesia" },
  { key: "md", dial: "373", label: "Moldova" },
  { key: "mc", dial: "377", label: "Monaco" },
  { key: "mn", dial: "976", label: "Mongolia" },
  { key: "me", dial: "382", label: "Montenegro" },
  { key: "ma", dial: "212", label: "Morocco" },
  { key: "mz", dial: "258", label: "Mozambique" },
  { key: "mm", dial: "95", label: "Myanmar" },
  { key: "na", dial: "264", label: "Namibia" },
  { key: "nr", dial: "674", label: "Nauru" },
  { key: "np", dial: "977", label: "Nepal" },
  { key: "nl", dial: "31", label: "Netherlands" },
  { key: "nc", dial: "687", label: "New Caledonia" },
  { key: "nz", dial: "64", label: "New Zealand" },
  { key: "ni", dial: "505", label: "Nicaragua" },
  { key: "ne", dial: "227", label: "Niger" },
  { key: "ng", dial: "234", label: "Nigeria" },
  { key: "kp", dial: "850", label: "North Korea" },
  { key: "mk", dial: "389", label: "North Macedonia" },
  { key: "no", dial: "47", label: "Norway" },
  { key: "om", dial: "968", label: "Oman" },
  { key: "pw", dial: "680", label: "Palau" },
  { key: "ps", dial: "970", label: "Palestine" },
  { key: "pa", dial: "507", label: "Panama" },
  { key: "pg", dial: "675", label: "Papua New Guinea" },
  { key: "py", dial: "595", label: "Paraguay" },
  { key: "pe", dial: "51", label: "Peru" },
  { key: "ph", dial: "63", label: "Philippines" },
  { key: "pl", dial: "48", label: "Poland" },
  { key: "pr", dial: "1787", label: "Puerto Rico" },
  { key: "qa", dial: "974", label: "Qatar" },
  { key: "re", dial: "262", label: "Réunion" },
  // ponytail: countries sharing a dial code are one option — the select's value
  // IS the dial code, so two options with dial "1" are indistinguishable.
  { key: "ru", dial: "7", label: "Russia / Kazakhstan" },
  { key: "rw", dial: "250", label: "Rwanda" },
  { key: "ws", dial: "685", label: "Samoa" },
  { key: "sm", dial: "378", label: "San Marino" },
  { key: "st", dial: "239", label: "São Tomé and Príncipe" },
  { key: "sa", dial: "966", label: "Saudi Arabia" },
  { key: "sn", dial: "221", label: "Senegal" },
  { key: "rs", dial: "381", label: "Serbia" },
  { key: "sc", dial: "248", label: "Seychelles" },
  { key: "sl", dial: "232", label: "Sierra Leone" },
  { key: "sg", dial: "65", label: "Singapore" },
  { key: "sk", dial: "421", label: "Slovakia" },
  { key: "si", dial: "386", label: "Slovenia" },
  { key: "sb", dial: "677", label: "Solomon Islands" },
  { key: "so", dial: "252", label: "Somalia" },
  { key: "za", dial: "27", label: "South Africa" },
  { key: "kr", dial: "82", label: "South Korea" },
  { key: "ss", dial: "211", label: "South Sudan" },
  { key: "lk", dial: "94", label: "Sri Lanka" },
  { key: "kn", dial: "1869", label: "St Kitts and Nevis" },
  { key: "lc", dial: "1758", label: "St Lucia" },
  { key: "vc", dial: "1784", label: "St Vincent and the Grenadines" },
  { key: "sd", dial: "249", label: "Sudan" },
  { key: "sr", dial: "597", label: "Suriname" },
  { key: "se", dial: "46", label: "Sweden" },
  { key: "ch", dial: "41", label: "Switzerland" },
  { key: "sy", dial: "963", label: "Syria" },
  { key: "tw", dial: "886", label: "Taiwan" },
  { key: "tj", dial: "992", label: "Tajikistan" },
  { key: "tz", dial: "255", label: "Tanzania" },
  { key: "th", dial: "66", label: "Thailand" },
  { key: "tl", dial: "670", label: "Timor-Leste" },
  { key: "tg", dial: "228", label: "Togo" },
  { key: "to", dial: "676", label: "Tonga" },
  { key: "tt", dial: "1868", label: "Trinidad and Tobago" },
  { key: "tn", dial: "216", label: "Tunisia" },
  { key: "tr", dial: "90", label: "Türkiye" },
  { key: "tm", dial: "993", label: "Turkmenistan" },
  { key: "tv", dial: "688", label: "Tuvalu" },
  { key: "ug", dial: "256", label: "Uganda" },
  { key: "ua", dial: "380", label: "Ukraine" },
  { key: "ae", dial: "971", label: "United Arab Emirates" },
  { key: "us", dial: "1", label: "United States / Canada" },
  { key: "uy", dial: "598", label: "Uruguay" },
  { key: "uz", dial: "998", label: "Uzbekistan" },
  { key: "vu", dial: "678", label: "Vanuatu" },
  { key: "va", dial: "379", label: "Vatican City" },
  { key: "ve", dial: "58", label: "Venezuela" },
  { key: "vn", dial: "84", label: "Vietnam" },
  { key: "ye", dial: "967", label: "Yemen" },
  { key: "zm", dial: "260", label: "Zambia" },
  { key: "zw", dial: "263", label: "Zimbabwe" },
];

/** Ordered list shown in the dropdown — active markets first, then the world. */
export const DIAL_OPTIONS: DialOption[] = [...MARKET_OPTIONS, ...WORLD_OPTIONS];

/** Both the app code and the ISO code resolve to a dial code. */
const DIAL_BY_CODE: Record<string, string> = {
  ie: "353",
  cz: "420",
  pt: "351",
  sp: "34",
  es: "34",
  rm: "40",
  ro: "40",
  mt: "356",
  br: "55",
  gb: "44",
  uk: "44",
  pk: "92",
};

/** Country-name slugs (URL segments) → dial code, for surfaces that only
 *  know the route slug (e.g. /ireland/…). */
const DIAL_BY_SLUG: Record<string, string> = {
  ireland: "353",
  czechia: "420",
  czech: "420",
  "czech-republic": "420",
  portugal: "351",
  spain: "34",
  romania: "40",
  malta: "356",
  brazil: "55",
  "united-kingdom": "44",
  uk: "44",
  pakistan: "92",
};

/** App primary market — the default dial code when a country can't be mapped. */
export const DEFAULT_DIAL = "353"; // Ireland

/** Default dial code for a booking country code; falls back to Ireland (+353). */
export function dialCodeForCountry(code: string | null | undefined): string {
  if (!code) return DEFAULT_DIAL;
  return DIAL_BY_CODE[code.trim().toLowerCase()] ?? DEFAULT_DIAL;
}

/** Default dial code for a country URL slug (e.g. "ireland" → "353"). Falls
 *  back to the 2-letter code map, then Ireland. */
export function dialCodeForCountrySlug(slug: string | null | undefined): string {
  if (!slug) return DEFAULT_DIAL;
  const s = slug.trim().toLowerCase();
  return DIAL_BY_SLUG[s] ?? DIAL_BY_CODE[s.slice(0, 2)] ?? DEFAULT_DIAL;
}

/** Longest-first list of known dial codes, for prefix matching in splitPhone.
 *  Longest-first so NANP codes (+1876 Jamaica) win over the bare +1.
 *  ponytail: still ambiguous inside NANP (a US number starting 787 parses as
 *  Puerto Rico); only a real libphonenumber parse fixes that — add when it
 *  actually bites. */
const KNOWN_DIALS = [
  ...new Set([
    ...Object.values(DIAL_BY_CODE),
    ...DIAL_OPTIONS.map((o) => o.dial),
  ]),
].sort((a, b) => b.length - a.length);

/** Build the stored phone value from a dial code + national number.
 *  Empty national number → "" (keeps "optional phone" semantics). */
export function combinePhone(dial: string, national: string): string {
  const d = dial.trim().replace(/^\+/, "");
  const n = national.trim();
  if (!n) return "";
  return `+${d} ${n}`;
}

export type PhoneParts = { dial: string; national: string };

/**
 * Split a stored/prefilled phone into a dial code + national number.
 *   "+353 871234567" → { dial: "353", national: "871234567" }
 *   "+421902123456"  → { dial: "421", national: "902123456" }  (unknown code kept)
 *   "0871234567"     → { dial: fallbackDial, national: "0871234567" }
 * National part keeps digits only. When the value carries no "+", the whole
 * thing is treated as the national number under `fallbackDial`.
 */
export function splitPhone(
  raw: string | null | undefined,
  fallbackDial: string = DEFAULT_DIAL,
): PhoneParts {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { dial: fallbackDial, national: "" };

  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    for (const d of KNOWN_DIALS) {
      if (digits.startsWith(d) && digits.length > d.length) {
        return { dial: d, national: digits.slice(d.length) };
      }
    }
    // Unknown country code — keep a best-effort 1–3 digit prefix as the dial
    // so the number still round-trips, rather than dropping the code.
    const guess = digits.slice(0, Math.min(3, Math.max(1, digits.length - 6)));
    return { dial: guess || fallbackDial, national: digits.slice(guess.length) };
  }

  return { dial: fallbackDial, national: trimmed.replace(/\D/g, "") };
}
