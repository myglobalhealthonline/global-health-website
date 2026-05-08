import { Star, ShieldCheck, Lock, Zap, Globe } from "lucide-react";
import { Container } from "@/components/layout/Container";

export function SocialProof() {
  return (
    <section className="bg-[var(--color-background-soft)] py-10 sm:py-12">
      <Container>
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            {/* Left: Rating */}
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="relative h-9 w-9 rounded-full border-2 border-white overflow-hidden bg-[var(--color-background-panel)] flex items-center justify-center text-[10px] font-bold text-[var(--color-text-muted)]"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="size-3.5 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-1 text-sm font-bold text-[var(--color-text-primary)]">4.9/5</span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  2,000+ verified reviews
                </p>
              </div>
            </div>

            {/* Right: Trust items */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {[
                { icon: ShieldCheck, label: "Licensed" },
                { icon: Lock, label: "GDPR Secure" },
                { icon: Zap, label: "Fast Access" },
                { icon: Globe, label: "5 Countries" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                  <Icon className="size-4 text-[var(--color-brand-primary)]" />
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
