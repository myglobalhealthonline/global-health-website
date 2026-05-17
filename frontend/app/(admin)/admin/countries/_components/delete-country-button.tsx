"use client";

import { Trash2 } from "lucide-react";

type DeleteCountryButtonProps = {
  countryName: string;
};

export function DeleteCountryButton({ countryName }: DeleteCountryButtonProps) {
  return (
    <button
      type="submit"
      aria-label={`Delete ${countryName}`}
      className="inline-flex items-center justify-center text-[var(--color-status-error-text)]"
      onClick={(event) => {
        const ok = window.confirm(
          `Delete ${countryName}? This deactivates the country and cannot be undone from this action.`,
        );
        if (!ok) event.preventDefault();
      }}
    >
      <Trash2 className="size-3.5" aria-hidden />
    </button>
  );
}
