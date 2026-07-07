"use client";

import dynamic from "next/dynamic";

export const RichTextHtmlFieldLazy = dynamic(
  () => import("./rich-text-html-field").then((m) => m.RichTextHtmlField),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="min-h-[17rem] w-full rounded-[var(--portal-radius)] border border-[var(--portal-line)] bg-[var(--portal-surface)]"
      />
    ),
  },
);
