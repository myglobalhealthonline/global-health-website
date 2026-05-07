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
      <HeroSection
        eyebrow="Patient education"
        title={title}
        description={description}
        primaryCta={{ href: "/general-consultation-ie", label: "Explore consultations" }}
        trustBadges={["Author required", "Medical review required", "Updated before publication"]}
      />
      <Section>
        <Container>
          {posts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {posts.map((post) => (
                <BlogCard key={post.href} {...post} />
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-3xl rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
              <h2 className="gh-h3 text-[var(--color-text-primary)]">Editorial articles are being prepared</h2>
              <p className="gh-body mt-3 text-[var(--color-text-muted)]">
                We publish healthcare articles only when author, review, and update details are ready. For personal advice, start with the consultation pages.
              </p>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
