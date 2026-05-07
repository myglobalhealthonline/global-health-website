import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  href: string;
  title: string;
  description: string;
  stats?: string;
  imageSrc?: string;
  themeColor?: string;
  className?: string;
};

export function SpecialtyDestinationCard({
  href,
  title,
  description,
  stats,
  imageSrc,
  themeColor = "150 50% 25%",
  className,
}: Props) {
  return (
    <div style={{ ["--theme-color" as string]: themeColor }} className={cn("group h-full w-full", className)}>
      <Link
        href={href}
        className="relative block h-full min-h-[24rem] overflow-hidden rounded-3xl border border-white/10 bg-[var(--color-brand-primary)] shadow-lg transition-all duration-500 ease-in-out group-hover:-translate-y-1 group-hover:shadow-[0_0_60px_-15px_hsl(var(--theme-color)/0.6)]"
      >
        {imageSrc ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-in-out group-hover:scale-110"
            style={{ backgroundImage: `url(${imageSrc})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.3),_transparent_42%),linear-gradient(140deg,_rgba(255,255,255,0.18),_rgba(255,255,255,0.02))]" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, hsl(var(--theme-color) / 0.95), hsl(var(--theme-color) / 0.74) 34%, transparent 70%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-end p-6 text-white">
          <h3 className="text-3xl font-bold tracking-tight">{title}</h3>
          {stats ? <p className="mt-1 text-sm font-medium text-white/85">{stats}</p> : null}
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/85">{description}</p>
          <div className="mt-8 flex items-center justify-between rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md transition-all duration-300 group-hover:bg-white/18">
            <span className="text-sm font-semibold tracking-wide">Explore Now</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </Link>
    </div>
  );
}
