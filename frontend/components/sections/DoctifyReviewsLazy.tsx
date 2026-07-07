"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { DoctifyReviewsSection, DoctifyWidget } from "./DoctifyReviews";

/**
 * `ssr: false` is only legal inside a Client Component. This wrapper isolates
 * that restriction so Server Component call sites can import a plain
 * component instead of building their own `dynamic(...)` per file.
 */

export const DoctifyReviewsSectionLazy = dynamic(
  () => import("./DoctifyReviews").then((m) => m.DoctifyReviewsSection),
  {
    ssr: false,
    loading: () => <div aria-hidden className="min-h-[420px] w-full" />,
  },
) as (props: ComponentProps<typeof DoctifyReviewsSection>) => React.JSX.Element;

export const DoctifyWidgetLazy = dynamic(
  () => import("./DoctifyReviews").then((m) => m.DoctifyWidget),
  {
    ssr: false,
    loading: () => <div aria-hidden className="min-h-[120px] w-full" />,
  },
) as (props: ComponentProps<typeof DoctifyWidget>) => React.JSX.Element;
