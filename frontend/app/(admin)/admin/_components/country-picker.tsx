"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Globe2 } from "lucide-react";
import type { CountryOption } from "@/lib/admin/country-scope";

const COUNTRY_COOKIE = "gh_admin_country";

export function CountryPicker({
  countries,
  current,
}: {
  countries: CountryOption[];
  current: CountryOption | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function select(slug: string) {
    document.cookie = `${COUNTRY_COOKIE}=${slug};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    const match = pathname.match(/^\/admin\/([a-z]{2,4})(?=\/|$)/);
    if (match && countries.some((c) => c.slug === match[1])) {
      const next = pathname.replace(/^\/admin\/[a-z]{2,4}/, `/admin/${slug}`);
      startTransition(() => {
        router.push(next);
      });
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="relative">
      <label className="sr-only" htmlFor="gh-country-picker">Active country</label>
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
        <Globe2 className="size-4" aria-hidden />
      </div>
      <select
        id="gh-country-picker"
        value={current?.slug ?? ""}
        onChange={(e) => select(e.target.value)}
        disabled={isPending || countries.length === 0}
        className="gh-select h-10 pl-9 pr-9 text-sm"
      >
        {countries.length === 0 ? (
          <option value="">No countries</option>
        ) : (
          countries.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.code} — {c.name}
            </option>
          ))
        )}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
        <ChevronDown className="size-4" aria-hidden />
      </div>
    </div>
  );
}
