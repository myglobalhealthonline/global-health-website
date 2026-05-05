import type { Metadata } from "next";
import { routeInventory } from "@/data/routes";
import { PageShell } from "@/components/layout/PageShell";
import { notFound } from "next/navigation";

type Params = { slug: string };
const known = routeInventory.categories.map((p) => p.replace("/category/", ""));

export const metadata: Metadata = {
  title: "Category",
  description: "Category placeholder page.",
};

export function generateStaticParams() {
  return known.map((slug) => ({ slug }));
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (!known.includes(slug)) notFound();
  return (
    <PageShell
      title={`Category: ${slug}`}
      message="TODO: Add category listing modules and filtering."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

