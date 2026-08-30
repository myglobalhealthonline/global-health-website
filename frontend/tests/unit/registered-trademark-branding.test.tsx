import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { EU_TRADE_MARK_URL } from "@/lib/brand/trademark";

const frontendRoot = fileURLToPath(new URL("../..", import.meta.url));

function source(relativePath: string) {
  return readFileSync(path.join(frontendRoot, relativePath), "utf8");
}

describe("registered Global Health brand treatment", () => {
  it("uses the official EUIPO record", () => {
    expect(EU_TRADE_MARK_URL).toBe(
      "https://euipo.europa.eu/eSearch/#details/trademarks/019362479",
    );
  });

  it("does not add a registered symbol to any shared logo", () => {
    for (const relativePath of [
      "components/layout/SiteHeader.tsx",
      "components/layout/MobileNav.tsx",
      "components/layout/SiteFooter.tsx",
      "components/sections/CountryEntryGate.tsx",
      "components/sections/GH2PagePrimitives.tsx",
      "components/portal-shell.tsx",
      "app/(portal)/(admin)/admin/_components/admin-shell.tsx",
    ]) {
      expect(source(relativePath)).not.toContain("RegisteredBrandLockup");
      expect(source(relativePath)).not.toContain("®");
    }

    expect(
      existsSync(path.join(frontendRoot, "components/brand/RegisteredBrandLockup.tsx")),
    ).toBe(false);
  });

  it("keeps the mobile logo synchronized with the configured desktop logo", () => {
    const mobileNav = source("components/layout/MobileNav.tsx");

    expect(mobileNav).toContain("src={brandLogo.src}");
    expect(mobileNav).not.toContain("src={DEFAULT_BRAND_LOGO.src}");
  });

  it("links only the existing bottom copyright line to the official registration", () => {
    const footer = source("components/layout/SiteFooter.tsx");

    expect(footer).toContain("EU_TRADE_MARK_URL");
    expect(footer).toContain("{copyrightPrefix} · {navigation.footerCopyrightSuffix}");
    expect(footer).not.toContain("EUTM No.");
    expect(footer).not.toContain("EU_TRADE_MARK_NUMBER");
    expect(footer).not.toContain("REGISTERED_BRAND_NAME");
    expect(footer).not.toContain("®");
  });

  it("does not put the registration symbol into SEO titles or structured data", () => {
    for (const relativePath of [
      "lib/seo/page-seo.ts",
      "lib/seo/root-metadata.ts",
      "lib/seo/structured-data.ts",
    ]) {
      expect(source(relativePath)).not.toContain("®");
    }
  });
});
