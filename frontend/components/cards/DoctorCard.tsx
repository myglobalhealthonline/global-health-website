import Link from "next/link";

type DoctorCardProps = {
  name: string;
  title: string;
  bio: string;
  href?: string;
};

export function DoctorCard({ name, title, bio, href }: DoctorCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
      <p className="mt-1 text-sm font-medium text-teal-700">{title}</p>
      <p className="mt-3 text-sm text-slate-600">{bio}</p>
      {href ? (
        <Link href={href} className="mt-4 inline-block text-sm font-semibold text-teal-700 hover:underline">
          View profile
        </Link>
      ) : null}
    </article>
  );
}
