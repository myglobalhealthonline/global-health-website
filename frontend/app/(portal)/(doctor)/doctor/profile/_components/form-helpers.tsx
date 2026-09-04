import type { ReactNode } from "react";
import { Pill } from "@/components/portal-atoms";
import type {
  DoctorProfileChangeField,
  DoctorProfileChangeRequest,
} from "@/lib/api/doctor-api";
import type { ProfileStrings } from "./profile-sections";

/** Shared by the identity and market forms — extracted so both can import
 *  without a circular dependency now that the single edit form is split. */

export type Msg = { kind: "success" | "error"; text: string };

/**
 * Submits one change request per dirty locked field and reports what actually
 * happened.
 *
 * Each field is its own request so an admin can approve a bio without also
 * accepting a registration number they haven't sighted — which means one
 * failing must not silently discard the others. Every job runs, and the caller
 * gets the collected errors rather than just the first.
 */
export async function submitChangeRequests(
  jobs: Array<Record<string, unknown>>,
  fallbackError: string,
): Promise<string[]> {
  const errors: string[] = [];
  for (const body of jobs) {
    try {
      const res = await fetch("/api/doctor/profile/change-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) errors.push(json.message ?? fallbackError);
    } catch {
      errors.push(fallbackError);
    }
  }
  return errors;
}

/**
 * The latest change request for one locked field, or null if the field has
 * never been proposed. `countryId` is null for the global fields (name,
 * qualifications, photo) and set for the per-market ones (bio, registration).
 *
 * The backend already returns only the latest row per (field, market), so this
 * is a lookup rather than a reduce.
 */
export function requestFor(
  requests: DoctorProfileChangeRequest[],
  field: DoctorProfileChangeField,
  countryId: string | null,
): DoctorProfileChangeRequest | null {
  return (
    requests.find((r) => r.field === field && r.countryId === countryId) ?? null
  );
}

export function isPending(request: DoctorProfileChangeRequest | null): boolean {
  return request?.status === "pending";
}

/**
 * Status line under an admin-locked field: what's waiting, what the admin said
 * if they turned it down, and a way to take a pending request back.
 *
 * Renders nothing for approved/cancelled/never-requested — those mean the field
 * is simply editable, and a chip saying so would be noise.
 */
export function ApprovalNotice({
  request,
  strings,
  renderValue,
  onWithdraw,
  busy,
}: {
  request: DoctorProfileChangeRequest | null;
  strings: ProfileStrings;
  /** Renders the proposed value for the doctor to double-check. Omit for
   *  values that don't read well inline (e.g. rich-text bios). */
  renderValue?: (request: DoctorProfileChangeRequest) => ReactNode;
  onWithdraw: (id: string) => void;
  busy: boolean;
}) {
  if (!request) return null;

  if (request.status === "pending") {
    return (
      <div className="gh-doctor-approval-notice mt-2 rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Pill tone="pending">{strings.pendingBadge}</Pill>
          <button
            type="button"
            onClick={() => onWithdraw(request.id)}
            disabled={busy}
            className="gh-btn gh-btn-soft"
            style={{ minHeight: 28, padding: "0 10px", fontSize: 12 }}
          >
            {busy ? strings.withdrawing : strings.withdrawRequest}
          </button>
        </div>
        {renderValue ? (
          <p className="mt-1.5 text-xs text-[var(--portal-muted)]">
            <span className="font-semibold">{strings.pendingRequestedLabel}:</span>{" "}
            {renderValue(request)}
          </p>
        ) : null}
      </div>
    );
  }

  if (request.status === "rejected") {
    return (
      <div className="gh-doctor-approval-notice mt-2 rounded-md border px-3 py-2 gh-status-warning">
        <Pill tone="inactive">{strings.rejectedBadge}</Pill>
        {request.reviewNote ? (
          <p className="mt-1.5 text-xs">
            <span className="font-semibold">{strings.adminNoteLabel}:</span>{" "}
            {request.reviewNote}
          </p>
        ) : null}
      </div>
    );
  }

  return null;
}

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
export const IBAN_EXAMPLES: Record<string, { iban: string; bic: string }> = {
  ie: { iban: "IE29 AIBK 9311 5212 3456 78", bic: "AIBKIE2D" },
  cz: { iban: "CZ65 0800 0000 1920 0014 5399", bic: "GIBACZPX" },
  pt: { iban: "PT50 0002 0123 1234 5678 9015 4", bic: "BPIPPTPL" },
  es: { iban: "ES91 2100 0418 4502 0005 1332", bic: "CAIXESBB" },
  ro: { iban: "RO49 AAAA 1B31 0075 9384 0000", bic: "BTRLRO22" },
  gb: { iban: "GB29 NWBK 6016 1331 9268 19", bic: "NWBKGB2L" },
  // A Brazilian IBAN is 29 characters. The placeholder here used to be a
  // 27-character string that failed its own checksum — see the export test.
  br: { iban: "BR97 0036 0305 0000 1000 9795 493P 1", bic: "BASABRSPXXX" },
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

/**
 * ISO 13616 mod-97 over the rearranged IBAN — must equal 1. Mirrors
 * `backend/src/utils/iban.ts` so a mistyped IBAN fails on the field instead of
 * coming back as a generic 400 from the API.
 */
function ibanChecksumOk(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch >= "A" && ch <= "Z" ? (ch.charCodeAt(0) - 55).toString() : ch;
    for (const digit of code) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

/**
 * IBAN validity is decided by ISO 13616's own rules: the 15-34 character
 * bound, the country+check-digit shape, and the mod-97 checksum. There is
 * deliberately NO per-country exact-length table here.
 *
 * There used to be one, derived from the examples above. It was wrong for
 * Brazil — the BR placeholder was a 27-character string (a real BR IBAN is 29,
 * and that placeholder failed its own checksum), so every genuine Brazilian
 * IBAN was rejected with "a BR IBAN is 27 characters". A doctor could not save
 * their real bank details at all. The table only covered the eight countries
 * that happened to have an example, so it blocked the markets it knew about
 * while waving through everywhere else.
 *
 * Nothing is lost by dropping it: a wrong-length IBAN fails the mod-97
 * checksum anyway (the bad BR placeholder itself does), so such input is still
 * rejected — only the error message is less specific.
 */
export function ibanError(raw: string, strings: ProfileStrings): string | null {
  const v = raw.trim().replace(/[\s-]/g, "").toUpperCase();
  if (!v) return null;
  if (v.length < 15 || v.length > 34) return strings.ibanErrorLength;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(v)) return strings.ibanErrorFormat;
  return null;
}

/**
 * Advisory, NOT a blocker: the mod-97 check digits don't verify, so the IBAN
 * is probably mistyped. Shown next to the field while still allowing the save.
 *
 * The checksum is a genuine signal — a single wrong character fails it, and a
 * wrong character means the transfer bounces or reaches the wrong account. But
 * enforcing it has repeatedly left doctors unable to record their own bank
 * details, and the person holding the bank statement is better placed to
 * settle it than a regex. So: warn loudly, let them proceed.
 */
export function ibanWarning(raw: string, strings: ProfileStrings): string | null {
  const v = raw.trim().replace(/[\s-]/g, "").toUpperCase();
  if (!v) return null;
  if (ibanError(v, strings)) return null; // a hard error is already showing
  // Deliberately not `ibanErrorChecksum` — that copy reads as a refusal, and
  // this no longer refuses anything.
  return ibanChecksumOk(v) ? null : strings.ibanWarnChecksum;
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
