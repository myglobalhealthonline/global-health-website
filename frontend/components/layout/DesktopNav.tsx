"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowRight,
  BadgePercent,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  FlaskConical,
  Globe2,
  HeartHandshake,
  ShieldCheck,
  Stethoscope,
  Truck,
  User,
  UserRound,
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
        "hidden items-center justify-between lg:flex",
        className,
      )}
    >
      <div className="flex items-center gap-1">
        <ClinicsDropdown
          label={navigation.clinicsLabel}
          clinicsMenuByCountry={navigation.clinicsMenuByCountry}
          clinicsOverviewLink={navigation.clinicsOverviewLink}
          searchPlaceholder={navigation.searchCountryOrServiceLabel}
          viewAllLabel={navigation.viewAllClinicsLabel}
          trustLabel={navigation.trustedCareAcrossEuropeLabel}
          className="min-h-9 text-white hover:bg-white/10 hover:text-white focus-visible:ring-white/50"
        />

        <ServicesDropdown />

        <AboutDropdown navigation={navigation} />

        {navigation.headerUtilityLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex min-h-9 items-center whitespace-nowrap rounded-full px-3.5 py-2 text-[15px] font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={navigation.headerAuthLink.href}
          className="inline-flex min-h-9 items-center whitespace-nowrap rounded-full border border-white/30 bg-transparent px-4 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[var(--color-brand-primary)]"
        >
          {navigation.headerAuthLink.label}
        </Link>
        <Link
          href={navigation.headerPrimaryCta.href}
          className="inline-flex min-h-9 items-center whitespace-nowrap rounded-full bg-white px-4 text-sm font-semibold text-[var(--color-brand-primary)] transition-colors hover:bg-white/90 shadow-[var(--shadow-soft)]"
        >
          {navigation.headerPrimaryCta.label}
        </Link>
        <AvatarDropdown />
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Services mega-dropdown                                              */
/* ------------------------------------------------------------------ */

function ServicesDropdown() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-[15px] font-medium text-white/90 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2"
        >
          Services
          <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 w-[min(100vw-2rem,600px)] overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-brand-secondary)] p-4 shadow-[var(--shadow-elevated)]"
          sideOffset={10}
          align="start"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                Care
              </p>
              <ul className="space-y-0.5">
                <ServiceItem
                  href="/general-consultation-ie"
                  icon={<Stethoscope className="size-[18px]" aria-hidden />}
                  title="General Consultation"
                  description="Quick medical advice from our doctors"
                />
                <ServiceItem
                  href="/specialty-ie"
                  icon={<UserRound className="size-[18px]" aria-hidden />}
                  title="Specialist Consultation"
                  description="Expert care across all specialties"
                />
                <ServiceItem
                  href="/online-prescription"
                  icon={<BadgePercent className="size-[18px]" aria-hidden />}
                  title="Online Prescription"
                  description="Get prescriptions delivered digitally"
                />
              </ul>
            </div>
            <div>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                Wellness
              </p>
              <ul className="space-y-0.5">
                <ServiceItem
                  href="/home-delivery"
                  icon={<Truck className="size-[18px]" aria-hidden />}
                  title="Home Delivery"
                  description="Medicines delivered to your door"
                />
                <ServiceItem
                  href="/home-health-test"
                  icon={<FlaskConical className="size-[18px]" aria-hidden />}
                  title="Health Tests"
                  description="At-home diagnostic testing kits"
                />
                <ServiceItem
                  href="/partner-clinics"
                  icon={<Building2 className="size-[18px]" aria-hidden />}
                  title="Partner Clinics"
                  description="Visit our trusted clinic network"
                />
              </ul>
            </div>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ServiceItem({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <DropdownMenu.Item asChild>
      <li>
        <Link
          href={href}
          className="group flex items-start gap-3 rounded-[14px] p-2 outline-none transition-colors hover:bg-[var(--color-background-soft)]"
        >
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-background-soft)] text-[var(--color-brand-primary)] transition-all group-hover:scale-105 group-hover:border-[var(--color-brand-primary)] group-hover:bg-[var(--color-brand-primary)] group-hover:text-white">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium leading-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-brand-primary)]">
              {title}
            </div>
            <p className="mt-0.5 text-xs leading-snug text-[var(--color-text-muted)] transition-colors group-hover:text-[var(--color-text-body)]">
              {description}
            </p>
          </div>
        </Link>
      </li>
    </DropdownMenu.Item>
  );
}

/* ------------------------------------------------------------------ */
/* About mega-dropdown                                                 */
/* ------------------------------------------------------------------ */

function AboutDropdown({ navigation }: { navigation: SiteNavigationData }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-[15px] font-medium text-white/90 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2"
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
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-background-soft)] text-[var(--color-brand-primary)] transition-all group-hover:scale-105 group-hover:bg-[var(--color-brand-primary)] group-hover:text-white">
                        <Icon className="size-[18px]" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{item.label}</span>
                        <span className="block pt-0.5 text-xs text-[var(--color-text-muted)] transition-colors group-hover:text-[var(--color-text-body)]">
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
  if (
    lower.includes("ireland") ||
    lower.includes("portugal") ||
    lower.includes("romania") ||
    lower.includes("czechia") ||
    lower.includes("spain")
  ) {
    return Globe2;
  }
  if (lower.includes("care")) return HeartHandshake;
  return ShieldCheck;
}

/* ------------------------------------------------------------------ */
/* Avatar dropdown                                                     */
/* ------------------------------------------------------------------ */

function AvatarDropdown() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2"
          aria-label="Open account menu"
        >
          <User className="size-4" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[220px] overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-brand-secondary)] p-2 shadow-[var(--shadow-card)]"
          sideOffset={8}
          align="end"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">My Account</p>
            <p className="text-xs text-[var(--color-text-muted)]">Patient Portal</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors hover:bg-[var(--color-background-soft)]"
            >
              Dashboard
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors hover:bg-[var(--color-background-soft)]"
            >
              Login
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
