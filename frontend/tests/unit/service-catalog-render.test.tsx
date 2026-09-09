import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ServiceCatalog, type ServiceCatalogItem } from "@/components/sections/ServiceCatalog";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("service catalogue initial HTML", () => {
  it("renders one card page while keeping every service detail discoverable", () => {
    const services: ServiceCatalogItem[] = Array.from({ length: 17 }, (_, index) => ({
      type: "general", title: `Service ${index}`, tag: "Consultation", price: 40,
      dur: "20 min", href: `/ireland/en/services/service-${index}`,
    }));
    const html = renderToStaticMarkup(<ServiceCatalog services={services} />);
    expect((html.match(/<img\b/g) ?? []).length).toBe(5);
    for (const service of services) expect(html).toContain(`href="${service.href}"`);
    expect(html).toContain("<details");
    expect(html).not.toContain(" hidden=");
  });
});
