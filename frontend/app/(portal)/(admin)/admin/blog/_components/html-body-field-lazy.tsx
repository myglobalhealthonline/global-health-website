"use client";

import dynamic from "next/dynamic";

export const HtmlBodyFieldLazy = dynamic(
  () => import("./html-body-field").then((m) => m.HtmlBodyField),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="min-h-[24rem] w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)]"
      />
    ),
  },
);
