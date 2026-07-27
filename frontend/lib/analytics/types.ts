/**
 * Ambient globals for the two analytics tags.
 *
 * A module file with a `declare global` block, not a `.d.ts` — tsconfig's
 * `include` already covers every `.ts` file, so this is picked up with no config
 * change and stays colocated with the code that owns it. The frontend has no
 * `types/` directory and exactly one `.d.ts` (`next-env.d.ts`, generated);
 * this keeps that posture.
 */

export type ConsentState = "granted" | "denied";

export type GtagConsentParams = Partial<
  Record<"ad_storage" | "ad_user_data" | "ad_personalization" | "analytics_storage", ConsentState>
>;

/**
 * A union of argument TUPLES rather than a set of call-signature overloads:
 * the buffer in `gtag.ts` has to store and replay these, and
 * `Parameters<Overloaded>` silently resolves to the LAST overload only, which
 * would have made `gtagCall("set", ...)` a type error.
 */
export type GtagArgs =
  | ["js", Date]
  | ["config", string, Record<string, unknown>?]
  | ["set", Record<string, unknown>]
  | ["consent", "default" | "update", GtagConsentParams]
  | ["event", string, Record<string, unknown>?];

export interface GtagFn {
  (...args: GtagArgs): void;
}

/**
 * Microsoft's casing is NOT gtag's: `ad_Storage` / `analytics_Storage` with a
 * capital S, against gtag's all-lowercase `analytics_storage`. Getting it
 * wrong fails silently — Clarity ignores the call and keeps its default — so
 * it is encoded in the type where the compiler can catch it.
 *
 * `clarity("identify", ...)` is deliberately ABSENT: identifying a visitor to
 * Microsoft is exactly what must never happen on this site, so calling it is a
 * type error rather than a code-review question.
 *
 * `clarity("upgrade", reason)` is included only so nobody adds it back
 * thinking it is a consent call — it is not. It flags a session as
 * high-priority for retention and sampling, i.e. the opposite of what the name
 * suggests in a consent context.
 */
export interface ClarityFn {
  (command: "start" | "stop"): void;
  (command: "consentv2", params: { ad_Storage: ConsentState; analytics_Storage: ConsentState }): void;
  (command: "set", key: string, value: string | string[]): void;
  (command: "event", name: string): void;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
    clarity?: ClarityFn;
    /**
     * Google's documented hard opt-out: `window['ga-disable-G-XXXX'] = true`
     * stops gtag.js sending anything at all for that measurement id. Consent
     * Mode alone only downgrades GA to cookieless pings, which still put hits
     * on the wire — this is what actually stops them.
     */
    [gaDisable: `ga-disable-${string}`]: boolean | undefined;
  }
}
