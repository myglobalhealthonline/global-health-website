import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "backend";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { CategoryForm } from "../_components/category-form";
import { updateCategoryAction } from "../actions";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditCategoryPage({ params }: PageProps) {
  await requireAdminUser();
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/categories"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
      >
        <ChevronLeft className="size-3.5" aria-hidden /> Back to categories
      </Link>
      <header>
        <p className="gh-eyebrow">Edit category</p>
        <h1 className="gh-h2 mt-2">{category.name}</h1>
      </header>
      <CategoryForm
        initial={{
          id: category.id,
          slug: category.slug,
          name: category.name,
          type: category.type,
          description: category.description ?? "",
          iconUrl: category.iconUrl ?? "",
        }}
        action={updateCategoryAction}
        submitLabel="Save changes"
      />
    </div>
  );
}
