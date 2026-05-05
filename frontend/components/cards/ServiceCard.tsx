import Link from "next/link";

type ServiceCardProps = {
  title: string;
  description: string;
  href: string;
  ctaLabel?: string;
};

export function ServiceCard({
  title,
  description,
  href,
  ctaLabel = "View details",
}: ServiceCardProps) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-slate-600">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800"
      >
        {ctaLabel}
      </Link>
    </article>
  );
}
