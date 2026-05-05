import type { Metadata } from "next";
import { BlogIndexTemplate } from "@/components/templates/BlogIndexTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Blog",
  description: "Blog listing template.",
};

export default async function Page() {
  const data = await getTemplatePageData("/blog", "ie");
  return (
    <BlogIndexTemplate
      title="Blog"
      description="Insights and educational updates from the Global Health team."
      posts={data.blogPosts}
    />
  );
}
