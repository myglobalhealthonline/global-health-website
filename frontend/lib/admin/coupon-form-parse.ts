import type { AdminCouponRecipientInput, CreateCouponBody } from "@/lib/admin/admin-api/coupons";

const LOCALES = new Set(["EN", "PT", "ES", "CS", "RO", "DE"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ParseResult =
  | { ok: true; data: CreateCouponBody }
  | { ok: false; error: string };

function str(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The date fields arrive as absolute ISO instants, converted in the browser by
 * `DateTimeField`. They must NOT be naive wall-clock strings: this parser runs
 * inside a Server Action, so a zone-less string would resolve in the server's
 * zone (UTC on Railway) rather than the admin's, and an admin in UTC+5 asking
 * for "starts now" would get a coupon that reports "not valid yet" for the next
 * five hours. Validated rather than trusted — a `Z`/offset must be present.
 */
function toIso(value: string): string | null {
  if (!value) return null;
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * The recipient picker serialises its chips into one hidden field, so this is
 * where they turn back into typed data. Anything malformed is dropped rather
 * than failing the whole form — a chip can only get here through the picker,
 * which already validated it, so a bad entry means a hand-edited payload.
 */
function parseRecipients(raw: string): AdminCouponRecipientInput[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const out: AdminCouponRecipientInput[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    const locale = typeof row.locale === "string" && LOCALES.has(row.locale) ? row.locale : null;
    const fullName = typeof row.fullName === "string" && row.fullName.trim() ? row.fullName.trim() : null;
    out.push({ email, fullName, locale: locale as AdminCouponRecipientInput["locale"] });
  }
  return out;
}

export function parseCouponBodyFromForm(form: FormData): ParseResult {
  const kind = str(form, "kind") === "PERSONAL" ? "PERSONAL" : "GENERAL";

  const discountPercent = Number(str(form, "discountPercent"));
  if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100) {
    return { ok: false, error: "Discount must be a whole number between 1 and 100." };
  }

  const maxRedemptions = Number(str(form, "maxRedemptions"));
  if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1) {
    return { ok: false, error: "The redemption limit must be at least 1." };
  }

  const validFrom = toIso(str(form, "validFrom"));
  const validUntil = toIso(str(form, "validUntil"));
  if (!validFrom || !validUntil) {
    return { ok: false, error: "Enter both a start and an end date." };
  }
  if (new Date(validUntil) <= new Date(validFrom)) {
    return { ok: false, error: "The end date must be after the start date." };
  }

  const personalEmail = str(form, "personalEmail").toLowerCase();
  if (kind === "PERSONAL" && !EMAIL_RE.test(personalEmail)) {
    return { ok: false, error: "A personal coupon needs the person's email address." };
  }

  const code = str(form, "code").toUpperCase();
  if (code && !/^[A-Z0-9][A-Z0-9-]{3,31}$/.test(code)) {
    return {
      ok: false,
      error: "A code must be 4–32 characters: letters, digits and hyphens, starting with a letter or digit.",
    };
  }

  // A personal coupon's recipient IS the assigned person, so its picker is not
  // submitted as a recipient list — the server derives it.
  const recipients = kind === "GENERAL" ? parseRecipients(str(form, "recipients")) : [];
  const sendNow = form.get("sendNow") === "on";
  if (kind === "GENERAL" && sendNow && recipients.length === 0) {
    return { ok: false, error: "Add at least one recipient, or untick “Email it now”." };
  }

  return {
    ok: true,
    data: {
      ...(code ? { code } : {}),
      kind,
      discountPercent,
      validFrom,
      validUntil,
      maxRedemptions,
      ...(kind === "PERSONAL"
        ? {
            personalEmail,
            ...(str(form, "personalName") ? { personalName: str(form, "personalName") } : {}),
          }
        : {}),
      ...(str(form, "internalNote") ? { internalNote: str(form, "internalNote") } : {}),
      ...(recipients.length > 0 ? { recipients } : {}),
      sendNow,
    },
  };
}
