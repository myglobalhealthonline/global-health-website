"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export type AppSheetSize = "sm" | "md" | "lg";
export type AppSheetSide = "right" | "bottom";
export type AppSheetTheme = "portal" | "public";

/**
 * AppSheet — shared side-drawer/bottom-sheet primitive (DRAWER_ARCHITECTURE_PLAN
 * §1, RESPONSIVE_DESIGN_SYSTEM_PLAN §3.2/§4b). Radix Dialog owns the portal,
 * focus trap/restore, Escape, and scrim dismissal — this component only adds
 * the size/side/theme skin and the sticky header/body/footer slot layout.
 *
 * Desktop: right-side panel, width per `size` (sm 420 / md 520 / lg 640px).
 * Tablet: `min(80vw, size)`. Mobile (<640px): full-screen sheet (or true
 * bottom sheet when `side="bottom"`). Height is capped `min(88svh, cap)`
 * when inset, `100svh` full-screen on mobile — body scrolls internally,
 * header/footer stay sticky. `theme` picks the portal (lux, Obsidian Ivory)
 * or public (gh2 glass) skin — see the matching CSS blocks in portal.css /
 * globals.css respectively (selector lives in exactly one file per the
 * CSS-split rule in root CLAUDE.md).
 */
export function AppSheet({
  open,
  onOpenChange,
  side = "right",
  size = "md",
  theme = "portal",
  header,
  footer,
  children,
  ariaLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: AppSheetSide;
  size?: AppSheetSize;
  theme?: AppSheetTheme;
  /** Sticky header slot — title/eyebrow + close button live here. */
  header?: ReactNode;
  /** Sticky footer slot — action buttons. Omit for no footer. */
  footer?: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={`gh-app-sheet-overlay gh-app-sheet-overlay--${theme}`}
        />
        <Dialog.Content
          aria-label={ariaLabel}
          className={`gh-app-sheet gh-app-sheet--${theme} gh-app-sheet--${side} gh-app-sheet--${size}`}
        >
          <div className="gh-app-sheet__header">
            {header}
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="gh-app-sheet__close"
              >
                <X className="size-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <div className="gh-app-sheet__body">{children}</div>
          {footer ? <div className="gh-app-sheet__footer">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
