"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronDown,
  Globe2,
  HeartHandshake,
  ShieldCheck,
  Users,
} from "lucide-react";
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
            className="z-50 w-[min(100vw-2rem,560px)] rounded-[22px] border border-[var(--color-border)] bg-[var(--color-brand-secondary)] p-3 shadow-[var(--shadow-elevated)]"
            sideOffset={10}
            align="start"
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <div className="space-y-1.5">
                <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                  About
                </p>
                {navigation.aboutMenuLinks.map((item) => {
                  const Icon = iconForAboutLink(item.label);
                  return (
                    <DropdownMenu.Item key={item.href + item.label} asChild>
                      <Link
                        className="group flex items-start gap-3 rounded-[16px] px-3 py-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors hover:bg-[var(--color-background-soft)]"
                        href={item.href}
                      >
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-background-soft)] text-[var(--color-brand-primary)]">
                          <Icon className="size-[18px]" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold">{item.label}</span>
                          <span className="block pt-0.5 text-xs text-[var(--color-text-muted)]">
                            {aboutMetaByLabel[item.label] ?? "Learn more about our clinics and team."}
                          </span>
                        </span>
                      </Link>
                    </DropdownMenu.Item>
                  );
                })}
              </div>

              <div className="rounded-[18px] border border-[var(--color-border)] bg-[linear-gradient(180deg,#f8fbf8_0%,#ffffff_100%)] p-4">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Trusted care across Europe
                </p>
                <p className="pt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
                  Licensed doctors, secure consultations, and support in multiple countries.
                </p>
                <Link
                  href={navigation.headerPrimaryCta.href}
                  className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-4 text-xs font-semibold text-[var(--color-brand-primary)] transition-colors hover:bg-[var(--color-background-soft)]"
                >
                  {navigation.headerPrimaryCta.label}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
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

const aboutMetaByLabel: Record<string, string> = {
  "Ireland Team": "Meet our Ireland medical team.",
  "Portugal Team": "Meet our Portugal medical team.",
  "Romania Team": "Meet our Romania medical team.",
  "Czechia Team": "Meet our Czechia medical team.",
  "Spain Team": "Meet our Spain medical team.",
  Careers: "Join our growing healthcare team.",
};

function iconForAboutLink(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("team")) return Users;
  if (lower.includes("career")) return BriefcaseBusiness;
  if (lower.includes("ireland") || lower.includes("portugal") || lower.includes("romania") || lower.includes("czechia") || lower.includes("spain")) {
    return Globe2;
  }
  if (lower.includes("care")) return HeartHandshake;
  return ShieldCheck;
}
