import { BlogCard } from "@/components/cards/BlogCard";
import { HeroSection } from "@/components/sections/HeroSection";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type BlogIndexTemplateProps = {
  title: string;
  description: string;
  posts: Array<{ title: string; excerpt: string; href: string }>;
};

export function BlogIndexTemplate({ title, description, posts }: BlogIndexTemplateProps) {
  return (
    <>
      <HeroSection title={title} description={description} primaryCta={{ href: "/book-online", label: "Book Online" }} />
      <Section>
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.href} {...post} />
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
