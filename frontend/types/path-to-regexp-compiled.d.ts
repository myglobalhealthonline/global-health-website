/**
 * Next bundles its own copy of path-to-regexp and ships it without types.
 * `tests/unit/redirect-chains.test.ts` uses it deliberately: matching the
 * redirect list with the SAME matcher Next itself uses is the whole point of
 * that test — re-implementing the matching would prove nothing about the real
 * behaviour. Declared minimally, covering only what the test calls.
 */
declare module "next/dist/compiled/path-to-regexp" {
  export type Key = { name: string | number };

  /**
   * Older signature returns the RegExp and fills `keys`; newer ones return
   * `{ regexp, keys }`. The test handles both, so the return type covers both.
   */
  export function pathToRegexp(
    path: string,
    keys?: Key[],
    options?: { sensitive?: boolean; strict?: boolean; end?: boolean },
  ): RegExp | { regexp: RegExp; keys: Key[] };

  export function compile(
    path: string,
    options?: { validate?: boolean },
  ): (params: Record<string, string>) => string;
}
