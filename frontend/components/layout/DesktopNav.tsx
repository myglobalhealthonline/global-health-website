"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { SiteNavigationData } from "@/data/navigation";
import { cn } from "@/lib/utils/cn";
import { ClinicsDropdown } from "./ClinicsDropdown";

export function DesktopNav({
  className,
  navigation,
}: {
  className?: string;
  navigation: SiteNavigationData;
}) {
  return (
    <nav
      className={cn(
        "hidden items-center gap-1 lg:flex",
        className,
      )}
    >
      <ClinicsDropdown
        label={navigation.clinicsLabel}
        clinicsMenuByCountry={navigation.clinicsMenuByCountry}
        clinicsOverviewLink={navigation.clinicsOverviewLink}
        searchPlaceholder={navigation.searchCountryOrServiceLabel}
        viewAllLabel={navigation.viewAllClinicsLabel}
        trustLabel={navigation.trustedCareAcrossEuropeLabel}
      />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3.5 py-2 text-[15px] font-medium text-[var(--color-text-primary)] outline-none transition-colors hover:bg-[var(--color-background-soft)] hover:text-[var(--color-brand-primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] focus-visible:ring-offset-2"
          >
            {navigation.aboutLabel}
            <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 min-w-[240px] rounded-[20px] border border-[var(--color-border)] bg-[var(--color-brand-secondary)] p-2 shadow-[var(--shadow-card)]"
            sideOffset={10}
            align="start"
          >
            {navigation.aboutMenuLinks.map((item) => (
              <DropdownMenu.Item key={item.href + item.label} asChild>
                <Link
                  className="block rounded-[16px] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors hover:bg-[var(--color-background-soft)]"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {navigation.headerUtilityLinks.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="inline-flex min-h-11 items-center rounded-full px-3.5 py-2 text-[15px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-background-soft)] hover:text-[var(--color-brand-primary-hover)]"
        >
          {item.label}
        </Link>
      ))}

      <Link
        href={navigation.headerAuthLink.href}
        className="inline-flex min-h-11 items-center rounded-full px-3.5 py-2 text-[15px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-background-soft)] hover:text-[var(--color-brand-primary-hover)]"
      >
        {navigation.headerAuthLink.label}
      </Link>

      <Link
        href={navigation.headerPrimaryCta.href}
        className="gh-btn gh-btn-primary min-w-[158px] px-6"
      >
        {navigation.headerPrimaryCta.label}
      </Link>
    </nav>
  );
}
