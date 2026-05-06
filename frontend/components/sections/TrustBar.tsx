import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { ShieldCheck, Lock, Zap, Globe } from "lucide-react";

const items = [
  { icon: ShieldCheck, label: "Licensed Doctors", desc: "All consultations are provided by qualified and registered doctors in your country." },
  { icon: Lock, label: "Secure & Confidential", desc: "Your personal data is protected under strict GDPR standards." },
  { icon: Zap, label: "Fast Access", desc: "Book in minutes and get the care you need, when you need it." },
  { icon: Globe, label: "Available across Europe", desc: "Proudly serving patients in multiple EU countries with trusted healthcare." },
];

export function TrustBar() {
  return (
    <Section className="bg-[var(--color-brand-primary)] relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white/[0.03] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white/[0.03] translate-x-1/3 translate-y-1/3" />
      
      <Container className="relative">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="group flex flex-col items-center text-center p-5 rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.12] hover:-translate-y-1"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand-accent)]/20 text-[var(--color-brand-accent)] ring-1 ring-[var(--color-brand-accent)]/20 transition-transform group-hover:scale-110">
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
    </Section>
  );
}
