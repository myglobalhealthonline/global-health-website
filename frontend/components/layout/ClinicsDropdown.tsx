"use client";

import Image from "next/image";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useState } from "react";
import {
  BadgePercent,
  Building2,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  ShieldCheck,
  Stethoscope,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { CountryClinicLinks, NavLink } from "@/data/navigation";
import { cn } from "@/lib/utils/cn";

export function ClinicsDropdown({
  label,
  clinicsMenuByCountry,
  clinicsOverviewLink,
  viewAllLabel,
  trustLabel,
  className,
}: {
  label: string;
  clinicsMenuByCountry: CountryClinicLinks[];
  clinicsOverviewLink: NavLink;
  viewAllLabel: string;
  trustLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const defaultCountryCode = clinicsMenuByCountry[0]?.country.code;
  const filteredCountries = clinicsMenuByCountry;

  const [activeCountryCode, setActiveCountryCode] = useState(defaultCountryCode);
  const resolvedActiveCountryCode =
    filteredCountries.some(({ country }) => country.code === activeCountryCode)
      ? activeCountryCode
      : filteredCountries[0]?.country.code;

  const activeCountryEntry =
    filteredCountries.find(({ country }) => country.code === resolvedActiveCountryCode) ?? filteredCountries[0];

  const homeLink = activeCountryEntry?.links.find(
    (item) => item.href === activeCountryEntry.country.legacyHomePath,
  );
  const serviceLinks =
    activeCountryEntry?.links.filter((item) => item.href !== activeCountryEntry.country.legacyHomePath) ?? [];

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setActiveCountryCode(defaultCountryCode);
        }
      }}
    >
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
          className="z-50 w-[min(100vw-2rem,940px)] overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-elevated)]"
          sideOffset={10}
          align="start"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex max-h-[min(78vh,720px)] flex-col overflow-hidden">
            <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)] overflow-hidden">
              <div className="overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-background-soft)] p-3">
                <p className="mb-2 px-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                  Country
                </p>
                <ul className="space-y-1">
                  {filteredCountries.map(({ country }) => {
                    const isActive = country.code === activeCountryEntry?.country.code;
                    return (
                      <li key={country.code}>
                        <button
                          type="button"
                          onClick={() => setActiveCountryCode(country.code)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-left text-[15px] font-medium transition-colors",
                            isActive
                              ? "border border-[var(--color-border)] bg-white text-[var(--color-brand-primary)] shadow-[var(--shadow-soft)]"
                              : "border border-transparent text-[var(--color-text-body)] hover:bg-white hover:text-[var(--color-brand-primary)]",
                          )}
                        >
                          <span>{country.name}</span>
                          <ChevronRight
                            className={cn("size-4", isActive ? "opacity-100" : "opacity-45")}
                            aria-hidden
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="min-h-0 overflow-y-auto px-4 py-4">
                {activeCountryEntry ? (
                  <div className="flex min-h-full flex-col">
                    <Link
                      href={homeLink?.href ?? activeCountryEntry.country.legacyHomePath}
                      className="mb-4 inline-flex items-center gap-3 rounded-[14px] border border-transparent px-2 py-2 text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-background-soft)] hover:text-[var(--color-brand-primary-hover)]"
                    >
                      <Image
                        src={countryIconByCode[activeCountryEntry.country.code]}
                        alt={`${activeCountryEntry.country.name} icon`}
                        width={44}
                        height={44}
                        className="size-11 rounded-full border border-[var(--color-border)] bg-white object-cover"
                      />
                      <div>
                        <p className="text-lg font-semibold leading-tight">{activeCountryEntry.country.name}</p>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          {homeLink?.label ?? `${activeCountryEntry.country.name} Home`}
                        </p>
                      </div>
                    </Link>

                    <ul className="space-y-1">
                      {serviceLinks.map((item) => {
                        const Icon = iconForClinicLink(item, activeCountryEntry.country.name);
                        return (
                          <li key={item.href + item.label}>
                            <DropdownMenu.Item asChild>
                              <Link
                                className="group flex items-center gap-3 rounded-[12px] p-2.5 text-[15px] font-medium text-[var(--color-text-body)] outline-none transition-colors hover:bg-[var(--color-background-soft)] hover:text-[var(--color-brand-primary)]"
                                href={item.href}
                              >
                                <span className="inline-flex size-9 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-background-soft)] text-[var(--color-brand-primary)] transition-all group-hover:scale-105 group-hover:border-[var(--color-brand-primary)] group-hover:bg-[var(--color-brand-primary)] group-hover:text-white">
                                  <Icon className="size-[18px]" aria-hidden />
                                </span>
                                <span>{item.label.replace(`${activeCountryEntry.country.name} `, "")}</span>
                              </Link>
                            </DropdownMenu.Item>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="mt-auto pt-5">
                      <div className="flex items-center justify-between gap-4 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3">
                        <div className="flex items-center gap-3 text-sm font-medium text-[var(--color-brand-primary)]">
                          <span className="inline-flex size-9 items-center justify-center rounded-full bg-[rgba(27,77,62,0.08)]">
                            <ShieldCheck className="size-[18px]" aria-hidden />
                          </span>
                          <span>{trustLabel}</span>
                        </div>
                        <DropdownMenu.Item asChild>
                          <Link
                            href={clinicsOverviewLink.href}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-4 text-xs font-semibold text-[var(--color-brand-primary)] transition-colors hover:bg-[var(--color-background-panel)]"
                          >
                            {viewAllLabel}
                            <ChevronRight className="size-4" aria-hidden />
                          </Link>
                        </DropdownMenu.Item>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[300px] items-center justify-center rounded-[24px] border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] px-6 text-center text-sm text-[var(--color-text-muted)]">
                    No clinics matched that search.
                  </div>
                )}
              </div>
            </div>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const countryIconByCode = {
  ie: "/icons/countries/ie-menu.png",
  cz: "/icons/countries/cz-menu.png",
  pt: "/icons/countries/pt-menu.png",
  sp: "/icons/countries/sp-menu.png",
  rm: "/icons/countries/rm-menu.png",
} as const;

function iconForClinicLink(item: NavLink, countryName: string) {
  const normalizedHref = item.href.toLowerCase();
  const normalizedLabel = item.label.toLowerCase();

  if (normalizedHref.includes("team") || normalizedLabel.includes("team")) return Users;
  if (normalizedHref.includes("general-consultation") || normalizedLabel.includes("general consultation")) {
    return Stethoscope;
  }
  if (normalizedHref.includes("specialty") || normalizedLabel.includes("specialist")) return UserRound;
  if (normalizedHref.includes("online-prescription") || normalizedLabel.includes("prescription")) {
    return BadgePercent;
  }
  if (normalizedHref.includes("home-delivery") || normalizedLabel.includes("delivery")) return Truck;
  if (normalizedHref.includes("plans-pricing") || normalizedLabel.includes("pricing")) return BadgePercent;
  if (normalizedHref.includes("health-test") || normalizedLabel.includes("health test")) return FlaskConical;
  if (normalizedHref.includes("partner-clinics") || normalizedLabel.includes("partner clinics")) return Building2;
  if (normalizedLabel.includes(countryName.toLowerCase())) return Users;
  return Stethoscope;
}
