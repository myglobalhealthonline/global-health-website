"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * LazyHydrate — defers hydration of a heavy client subtree until it scrolls
 * near the viewport, WITHOUT losing SSR-rendered HTML (SEO content stays in
 * the initial server response either way).
 *
 * Mechanism (react-lazy-hydration / next-lazy-hydrate pattern): on the
 * server this renders `children` normally — full markup ships in the HTML
 * response. On the client's hydration pass it instead renders the same
 * wrapper `<div>` with `dangerouslySetInnerHTML` + `suppressHydrationWarning`
 * and no children. React does not recurse into hydrating a host node's
 * children when that node also carries `dangerouslySetInnerHTML` — it
 * adopts the existing server-rendered DOM as opaque, untouched markup and
 * attaches zero event listeners / runs zero component logic for that
 * subtree. The real DOM (and all its text/links/images) is still on the
 * page and still crawlable — it's just inert until hydrated.
 *
 * Once an IntersectionObserver reports the wrapper within `rootMargin` of
 * the viewport, `hydrated` flips true and `children` renders for real —
 * mounting the actual React tree (state, effects, event listeners) exactly
 * once, on demand, instead of every such section hydrating simultaneously
 * on load.
 */
export function LazyHydrate({
  children,
  rootMargin = "600px",
}: {
  children: ReactNode;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      // ponytail: no IO support, fail open rather than stay inert forever
      // eslint-disable-next-line react-hooks/set-state-in-effect -- IO support is only knowable post-mount; hydrating in the initializer would desync SSR markup
      setHydrated(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHydrated(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hydrated, rootMargin]);

  if (hydrated) {
    // Real mount — no wrapper div once hydrated so layout/DOM structure
    // matches what a fully-hydrated page always looked like.
    return <>{children}</>;
  }

  const isServer = typeof window === "undefined";

  return (
    <div
      ref={ref}
      suppressHydrationWarning
      dangerouslySetInnerHTML={isServer ? undefined : { __html: "" }}
    >
      {isServer ? children : null}
    </div>
  );
}
