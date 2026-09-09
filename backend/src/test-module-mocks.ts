import { registerHooks } from "node:module";

// tsx on Node 22 can virtualize node:test's mock URL as a real CommonJS file.
// Restore the synthetic module URL and format so dynamic imports use the test
// double. Imported only by affected tests; ordinary module URLs are unchanged.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const result = nextResolve(specifier, context);
    const url = new URL(result.url);
    if (url.searchParams.has("node-test-mock") && url.searchParams.has("tsx-commonjs-virtual-query")) {
      url.pathname = url.pathname.replace(/%3F.*$/i, "");
      url.searchParams.delete("tsx-commonjs-virtual-query");
      return { ...result, url: url.href, format: "module" };
    }
    return result;
  },
});
