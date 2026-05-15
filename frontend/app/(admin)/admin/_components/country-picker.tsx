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
      <span className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)]">
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
          className="inline-flex items-center gap-2.5 rounded-[10px] border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-border-strong)] disabled:opacity-60"
        >
          <FlagBadge code={current?.slug ?? "all"} size={16} />
          <span>{current?.name ?? "All countries"}</span>
          <ChevronDown className="size-3.5 text-[var(--color-text-muted)]" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[220px] rounded-xl border border-[var(--color-border)] bg-white p-1.5 shadow-[var(--shadow-elevated)]"
        >
          {countries.map((c) => {
            const active = c.slug === current?.slug;
            return (
              <DropdownMenu.Item
                key={c.id}
                onSelect={() => select(c.slug)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold outline-none ${
                  active
                    ? "bg-[var(--color-background-soft)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                }`}
              >
                <FlagBadge code={c.slug} size={16} />
                <span>{c.name}</span>
                {active ? (
                  <Check className="ml-auto size-3.5 text-[var(--color-brand-primary)]" aria-hidden />
                ) : null}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
