import Image from "next/image";
import { ShieldCheck, Star, Timer, Users } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type TrustSignal =
  | string
  | {
      title: string;
      description?: string;
      image?: { src: string; alt: string };
    };

type TrustSignalsProps = {
  title?: string;
  subtitle?: string;
  items: TrustSignal[];
};

const icons = [Star, ShieldCheck, Timer, Users];

export function TrustSignals({ title = "Why patients choose us", subtitle, items }: TrustSignalsProps) {
  return (
    <Section className="bg-[var(--color-brand-primary)] relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      
      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white/[0.03] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white/[0.03] translate-x-1/3 translate-y-1/3" />
      
      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-accent)] border border-white/10">
            Why Us
          </span>
          <h2 className="gh-h2 mt-4 text-white">{title}</h2>
          {subtitle ? <p className="gh-body-lg mt-3 text-white/85 max-w-2xl mx-auto">{subtitle}</p> : null}
        </div>
        
        <ul className={`mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6 ${items.length >= 5 ? 'lg:grid-cols-3' : items.length === 4 ? 'lg:grid-cols-4' : items.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          {items.map((item, index) => {
            const normalized = typeof item === "string" ? { title: item } : item;
            const Icon = icons[index % icons.length];

            return (
              <li
                key={`${normalized.title}-${index}`}
                className="group relative rounded-[var(--radius-card)] border border-white/10 bg-white/[0.06] backdrop-blur-sm p-6 transition-all duration-300 hover:bg-white/[0.12] hover:border-white/20 hover:-translate-y-1 overflow-hidden"
              >
                {/* Top accent line */}
                <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[var(--color-brand-accent)]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative">
                  {normalized.image ? (
                    <div className="relative mb-4 h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10">
                      <Image
                        src={normalized.image.src}
                        alt={normalized.image.alt}
                        fill
                        sizes="56px"
                        className="object-contain p-1"
                      />
                    </div>
                  ) : (
                    <span className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[var(--color-brand-accent)]/20 text-[var(--color-brand-accent)] ring-1 ring-[var(--color-brand-accent)]/20 transition-all duration-300 group-hover:scale-110 group-hover:bg-[var(--color-brand-accent)]/30">
                      <Icon className="size-5" aria-hidden />
                    </span>
                  )}
                  
                  <p className="gh-h3 mt-4 text-white group-hover:text-[var(--color-brand-accent)] transition-colors duration-300">
                    {normalized.title}
                  </p>
                  
                  {normalized.description ? (
                    <p className="gh-body-sm mt-2 text-white/80 leading-relaxed">
                      {normalized.description}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
