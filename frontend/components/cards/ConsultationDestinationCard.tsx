import Link from "next/link";
import { ArrowRight, Clock3, Stethoscope, Tag } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  href: string;
  title: string;
  description: string;
  stats?: string;
  imageSrc?: string;
  themeColor?: string;
  ctaLabel?: string;
  className?: string;
};

export function ConsultationDestinationCard({
  href,
  title,
  description,
  stats,
  imageSrc,
  themeColor = "150 50% 25%",
  ctaLabel = "Learn More",
  className,
}: Props) {
  const [duration, price] = (stats ?? "")
    .split(/[•·]/)
    .map((value) => value.trim())
    .filter(Boolean);
  const normalizedPrice = price?.replace(/^from\s+/i, "") ?? "";
  const isLongTitle = title.length > 22;
  const isVeryLongTitle = title.length > 30;
  const titleClassName = isVeryLongTitle
    ? "text-[2.2rem] leading-[1] sm:text-[2.45rem]"
    : isLongTitle
      ? "text-[2.35rem] leading-[0.98] sm:text-[2.65rem]"
      : "text-[2.6rem] leading-[0.96] sm:text-[2.9rem]";

  return (
    <div style={{ ["--theme-color" as string]: themeColor }} className={cn("group h-full w-full", className)}>
      <Link
        href={href}
        className="relative block h-full min-h-[34rem] overflow-hidden rounded-[2.25rem] border border-black/10 bg-[#0a3f31] shadow-[0_30px_90px_-34px_rgba(5,38,29,0.78)] transition-all duration-500 ease-in-out cursor-pointer group-hover:-translate-y-1.5 group-hover:shadow-[0_38px_100px_-30px_hsl(var(--theme-color)/0.65)]"
      >
        {imageSrc ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-in-out group-hover:scale-[1.03]"
            style={{ backgroundImage: `url(${imageSrc})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.16),transparent_22%),radial-gradient(circle_at_18%_16%,rgba(190,255,220,0.16),transparent_18%),linear-gradient(145deg,rgba(10,73,56,0.94),rgba(5,39,31,0.98))]" />
        )}

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--theme-color) / 0.97) 0%, hsl(var(--theme-color) / 0.93) 30%, hsl(var(--theme-color) / 0.72) 58%, hsl(var(--theme-color) / 0.38) 100%)",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_18%,transparent_52%,rgba(2,24,19,0.26)_100%)]" />

        <div className="relative flex h-full flex-col p-7 text-white sm:p-8">
          <div className="flex h-[5.1rem] w-[5.1rem] items-center justify-center rounded-full border border-white/12 bg-white/10 backdrop-blur-md">
            <Stethoscope className="h-8 w-8 text-[#c8f5bd]" strokeWidth={1.75} />
          </div>

          <div className="mt-auto">
            <h3
              className={cn(
                "max-w-full pr-6 font-black tracking-[-0.035em] text-white drop-shadow-[0_10px_22px_rgba(0,0,0,0.24)] break-normal hyphens-none [text-wrap:balance]",
                titleClassName,
              )}
            >
              {title}
            </h3>

            {description ? (
              <p className="mt-4 max-w-[24rem] text-[1.02rem] leading-8 text-white/78">{description}</p>
            ) : null}

            {(duration || normalizedPrice) ? (
              <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-end gap-5 text-[#c8f5bd]">
                {duration ? (
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-[#b8efb0]">
                      <Clock3 className="h-4 w-4" strokeWidth={2} />
                    </div>
                    <div className="text-[2.6rem] font-black leading-none tracking-[-0.05em]">
                      {duration.replace(/\s*min$/i, "")}
                      <span className="ml-1 text-[0.46em] font-semibold tracking-[-0.03em]">min</span>
                    </div>
                  </div>
                ) : (
                  <div />
                )}

                {duration && normalizedPrice ? <div className="h-16 w-px bg-white/18" /> : <div />}

                {normalizedPrice ? (
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-[#b8efb0]">
                      <Tag className="h-4 w-4" strokeWidth={2} />
                    </div>
                    <div className="text-[2.6rem] font-black leading-none tracking-[-0.05em] whitespace-nowrap">{normalizedPrice}</div>
                  </div>
                ) : (
                  <div />
                )}
              </div>
            ) : null}

            <div className="mt-10">
              <div className="flex items-center justify-between rounded-[1.7rem] bg-[linear-gradient(135deg,#edf9d5_0%,#daf6c8_48%,#d0f2c4_100%)] px-7 py-5 text-[#0b3f31] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_18px_40px_-22px_rgba(180,236,182,0.9)] transition-transform duration-300 group-hover:translate-y-[-2px]">
                <span className="text-[1.3rem] font-extrabold tracking-[-0.04em]">{ctaLabel}</span>
                <ArrowRight className="h-6 w-6 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.2} />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
