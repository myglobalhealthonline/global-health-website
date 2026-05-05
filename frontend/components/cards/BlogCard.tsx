import Link from "next/link";

type BlogCardProps = {
  title: string;
  excerpt: string;
  href: string;
};

export function BlogCard({ title, excerpt, href }: BlogCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{excerpt}</p>
      <Link href={href} className="mt-4 inline-block text-sm font-semibold text-teal-700 hover:underline">
        Read article
      </Link>
    </article>
  );
}
