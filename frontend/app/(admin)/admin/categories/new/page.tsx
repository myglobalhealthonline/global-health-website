import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { CategoryForm } from "../_components/category-form";
import { createCategoryAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
  await requireAdminUser();
  return (
    <div className="space-y-6">
      <Link
        href="/admin/categories"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
      >
        <ChevronLeft className="size-3.5" aria-hidden /> Back to categories
      </Link>
      <header>
        <p className="gh-eyebrow">New category</p>
        <h1 className="gh-h2 mt-2">Add a category</h1>
      </header>
      <CategoryForm
        initial={{ slug: "", name: "", type: "GENERAL", description: "", iconUrl: "" }}
        action={createCategoryAction}
        submitLabel="Create"
      />
    </div>
  );
}
