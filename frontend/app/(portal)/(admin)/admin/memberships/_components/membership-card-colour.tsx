"use client";

import { useState } from "react";
import { AA_THRESHOLD, deriveCardPalette } from "@/lib/card-colour";
import { MembershipCard } from "../../../../(auth)/account/_components/MembershipCard";

/**
 * Card colour picker with a live preview (§24.2, decision 45).
 *
 * Two controls, not one: `<input type="color">` has no empty state, so it can
 * never express "no colour, use the default face". The checkbox owns that, the
 * colour input owns the value, and `parseMembershipLevelForm` reads both.
 *
 * **Only the background is stored.** The foreground, the muted label colour and
 * the chrome tint are derived from it — here for the preview, and again
 * server-side for anything that actually renders — so an admin cannot produce
 * white-on-pale however far they drag the picker.
 *
 * The contrast warning is scored on the MUTED label colour, not the foreground.
 * On a derived binary foreground the AA threshold can never be crossed at all
 * (the worst case anywhere in sRGB is ~4.58:1), so scoring the foreground would
 * be a check that always passes — worse than no check, because it later reads
 * as evidence contrast was verified. It warns; it never blocks.
 */

const DEFAULT_PICK = "#0B3D2E";

export function MembershipCardColourField({
  level,
}: {
  level: { name: string; cardBackgroundHex: string | null };
}) {
  const [enabled, setEnabled] = useState(level.cardBackgroundHex !== null);
  const [hex, setHex] = useState(level.cardBackgroundHex ?? DEFAULT_PICK);

  const palette = enabled ? deriveCardPalette(hex) : null;

  return (
    <fieldset className="flex flex-col gap-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4">
      <legend className="gh-field-label px-1">Card</legend>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="useCardBackground"
          className="gh-checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span className="text-sm">Give this level its own card colour</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Background</span>
          <input
            type="color"
            name="cardBackgroundHex"
            value={hex}
            disabled={!enabled}
            onChange={(event) => setHex(event.target.value)}
            className="h-10 w-20 cursor-pointer rounded-[var(--radius-input)] border border-[var(--color-border)] bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Card background colour"
          />
        </label>

        <div className="flex flex-col justify-center gap-1 text-xs leading-snug">
          {palette ? (
            <>
              <p className="text-[var(--color-text-muted)]">
                Text is chosen automatically ({palette.foreground === "#F7FAEF" ? "light" : "dark"}
                ) — it is never stored, so this card stays readable whatever you pick.
              </p>
              <p
                // No `--color-warning-*` token exists in either stylesheet, so
                // the amber is literal rather than a var with a fallback that
                // would silently resolve to nothing. Chosen to stay legible on
                // both the light and the Obsidian Ivory admin surfaces.
                className={
                  palette.meetsAA
                    ? "text-[var(--color-text-muted)]"
                    : "font-medium text-[#d97706]"
                }
              >
                {palette.meetsAA
                  ? `Small label text scores ${palette.contrast}:1 — meets WCAG AA.`
                  : `Small label text scores only ${palette.contrast}:1, below the ${AA_THRESHOLD}:1 WCAG AA minimum. The card is still legible, but the small print will be hard to read.`}
              </p>
            </>
          ) : (
            <p className="text-[var(--color-text-muted)]">
              Using the default card face.
            </p>
          )}
        </div>
      </div>

      {/* The real component, not a mock — a preview that renders through
          different code is a preview of nothing. */}
      <div className="max-w-[360px]">
        <MembershipCard
          planName={level.name || "Level"}
          cardholderName="Alex Doyle"
          memberId="GH-MEMB-XXXXXXXX"
          validThrough="12 / 2027"
          countryName="IE · CZ · PT"
          status="ACTIVE"
          statusLabel="Active"
          labels={{
            cardholder: "Cardholder",
            memberId: "Member ID",
            validThrough: "Valid through",
            motto: "Medicine Anytime Anywhere",
          }}
          palette={palette}
        />
      </div>
    </fieldset>
  );
}
