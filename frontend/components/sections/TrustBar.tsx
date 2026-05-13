import { ShieldCheck, Lock, Zap, Globe } from "lucide-react";
import { Container } from "@/components/layout/Container";

const items = [
  { icon: ShieldCheck, label: "Licensed Doctors", desc: "All consultations are provided by qualified and registered doctors in your country." },
  { icon: Lock, label: "Secure & Confidential", desc: "Your personal data is protected under strict GDPR standards." },
  { icon: Zap, label: "Fast Access", desc: "Book in minutes and get the care you need, when you need it." },
  { icon: Globe, label: "Available across Europe", desc: "Proudly serving patients in multiple EU countries with trusted healthcare." },
];

export function TrustBar() {
  return (
    <section className="gh-medical-pattern gh-medical-pattern-dark bg-[var(--color-brand-primary)] py-14 sm:py-16 lg:py-20">
      <Container>
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex flex-col items-start"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand-accent)]/20 text-[var(--color-brand-accent)]">
                    <Icon className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-bold text-white">{item.label}</p>
                  <p className="mt-1 text-xs text-white/70 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
