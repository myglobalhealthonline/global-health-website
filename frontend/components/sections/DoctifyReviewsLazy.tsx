"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import type { DoctifyReviewsBody, DoctifyWidget } from "./DoctifyReviews";
import { ReviewsSectionShell } from "./ReviewsSectionShell";

/**
 * `ssr: false` is only legal inside a Client Component. This wrapper isolates
 * that restriction so Server Component call sites can import a plain
 * component instead of building their own `dynamic(...)` per file.
 */

const DoctifyReviewsBodyImpl = dynamic(
  () => import("./DoctifyReviews").then((m) => m.DoctifyReviewsBody),
  {
    ssr: false,
    loading: () => <div aria-hidden className="min-h-[420px] w-full" />,
  },
) as (props: ComponentProps<typeof DoctifyReviewsBody>) => React.JSX.Element;

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
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- IntersectionObserver unavailable, fall back to eager mount, must run post-mount
      setNear(true);
      return;
    }
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

/**
 * Section copy renders on the server; only the third-party widget waits for
 * the viewport. Deferring the whole section (as this did until 2026-08-19)
 * kept a translated h2 + lede out of the HTML response on eleven page types,
 * so crawlers and AI scrapers saw an empty 420px div where the site's patient
 * proof should be.
 */
export function DoctifyReviewsSectionLazy({
  theme,
  variant,
  language,
  eyebrow,
  headline,
  headlineAccent,
  body,
}: Omit<ComponentProps<typeof ReviewsSectionShell>, "children"> & {
  variant?: ComponentProps<typeof DoctifyReviewsBody>["variant"];
}): React.JSX.Element {
  const { ref, near } = useNearViewport();
  return (
    <ReviewsSectionShell
      theme={theme}
      language={language}
      eyebrow={eyebrow}
      headline={headline}
      headlineAccent={headlineAccent}
      body={body}
    >
      {near ? (
        <DoctifyReviewsBodyImpl theme={theme} variant={variant} language={language} />
      ) : (
        <div ref={ref} aria-hidden className="min-h-[420px] w-full" />
      )}
    </ReviewsSectionShell>
  );
}

export function DoctifyWidgetLazy(
  props: ComponentProps<typeof DoctifyWidget>,
): React.JSX.Element {
  const { ref, near } = useNearViewport();
  if (!near) return <div ref={ref} aria-hidden className="min-h-[120px] w-full" />;
  return <DoctifyWidgetImpl {...props} />;
}
