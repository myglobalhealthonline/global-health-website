"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import {
  aboutMenuLinks,
  headerAuthLink,
  headerPrimaryCta,
  headerUtilityLinks,
} from "@/data/navigation";
import { cn } from "@/lib/utils/cn";
import { ClinicsDropdown } from "./ClinicsDropdown";

export function DesktopNav({ className }: { className?: string }) {
  return (
    <nav
      className={cn(
        "hidden items-center gap-1 md:flex md:flex-1 md:justify-end",
        className,
      )}
    >
      <ClinicsDropdown />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="hover:text-primary inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            About
            <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="border-border bg-card text-card-foreground animate-in fade-in-0 zoom-in-95 z-50 min-w-[220px] rounded-lg border p-2 shadow-xl"
            sideOffset={8}
            align="start"
          >
            {aboutMenuLinks.map((item) => (
              <DropdownMenu.Item key={item.href + item.label} asChild>
                <Link
                  className="hover:bg-muted focus:bg-muted block rounded-md px-3 py-2 text-sm outline-none"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {headerUtilityLinks.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="hover:text-primary rounded-md px-2 py-1.5 text-sm font-medium"
        >
          {item.label}
        </Link>
      ))}

      <Link
        href={headerAuthLink.href}
        className="text-muted-foreground hover:text-primary rounded-md px-2 py-1.5 text-sm font-medium"
      >
        {headerAuthLink.label}
      </Link>

      <Link
        href={headerPrimaryCta.href}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-colors"
      >
        {headerPrimaryCta.label}
      </Link>
    </nav>
  );
}

