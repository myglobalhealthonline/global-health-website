"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";

type AppMenuProps = {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  contentClassName?: string;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Shared, portalled menu shell. Radix owns collision handling, focus return,
 * outside dismissal, and Escape so consumers only supply their native skin.
 */
export function AppMenu({
  trigger,
  children,
  align = "end",
  side = "bottom",
  sideOffset = 8,
  contentClassName = "",
  onOpenChange,
}: AppMenuProps) {
  return (
    <DropdownMenu.Root onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          side={side}
          sideOffset={sideOffset}
          collisionPadding={16}
          className={`gh-app-menu-content z-[var(--z-dropdown)] ${contentClassName}`}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export const AppMenuItem = DropdownMenu.Item;
export const AppMenuLabel = DropdownMenu.Label;
export const AppMenuSeparator = DropdownMenu.Separator;
