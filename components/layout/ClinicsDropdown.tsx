"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { clinicsMenuByCountry } from "@/data/navigation";
import { cn } from "@/lib/utils/cn";

export function ClinicsDropdown({ className }: { className?: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "hover:text-primary inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2",
            className,
          )}
        >
          Clinics
          <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="animate-in fade-in-0 zoom-in-95 border-border bg-card text-card-foreground data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 z-50 max-h-[min(70vh,520px)] w-[min(100vw-2rem,560px)] overflow-y-auto rounded-lg border p-4 shadow-xl"
          sideOffset={8}
          align="start"
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {clinicsMenuByCountry.map(({ country, links }) => (
              <div key={country.code}>
                <p className="text-primary mb-2 text-xs font-semibold uppercase tracking-wide">
                  {country.name}
                </p>
                <ul className="space-y-1">
                  {links.map((item) => (
                    <li key={item.href + item.label}>
                      <DropdownMenu.Item asChild>
                        <Link
                          className="hover:bg-muted focus:bg-muted block rounded-md px-2 py-2 text-sm outline-none"
                          href={item.href}
                        >
                          {item.label}
                        </Link>
                      </DropdownMenu.Item>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

