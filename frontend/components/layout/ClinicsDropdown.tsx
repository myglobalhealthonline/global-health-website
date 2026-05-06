"use client";

import Image from "next/image";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useDeferredValue, useMemo, useState } from "react";
import {
  BadgePercent,
  Building2,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Search,
  ShieldCheck,
  Stethoscope,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import type { CountryClinicLinks, NavLink } from "@/data/navigation";
import { cn } from "@/lib/utils/cn";

export function ClinicsDropdown({
  label,
  clinicsMenuByCountry,
  clinicsOverviewLink,
  searchPlaceholder,
  viewAllLabel,
  trustLabel,
  className,
}: {
  label: string;
  clinicsMenuByCountry: CountryClinicLinks[];
  clinicsOverviewLink: NavLink;
  searchPlaceholder: string;
  viewAllLabel: string;
  trustLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const defaultCountryCode = clinicsMenuByCountry[0]?.country.code;

  const filteredCountries = useMemo(() => {
    if (!normalizedQuery) return clinicsMenuByCountry;

    return clinicsMenuByCountry.filter(({ country, links }) => {
      if (country.name.toLowerCase().includes(normalizedQuery)) return true;
      return links.some((item) => item.label.toLowerCase().includes(normalizedQuery));
    });
  }, [clinicsMenuByCountry, normalizedQuery]);

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
          setQuery("");
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
          className="z-50 w-[min(100vw-2rem,960px)] overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-brand-secondary)] shadow-[var(--shadow-elevated)]"
          sideOffset={10}
          align="start"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex max-h-[min(78vh,720px)] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-5">
              <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                {label}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-11 items-center justify-center rounded-full border border-transparent text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-background-soft)] hover:text-[var(--color-text-primary)]"
              >
                <X className="size-5" aria-hidden />
                <span className="sr-only">Close clinics menu</span>
              </button>
            </div>

            <div className="px-6 py-5">
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="gh-input rounded-[16px] pl-11 pr-4"
                />
              </label>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)] overflow-hidden border-t border-[var(--color-border)]">
              <div className="overflow-y-auto border-r border-[var(--color-border)] bg-[linear-gradient(180deg,#fbfdfb_0%,#f6f9f6_100%)] px-4 py-5">
                <ul className="space-y-1.5">
                  {filteredCountries.map(({ country }) => {
                    const isActive = country.code === activeCountryEntry?.country.code;
                    return (
                      <li key={country.code}>
                        <button
                          type="button"
                          onClick={() => setActiveCountryCode(country.code)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-[16px] px-4 py-3 text-left text-[15px] font-medium transition-colors",
                            isActive
                              ? "bg-[var(--color-brand-secondary)] text-[var(--color-brand-primary)] shadow-[var(--shadow-soft)]"
                              : "text-[var(--color-text-body)] hover:bg-[rgba(255,255,255,0.75)] hover:text-[var(--color-brand-primary)]",
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

              <div className="min-h-0 overflow-y-auto px-6 py-5">
                {activeCountryEntry ? (
                  <div className="flex min-h-full flex-col">
                    <Link
                      href={homeLink?.href ?? activeCountryEntry.country.legacyHomePath}
                      className="mb-5 inline-flex items-center gap-3 rounded-[18px] px-1 py-1 text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-brand-primary-hover)]"
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

                    <ul className="space-y-1.5">
                      {serviceLinks.map((item) => {
                        const Icon = iconForClinicLink(item, activeCountryEntry.country.name);
                        return (
                          <li key={item.href + item.label}>
                            <DropdownMenu.Item asChild>
                              <Link
                                className="flex items-center gap-3 rounded-[16px] px-3 py-3 text-[15px] font-medium text-[var(--color-text-body)] outline-none transition-colors hover:bg-[var(--color-background-soft)] hover:text-[var(--color-brand-primary)]"
                                href={item.href}
                              >
                                <span className="inline-flex size-9 items-center justify-center rounded-[12px] bg-[var(--color-background-soft)] text-[var(--color-brand-primary)]">
                                  <Icon className="size-[18px]" aria-hidden />
                                </span>
                                <span>{item.label.replace(`${activeCountryEntry.country.name} `, "")}</span>
                              </Link>
                            </DropdownMenu.Item>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="mt-auto pt-8">
                      <div className="flex items-center justify-between gap-4 rounded-[22px] border border-[var(--color-border)] bg-[linear-gradient(90deg,#f7fbf8_0%,#fdfefe_100%)] px-4 py-3">
                        <div className="flex items-center gap-3 text-sm font-medium text-[var(--color-brand-primary)]">
                          <span className="inline-flex size-9 items-center justify-center rounded-full bg-[rgba(27,77,62,0.08)]">
                            <ShieldCheck className="size-[18px]" aria-hidden />
                          </span>
                          <span>{trustLabel}</span>
                        </div>
                        <DropdownMenu.Item asChild>
                          <Link
                            href={clinicsOverviewLink.href}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-brand-primary)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--color-background-soft)]"
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
