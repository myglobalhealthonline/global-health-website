"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import type { SiteNavigationData } from "@/data/navigation";

export function MobileNav({
  siteName,
  navigation,
}: {
  siteName: string;
  navigation: SiteNavigationData;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-brand-secondary)] p-2.5 shadow-[var(--shadow-soft)] lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5 text-[var(--color-text-primary)]" aria-hidden />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-0 top-0 z-50 flex max-h-[100dvh] flex-col bg-[var(--color-brand-secondary)] shadow-[var(--shadow-elevated)] lg:hidden">
          <Dialog.Title className="sr-only">Main navigation</Dialog.Title>
          <Dialog.Description className="sr-only">
            Explore clinics, services, and book online.
          </Dialog.Description>

          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-4 py-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/logos/global-health-wordmark-temp.svg"
                alt={`${siteName} temporary wordmark`}
                width={200}
                height={48}
                className="h-10 w-auto"
              />
            </Link>
            <Dialog.Close className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-brand-secondary)] p-2 shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] focus-visible:ring-offset-2">
              <span className="sr-only">Close menu</span>
              <X className="size-5 text-[var(--color-text-primary)]" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="grow overflow-y-auto px-4 py-5 pb-28">
            <AccordionSection title={navigation.clinicsLabel}>
              <div className="space-y-6 pt-2">
                {navigation.clinicsMenuByCountry.map(({ country, links }) => (
                  <div key={country.code}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
                      {country.name}
                    </p>
                    <ul className="flex flex-col gap-1">
                      {links.map((item) => (
                        <li key={item.href + item.label}>
                          <Dialog.Close asChild>
                            <Link
                              href={item.href}
                              className="block rounded-[16px] px-3 py-3 text-[17px] font-medium leading-snug text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                            >
                              {item.label}
                            </Link>
                          </Dialog.Close>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </AccordionSection>

            <AccordionSection title={navigation.aboutLabel}>
              <ul className="flex flex-col gap-1 pt-2">
                {navigation.aboutMenuLinks.map((item) => (
                  <li key={item.href}>
                    <Dialog.Close asChild>
                      <Link
                        href={item.href}
                        className="block rounded-[16px] px-3 py-3 text-[17px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                      >
                        {item.label}
                      </Link>
                    </Dialog.Close>
                  </li>
                ))}
              </ul>
            </AccordionSection>

            <div className="mt-8 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6">
              {navigation.headerUtilityLinks.map((item) => (
                <Dialog.Close key={item.href} asChild>
                  <Link
                    href={item.href}
                    className="rounded-[16px] px-3 py-3 text-[17px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                  >
                    {item.label}
                  </Link>
                </Dialog.Close>
              ))}
              <Dialog.Close asChild>
                <Link
                  href={navigation.headerAuthLink.href}
                  className="rounded-[16px] px-3 py-3 text-[17px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                >
                  {navigation.headerAuthLink.label}
                </Link>
              </Dialog.Close>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--color-border)] bg-[rgba(255,255,255,0.96)] p-4 backdrop-blur-md">
            <Dialog.Close asChild>
              <Link href={navigation.headerPrimaryCta.href} className="gh-btn gh-btn-primary flex w-full text-base">
                {navigation.headerPrimaryCta.label}
              </Link>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AccordionSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="group border-b border-[var(--color-border)] pb-4 last:border-b-0">
      <summary className="marker:hidden flex cursor-pointer list-none items-center justify-between gap-4 py-2 [&::-webkit-details-marker]:hidden">
        <span className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</span>
        <ChevronDown
          className="size-5 shrink-0 text-[var(--color-text-muted)] transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div>{children}</div>
    </details>
  );
}
