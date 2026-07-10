"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import type { DoctifyReviewsSection, DoctifyWidget } from "./DoctifyReviews";

/**
 * `ssr: false` is only legal inside a Client Component. This wrapper isolates
 * that restriction so Server Component call sites can import a plain
 * component instead of building their own `dynamic(...)` per file.
 */

const DoctifyReviewsSectionImpl = dynamic(
  () => import("./DoctifyReviews").then((m) => m.DoctifyReviewsSection),
  {
    ssr: false,
    loading: () => <div aria-hidden className="min-h-[420px] w-full" />,
  },
) as (props: ComponentProps<typeof DoctifyReviewsSection>) => React.JSX.Element;

const DoctifyWidgetImpl = dynamic(
  () => import("./DoctifyReviews").then((m) => m.DoctifyWidget),
  {
    ssr: false,
    loading: () => <div aria-hidden className="min-h-[120px] w-full" />,
  },
) as (props: ComponentProps<typeof DoctifyWidget>) => React.JSX.Element;

/**
 * Delays mounting `children` until the placeholder scrolls within
 * `rootMargin` of the viewport. Doctify's widgets inject a third-party
 * `<script>`/`<iframe>` on mount, so gating the mount (not just the code
 * split) keeps that network/main-thread work off pages where the widget
 * never becomes visible.
 */
function useNearViewport(rootMargin = "300px") {
  const ref = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near, rootMargin]);

  return { ref, near };
}

export function DoctifyReviewsSectionLazy(
  props: ComponentProps<typeof DoctifyReviewsSection>,
): React.JSX.Element {
  const { ref, near } = useNearViewport();
  if (!near) return <div ref={ref} aria-hidden className="min-h-[420px] w-full" />;
  return <DoctifyReviewsSectionImpl {...props} />;
}

export function DoctifyWidgetLazy(
  props: ComponentProps<typeof DoctifyWidget>,
): React.JSX.Element {
  const { ref, near } = useNearViewport();
  if (!near) return <div ref={ref} aria-hidden className="min-h-[120px] w-full" />;
  return <DoctifyWidgetImpl {...props} />;
}
