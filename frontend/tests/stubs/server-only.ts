/**
 * `import "server-only"` is a build-time guard Next.js resolves through its own
 * bundler condition; it is not resolvable from a plain Node/vitest run. Aliased
 * to this empty module in `vitest.config.ts` so unit tests can import server
 * modules directly. The guard still applies to the real build.
 */
export {};
