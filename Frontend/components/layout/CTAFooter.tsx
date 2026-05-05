import { Container } from "@/components/layout/Container";
import type { NavLink } from "@/data/navigation";
import Link from "next/link";

export function CTAFooter({
  cta,
  trustLine,
}: {
  cta: NavLink;
  trustLine: string;
}) {
  return (
    <div className="bg-gradient-to-br from-teal-800 to-teal-950 py-12 text-white">
      <Container>
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="max-w-xl text-lg font-semibold tracking-tight text-white/95">
              Expert online consultations with licensed clinicians - GDPR-aware,
              secure, and convenient.
            </p>
            <p className="mt-2 text-sm text-white/80">{trustLine}</p>
          </div>
          <Link
            href={cta.href}
            className="inline-flex min-h-12 min-w-[200px] items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-teal-900 shadow-lg transition-colors hover:bg-white/95 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
          >
            {cta.label}
          </Link>
        </div>
      </Container>
    </div>
  );
}
