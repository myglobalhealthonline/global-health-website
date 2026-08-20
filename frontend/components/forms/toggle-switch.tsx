"use client";

/**
 * Public-site toggle switch.
 *
 * A real `role="switch"` button, not a restyled checkbox: these control whether
 * a block of the booking form exists at all, and a switch reads that way to a
 * screen reader ("on"/"off") where a checkbox reads as a value being ticked.
 * Consent boxes stay checkboxes on purpose — GDPR affirmative consent wants a
 * tick, and a pre-styled switch invites the "it looked already on" argument.
 *
 * Styled with Tailwind + public tokens only. The admin portal has its own
 * switch (`gh-admin-toggle`, `--portal-*`) and portal.css never ships to public
 * routes, so this cannot reuse it.
 */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  id,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Visible label. Also the accessible name via `aria-labelledby`. */
  label: React.ReactNode;
  /** Optional second line under the label. */
  description?: React.ReactNode;
  /** Needed to wire label ↔ switch; pass something stable per form. */
  id: string;
  disabled?: boolean;
}) {
  const labelId = `${id}-label`;
  const descriptionId = description ? `${id}-description` : undefined;
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border text-[var(--color-text-body)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        style={
          // Off state is drawn from `currentColor`, not from --color-border:
          // that token is rgba(255,255,255,0.12) under .gh2-dark-content, which
          // made the whole control near-invisible on the booking page's forest
          // card. currentColor is the body-text token, so the track and knob
          // keep their contrast on ivory and on forest alike.
          //
          // On state is lime, matching every other affirmative control on the
          // public site, with a dark knob — forest-on-forest had the same
          // vanishing problem in reverse.
          checked
            ? {
                background: "var(--color-brand-accent)",
                // Lime on the ivory card is only 1.4:1 against white, so the
                // pill's own outline has to carry the shape. Mixing in
                // currentColor darkens it on light surfaces and lightens it on
                // dark ones, clearing 3:1 on both.
                borderColor: "color-mix(in srgb, currentColor 55%, var(--color-brand-accent))",
              }
            : {
                background: "color-mix(in srgb, currentColor 14%, transparent)",
                borderColor: "color-mix(in srgb, currentColor 65%, transparent)",
              }
        }
      >
        <span
          aria-hidden
          className={`inline-block size-4 rounded-full shadow-sm transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-[3px]"
          }`}
          style={{ background: checked ? "#0A1F14" : "currentColor" }}
        />
      </button>
      <span className="min-w-0">
        <label
          id={labelId}
          htmlFor={id}
          className="block cursor-pointer text-sm font-semibold text-[var(--color-text-body)]"
        >
          {label}
        </label>
        {description ? (
          <span id={descriptionId} className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
            {description}
          </span>
        ) : null}
      </span>
    </div>
  );
}
