import type { ProfileStrings } from "./profile-sections";

/** Shared by the identity and market forms — extracted so both can import
 *  without a circular dependency now that the single edit form is split. */

export type Msg = { kind: "success" | "error"; text: string };

export function resolvePhotoSrc(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/api/media/")) {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";
    return base ? `${base}${path}` : path;
  }
  return path;
}

const NBSP_RE = new RegExp(String.fromCharCode(160), "g");

export function normalizeBioPayload(html: string): string | null {
  const trimmed = html.trim();
  if (!trimmed) return null;
  const root = document.createElement("div");
  root.innerHTML = trimmed;
  const text = (root.textContent ?? "").replace(NBSP_RE, " ").trim();
  const hasMeaningfulMedia = root.querySelector("img") !== null;
  return text || hasMeaningfulMedia ? trimmed : null;
}

/** Country-matched IBAN/BIC examples (15-005) — a doctor editing their
 *  Czechia profile shouldn't see an Irish IBAN placeholder. Keyed by the
 *  app's country code; falls back to the Ireland example for markets not
 *  in this list yet. */
const IBAN_EXAMPLES: Record<string, { iban: string; bic: string }> = {
  ie: { iban: "IE29 AIBK 9311 5212 3456 78", bic: "AIBKIE2D" },
  cz: { iban: "CZ65 0800 0000 1920 0014 5399", bic: "GIBACZPX" },
  pt: { iban: "PT50 0002 0123 1234 5678 9015 4", bic: "BPIPPTPL" },
  es: { iban: "ES91 2100 0418 4502 0005 1332", bic: "CAIXESBB" },
  ro: { iban: "RO49 AAAA 1B31 0075 9384 0000", bic: "BTRLRO22" },
  gb: { iban: "GB29 NWBK 6016 1331 9268 19", bic: "NWBKGB2L" },
  br: { iban: "BR15 0000 0000 0000 1093 7840 9C2", bic: "BASABRSPXXX" },
  mt: { iban: "MT84 MALT 0110 0001 2345 MTLCAST001S", bic: "MALTMTMT" },
};

export function ibanExample(countryCode: string | null | undefined) {
  return IBAN_EXAMPLES[(countryCode ?? "").toLowerCase()] ?? IBAN_EXAMPLES.ie;
}

export function localeLabel(code: string, strings: ProfileStrings): string {
  const labels: Record<string, string> = {
    EN: strings.langEnglish,
    PT: strings.langPortuguese,
    ES: strings.langSpanish,
    CS: strings.langCzech,
    RO: strings.langRomanian,
    DE: strings.langGerman,
  };
  return labels[code.toUpperCase()] ?? code.toUpperCase();
}

/** BIC: 6 letters + 2 alphanumeric + optional 3 alphanumeric (8 or 11 chars). */
const BIC_RE = /^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/;

export function bicError(raw: string, strings: ProfileStrings): string | null {
  const v = raw.trim().replace(/\s/g, "");
  if (!v) return null;
  return BIC_RE.test(v) ? null : strings.bicErrorMsg;
}

export function ibanError(raw: string, strings: ProfileStrings): string | null {
  const v = raw.trim().replace(/\s/g, "");
  if (!v) return null;
  if (v.length < 15 || v.length > 34) return strings.ibanErrorLength;
  if (!/^[A-Za-z]{2}\d{2}[A-Za-z0-9]+$/.test(v)) return strings.ibanErrorFormat;
  return null;
}

export function MessageBanner({ msg }: { msg: Msg }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={`${
        msg.kind === "success" ? "gh-status-success" : "gh-status-warning"
      } mt-4 rounded-md border px-4 py-3 text-sm`}
    >
      {msg.text}
    </p>
  );
}
