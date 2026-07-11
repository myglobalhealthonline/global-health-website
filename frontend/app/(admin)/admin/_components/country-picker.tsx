"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { FlagBadge } from "./flag-badge";
import type { CountryPickerOption } from "./country-picker-constants";

// Constants and types live in `./country-picker-constants` so server-side
// importers (the admin layout, server actions) get the real value instead of
// the client-reference stub that `"use client"` wraps every export with.

type SetCountryPreferenceAction = (slug: string) => Promise<void>;

export function CountryPicker({
  countries,
  current,
  setCountryPreferenceAction,
}: {
  countries: CountryPickerOption[];
  current: CountryPickerOption | null;
  setCountryPreferenceAction: SetCountryPreferenceAction;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function select(slug: string) {
    startTransition(async () => {
      await setCountryPreferenceAction(slug);
      router.refresh();
    });
  }

  if (countries.length === 0) {
    return (
      <span
        className="gh-admin-country-picker gh-admin-country-picker--empty inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold"
        style={{ border: "1px solid var(--portal-chrome-border)", color: "var(--portal-chrome-text)" }}
      >
        No countries
      </span>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          disabled={isPending}
          className="gh-admin-country-picker inline-flex min-w-0 items-center gap-2.5 rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-white/5 disabled:opacity-60"
          style={{ border: "1px solid var(--portal-chrome-border)", color: "var(--portal-chrome-text-active)" }}
        >
          <FlagBadge code={current?.slug ?? "all"} size={16} />
          <span className="min-w-0 truncate">{current?.name ?? "All countries"}</span>
          <ChevronDown className="size-3.5 opacity-70" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="gh-app-menu-content gh-portal-menu-content gh-admin-country-picker-menu z-[var(--z-dropdown)] min-w-[240px] p-1.5"
          style={{
            borderRadius: "var(--portal-radius-xl)",
            border: "1px solid var(--portal-line)",
            background: "var(--portal-surface-elevated)",
            boxShadow: "var(--portal-shadow-modal)",
          }}
        >
          <div
            className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--portal-muted)" }}
          >
            Admin market scope
          </div>
          {countries.map((c) => {
            const active = c.slug === current?.slug;
            return (
              <DropdownMenu.Item
                key={c.id}
                onSelect={() => select(c.slug)}
                className="gh-admin-country-picker-item flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold outline-none data-[highlighted]:bg-[var(--portal-well)] focus-visible:ring-2 focus-visible:ring-[var(--portal-signal)]"
                style={active ? { background: "var(--portal-mint-soft)", color: "var(--portal-accent-text)" } : { color: "var(--portal-text)" }}
              >
                <FlagBadge code={c.slug} size={16} />
                <span>{c.name}</span>
                {active ? (
                  <Check className="ml-auto size-3.5" style={{ color: "var(--portal-accent-text)" }} aria-hidden />
                ) : null}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
