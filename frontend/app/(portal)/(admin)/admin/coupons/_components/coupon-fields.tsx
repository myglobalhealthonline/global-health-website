"use client";

import { useState } from "react";
import { RecipientPicker } from "./recipient-picker";

/** Local wall-clock value for a `datetime-local` input, `days` from now. */
function localDateTime(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Client-side draw, purely for convenience. The server generates its own code
 *  when this field is left blank, and rejects a collision either way. */
function suggestCode(): string {
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/**
 * The coupon create form's fields. Client component only because the kind radio
 * swaps which block is shown and the code has a "generate" button — everything
 * still submits through the page's native server action.
 */
export function CouponFields() {
  const [kind, setKind] = useState<"PERSONAL" | "GENERAL">("PERSONAL");
  const [code, setCode] = useState("");

  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-2">
        <legend className="gh-field-label">Kind</legend>
        <label className="flex items-start gap-2">
          <input
            type="radio"
            name="kind"
            value="PERSONAL"
            checked={kind === "PERSONAL"}
            onChange={() => setKind("PERSONAL")}
          />
          <span>
            <strong>Personal</strong>
            <small className="block text-[var(--color-text-muted)]">
              For one named person. Only redeemable by the email address you assign it to.
            </small>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="radio"
            name="kind"
            value="GENERAL"
            checked={kind === "GENERAL"}
            onChange={() => setKind("GENERAL")}
          />
          <span>
            <strong>General</strong>
            <small className="block text-[var(--color-text-muted)]">
              Anyone holding the code can redeem it, up to the limit below. Choose who to email it
              to.
            </small>
          </span>
        </label>
      </fieldset>

      <label>
        <span className="gh-field-label">Code</span>
        <span className="flex gap-2">
          <input
            className="gh-input font-mono tracking-[0.08em] uppercase"
            name="code"
            value={code}
            autoComplete="off"
            placeholder="Leave blank to generate one"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button type="button" className="gh-btn" onClick={() => setCode(suggestCode())}>
            Generate
          </button>
        </span>
        <small className="mt-1 block text-[var(--color-text-muted)]">
          Read aloud on the phone, so the generator avoids O/0 and I/1.
        </small>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="gh-field-label">Discount %</span>
          <input
            className="gh-input"
            name="discountPercent"
            type="number"
            min={1}
            max={100}
            step={1}
            defaultValue={10}
            required
          />
          <small className="mt-1 block text-[var(--color-text-muted)]">
            Off the booking price. Delivery charges are never discounted.
          </small>
        </label>
        <label>
          <span className="gh-field-label">Redemption limit</span>
          <input
            className="gh-input"
            name="maxRedemptions"
            type="number"
            min={1}
            step={1}
            defaultValue={kind === "PERSONAL" ? 1 : 50}
            key={kind}
            required
          />
          <small className="mt-1 block text-[var(--color-text-muted)]">
            Counts bookings that have claimed it, including ones not yet paid. Cancelled bookings
            give the use back.
          </small>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="gh-field-label">Valid from</span>
          <input
            className="gh-input"
            name="validFrom"
            type="datetime-local"
            defaultValue={localDateTime(0)}
            required
          />
        </label>
        <label>
          <span className="gh-field-label">Valid until</span>
          <input
            className="gh-input"
            name="validUntil"
            type="datetime-local"
            defaultValue={localDateTime(30)}
            required
          />
        </label>
      </div>

      {kind === "PERSONAL" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="gh-field-label">Their email</span>
            <input className="gh-input" name="personalEmail" type="email" required />
            <small className="mt-1 block text-[var(--color-text-muted)]">
              The booking must be paid for from this address, or the code is refused.
            </small>
          </label>
          <label>
            <span className="gh-field-label">Their name (optional)</span>
            <input className="gh-input" name="personalName" type="text" />
            <small className="mt-1 block text-[var(--color-text-muted)]">
              Used for the greeting in the email.
            </small>
          </label>
        </div>
      ) : (
        <RecipientPicker
          label="Email it to"
          hint="Pick existing customers, or type any address. Everyone gets their own separate email — nobody sees anyone else's address."
        />
      )}

      <label>
        <span className="gh-field-label">Internal note (optional)</span>
        <textarea className="gh-input" name="internalNote" rows={2} />
        <small className="mt-1 block text-[var(--color-text-muted)]">
          Admin-only. Never appears in the email.
        </small>
      </label>

      <label className="flex items-start gap-2">
        <input type="checkbox" name="sendNow" defaultChecked />
        <span>
          <strong>Email it now</strong>
          <small className="block text-[var(--color-text-muted)]">
            {kind === "PERSONAL"
              ? "Sends the code to the address above as soon as the coupon is created."
              : "Sends one message per recipient. You can add more people later from the coupon page."}
          </small>
        </span>
      </label>

      <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
        Coupons cannot be combined with insurance, a coverage card, or a membership / corporate /
        plan benefit, and are not available in commission markets (Brazil).
      </p>
    </div>
  );
}
