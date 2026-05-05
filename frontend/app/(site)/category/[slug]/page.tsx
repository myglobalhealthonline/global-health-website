import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { routeInventory } from "@/data/routes";

type Params = { slug: string };
const known = routeInventory.categories.map((p) => p.replace("/category/", ""));

export const metadata: Metadata = {
  title: "Category",
  description: "Template-driven category page placeholder.",
};

export function generateStaticParams() {
  return known.map((slug) => ({ slug }));
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (!known.includes(slug)) notFound();

  return (
    <StaticMarketingTemplate
      hero={{
        title: `Category: ${slug}`,
        description: "Category listing placeholder routed through shared static marketing template.",
        primaryCta: { label: "Book consultation", href: "/book-online" },
      }}
      intro={{
        title: "Category content pending",
        body: "TODO: Replace with structured category content from adapters/backend.",
      }}
      bottomCta={{
        title: "Need care support?",
        description: "Start with a consultation and we will guide you to the right service.",
        ctaLabel: "Book consultation",
        ctaHref: "/book-online",
      }}
    />
  );
}
