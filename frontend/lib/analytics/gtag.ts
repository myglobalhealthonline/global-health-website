import type { GtagArgs } from "./types";

/**
 * A small buffer in front of `window.gtag`.
 *
 * The gtag.js loader is `lazyOnload`, so `window.gtag` may not exist yet when
 * the first `page_view` effect runs. Rather than poll or race, queue here and
 * flush from the inline bootstrap's `onReady`.
 *
 * This never DEFINES `window.gtag`. gtag.js requires the real `arguments`
 * object rather than an array, and the inline `<Script>` declares
 * `function gtag(){dataLayer.push(arguments)}` — a classic script's hoisted
 * function declaration would clobber anything set from here anyway. The inline
 * shim stays the single definition.
 */

/** Bounded: if gtag.js never loads (blocked, offline) this must not grow. */
const MAX_PENDING = 32;

let pending: GtagArgs[] = [];

export function gtagCall(...args: GtagArgs): void {
  const fn = typeof window === "undefined" ? undefined : window.gtag;
  if (fn) {
    fn(...args);
    return;
  }
  if (pending.length < MAX_PENDING) pending.push(args);
}

export function flushGtagQueue(): void {
  if (typeof window === "undefined") return;
  const fn = window.gtag;
  if (!fn) return;
  const queued = pending;
  pending = [];
  for (const args of queued) fn(...args);
}

/** Drop anything buffered — used when consent is withdrawn before gtag loads. */
export function resetGtagQueue(): void {
  pending = [];
}
