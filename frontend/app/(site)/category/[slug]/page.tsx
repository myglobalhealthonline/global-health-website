import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { routeInventory } from "@/data/routes";
import { getCategoryPageData } from "@/lib/content/category-page-data";

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
  const data = getCategoryPageData(slug);
  return <StaticMarketingTemplate {...data} />;
}
