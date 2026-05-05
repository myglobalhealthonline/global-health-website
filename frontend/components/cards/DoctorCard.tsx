import { ArrowRight } from "lucide-react";
import Link from "next/link";

type DoctorCardProps = {
  name: string;
  title: string;
  bio: string;
  href?: string;
};

export function DoctorCard({ name, title, bio, href }: DoctorCardProps) {
  return (
    <article className="flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <span className="inline-flex w-fit rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
        Medical team
      </span>
      <h3 className="mt-4 text-xl font-semibold text-slate-900">{name}</h3>
      <p className="mt-1 text-sm font-medium text-cyan-700">{title}</p>
      <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">{bio}</p>
      {href ? (
        <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-800">
          View profile
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </article>
  );
}
