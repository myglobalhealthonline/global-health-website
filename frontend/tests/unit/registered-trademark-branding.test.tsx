import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RegisteredBrandLockup } from "@/components/brand/RegisteredBrandLockup";
import {
  EU_TRADE_MARK_NUMBER,
  EU_TRADE_MARK_URL,
  REGISTERED_BRAND_NAME,
} from "@/lib/brand/trademark";

const frontendRoot = fileURLToPath(new URL("../..", import.meta.url));

function source(relativePath: string) {
  return readFileSync(path.join(frontendRoot, relativePath), "utf8");
}

describe("registered Global Health brand treatment", () => {
  it("uses the official EUIPO record and exact registered brand name", () => {
    expect(REGISTERED_BRAND_NAME).toBe("Global Health Medicine Anytime Anywhere");
    expect(EU_TRADE_MARK_NUMBER).toBe("019362479");
    expect(EU_TRADE_MARK_URL).toBe(
      "https://euipo.europa.eu/eSearch/#details/trademarks/019362479",
    );
  });

  it("renders one decorative symbol with an accessible registration label", () => {
    const html = renderToStaticMarkup(
      <RegisteredBrandLockup tone="light">
        <span>Global Health logo</span>
      </RegisteredBrandLockup>,
    );

    expect(html.match(/®/gu)).toHaveLength(1);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("Registered European Union trade mark");
  });

  it("applies the shared lockup to public desktop, mobile and footer branding", () => {
    for (const relativePath of [
      "components/layout/SiteHeader.tsx",
      "components/layout/MobileNav.tsx",
      "components/layout/SiteFooter.tsx",
      "components/sections/CountryEntryGate.tsx",
      "components/sections/GH2PagePrimitives.tsx",
    ]) {
      expect(source(relativePath)).toContain("RegisteredBrandLockup");
    }
  });

  it("keeps the mobile logo synchronized with the configured desktop logo", () => {
    const mobileNav = source("components/layout/MobileNav.tsx");

    expect(mobileNav).toContain("src={brandLogo.src}");
    expect(mobileNav).not.toContain("src={DEFAULT_BRAND_LOGO.src}");
  });

  it("applies the same lockup to patient, doctor, corporate and admin portal chrome", () => {
    for (const relativePath of [
      "components/portal-shell.tsx",
      "app/(portal)/(admin)/admin/_components/admin-shell.tsx",
    ]) {
      expect(source(relativePath)).toContain("RegisteredBrandLockup");
    }
  });

  it("links the public footer to the official registration", () => {
    const footer = source("components/layout/SiteFooter.tsx");

    expect(footer).toContain("EU_TRADE_MARK_URL");
    expect(footer).toContain("EU_TRADE_MARK_NUMBER");
    expect(footer).toContain("REGISTERED_BRAND_NAME");
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
