import type { Metadata } from "next";
import { buildBlogPostMetadata, renderBlogPostPage } from "@/lib/content/blog-post-page";

type Props = { params: Promise<{ slug: string }> };

// No generateStaticParams: posts are admin-managed (DB) and render on
// demand. An empty generateStaticParams still marks the route for static
// generation, which conflicts with the (global) layout's cookies()/headers()
// usage and throws DYNAMIC_SERVER_USAGE on every request in production.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return buildBlogPostMetadata(Promise.resolve({ slug }));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  return renderBlogPostPage(Promise.resolve({ slug }));
}
