"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
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
          className="hover:bg-muted inline-flex rounded-full border border-slate-200 bg-white p-2.5 shadow-sm md:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="bg-background fixed inset-x-0 top-0 z-50 flex max-h-[100dvh] flex-col shadow-xl md:hidden">
          <Dialog.Title className="sr-only">Main navigation</Dialog.Title>
          <Dialog.Description className="sr-only">
            Explore clinics, services, and book online.
          </Dialog.Description>

          <div className="flex items-center justify-between gap-4 border-b px-4 py-4">
            <Link href="/" className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-sky-700 text-sm font-bold text-white shadow-sm"
              >
                GH
              </span>
              <span className="text-lg font-semibold tracking-tight">{siteName}</span>
            </Link>
            <Dialog.Close className="hover:bg-muted inline-flex rounded-full border border-slate-200 bg-white p-2">
              <span className="sr-only">Close menu</span>
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="grow overflow-y-auto px-4 py-6 pb-28">
            <AccordionSection title={navigation.clinicsLabel}>
              <div className="space-y-6 pt-2">
                {navigation.clinicsMenuByCountry.map(({ country, links }) => (
                  <div key={country.code}>
                    <p className="text-primary mb-2 text-xs font-semibold uppercase tracking-wide">
                      {country.name}
                    </p>
                    <ul className="flex flex-col gap-1">
                      {links.map((item) => (
                        <li key={item.href + item.label}>
                          <Dialog.Close asChild>
                            <Link
                              href={item.href}
                              className="hover:bg-muted active:bg-muted block rounded-xl px-3 py-3 text-[17px] font-medium leading-snug"
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
                        className="hover:bg-muted active:bg-muted block rounded-xl px-3 py-3 text-[17px] font-medium"
                      >
                        {item.label}
                      </Link>
                    </Dialog.Close>
                  </li>
                ))}
              </ul>
            </AccordionSection>

            <div className="border-border mt-8 flex flex-col gap-2 border-t pt-6">
              {navigation.headerUtilityLinks.map((item) => (
                <Dialog.Close key={item.href} asChild>
                  <Link
                    href={item.href}
                    className="hover:bg-muted active:bg-muted rounded-xl px-3 py-3 text-[17px] font-medium"
                  >
                    {item.label}
                  </Link>
                </Dialog.Close>
              ))}
              <Dialog.Close asChild>
                <Link
                  href={navigation.headerAuthLink.href}
                  className="hover:bg-muted active:bg-muted rounded-xl px-3 py-3 text-[17px] font-medium"
                >
                  {navigation.headerAuthLink.label}
                </Link>
              </Dialog.Close>
            </div>
          </div>

          <div className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed bottom-0 left-0 right-0 border-t p-4 backdrop-blur-md">
            <Dialog.Close asChild>
              <Link
                href={navigation.headerPrimaryCta.href}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center rounded-full px-4 py-3.5 text-center text-base font-semibold shadow-sm"
              >
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
    <details className="border-border group border-b pb-4 last:border-b-0">
      <summary className="marker:hidden flex cursor-pointer list-none items-center justify-between gap-4 py-2 [&::-webkit-details-marker]:hidden">
        <span className="text-lg font-semibold">{title}</span>
        <span className="text-muted-foreground inline-block rotate-0 transition-transform group-open:-rotate-180">
          ⌄
        </span>
      </summary>
      <div>{children}</div>
    </details>
  );
}
