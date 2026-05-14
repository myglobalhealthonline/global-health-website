"use client";

import { useState, useTransition } from "react";
import { toggleCategoryCountryAction } from "../actions";

export function CountryEnableMatrix({
  categoryId,
  countryId,
  enabled,
}: {
  categoryId: string;
  countryId: string;
  enabled: boolean;
}) {
  const [optimistic, setOptimistic] = useState(enabled);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !optimistic;
    setOptimistic(next);
    const form = new FormData();
    form.set("categoryId", categoryId);
    form.set("countryId", countryId);
    form.set("enable", String(next));
    startTransition(async () => {
      await toggleCategoryCountryAction(form);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={optimistic}
      className={`inline-flex h-6 w-11 items-center rounded-full transition ${
        optimistic ? "bg-[var(--color-brand-primary)]" : "bg-[var(--color-border)]"
      } disabled:opacity-60`}
    >
      <span
        className={`inline-block size-5 transform rounded-full bg-white shadow transition ${
          optimistic ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
