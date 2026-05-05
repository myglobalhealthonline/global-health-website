"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { CountryClinicLinks } from "@/data/navigation";
import { cn } from "@/lib/utils/cn";

export function ClinicsDropdown({
  label,
  clinicsMenuByCountry,
  className,
}: {
  label: string;
  clinicsMenuByCountry: CountryClinicLinks[];
  className?: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-11 items-center gap-1 rounded-full px-3.5 py-2 text-[15px] font-medium text-[var(--color-text-primary)] outline-none transition-colors hover:bg-[var(--color-background-soft)] hover:text-[var(--color-brand-primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] focus-visible:ring-offset-2",
            className,
          )}
        >
          {label}
          <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 max-h-[min(70vh,520px)] w-[min(100vw-2rem,600px)] overflow-y-auto rounded-[24px] border border-[var(--color-border)] bg-[var(--color-brand-secondary)] p-5 shadow-[var(--shadow-elevated)]"
          sideOffset={10}
          align="start"
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {clinicsMenuByCountry.map(({ country, links }) => (
              <div key={country.code}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
                  {country.name}
                </p>
                <ul className="space-y-1">
                  {links.map((item) => (
                    <li key={item.href + item.label}>
                      <DropdownMenu.Item asChild>
                        <Link
                          className="block rounded-[16px] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors hover:bg-[var(--color-background-soft)]"
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
