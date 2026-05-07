import { Star, ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/Container";

export function SocialProof() {
  return (
    <section className="bg-[var(--color-background-soft)] py-12 sm:py-16">
      <Container>
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] border border-[var(--color-border)] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Left: Avatars + text */}
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="relative h-10 w-10 rounded-full border-2 border-white overflow-hidden bg-[var(--color-background-soft)]"
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--color-text-muted)] bg-[var(--color-background-soft)]">
                        {String.fromCharCode(64 + i)}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">
                    Trusted by thousands of patients across Europe
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="size-3.5 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                      4.9/5 average rating based on 2,000+ reviews
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Right: Shield badge */}
              <div className="flex items-center gap-2 rounded-xl bg-[var(--color-background-soft)] px-4 py-2.5 border border-[var(--color-border)]">
                <ShieldCheck className="size-5 text-[var(--color-brand-primary)]" />
                <div>
                  <p className="text-xs font-bold text-[var(--color-text-primary)]">Your Health,</p>
                  <p className="text-xs font-bold text-[var(--color-text-primary)]">Our Priority.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
