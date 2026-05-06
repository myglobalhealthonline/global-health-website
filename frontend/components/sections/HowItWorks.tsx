import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { MapPin, UserRound, Mail } from "lucide-react";

const stepIcons = [MapPin, UserRound, Mail];

type HowItWorksStep =
  | string
  | {
      title: string;
      description: string;
      ctaLabel?: string;
      ctaHref?: string;
    };

type HowItWorksProps = {
  title?: string;
  subtitle?: string;
  steps: HowItWorksStep[];
};

export function HowItWorks({ title = "How it works", subtitle, steps }: HowItWorksProps) {
  // Only show first 3 steps like Wix
  const displaySteps = steps.slice(0, 3);

  return (
    <Section className="bg-white">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{title}</p>
          <h2 className="gh-h2 mt-2 text-[var(--color-text-primary)]">{subtitle}</h2>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* LEFT: Illustration */}
          <div className="relative mx-auto max-w-md lg:max-w-none">
            <div className="relative">
              {/* Green decorative blob behind */}
              <div className="absolute -bottom-6 -left-6 h-[90%] w-[90%] rounded-[2rem] bg-[#C8E6A0]" />
              
              {/* Main illustration */}
              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#e8f0e8] to-[#d4e8d4]">
                <svg viewBox="0 0 400 300" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                  {/* Soft background shapes */}
                  <circle cx="320" cy="80" r="60" fill="#C8E6A0" opacity="0.4" />
                  <circle cx="60" cy="220" r="50" fill="#C8E6A0" opacity="0.3" />
                  
                  {/* Person silhouette - back of head and shoulders */}
                  <ellipse cx="200" cy="280" rx="100" ry="12" fill="#c8d8c8" opacity="0.5" />
                  
                  {/* Shoulders / upper body */}
                  <path d="M140 220 Q200 180 260 220 L260 280 L140 280 Z" fill="#b8c8b8" opacity="0.6" />
                  
                  {/* Head */}
                  <ellipse cx="200" cy="165" rx="38" ry="42" fill="#a8b8a8" opacity="0.5" />
                  
                  {/* Hair */}
                  <path d="M165 155 Q200 115 235 155 Q235 140 200 130 Q165 140 165 155" fill="#98a898" opacity="0.5" />
                  
                  {/* Laptop base */}
                  <rect x="110" y="210" width="180" height="12" rx="6" fill="#1B4D3E" opacity="0.8" />
                  
                  {/* Laptop screen */}
                  <rect x="125" y="140" width="150" height="75" rx="8" fill="#1B4D3E" />
                  <rect x="130" y="145" width="140" height="65" rx="4" fill="#0d2e25" />
                  
                  {/* Doctor on screen - head */}
                  <circle cx="200" cy="170" r="16" fill="#C8E6A0" opacity="0.8" />
                  {/* Doctor body */}
                  <path d="M185 188 Q200 180 215 188 L215 205 L185 205 Z" fill="#C8E6A0" opacity="0.6" />
                  {/* Doctor stethoscope */}
                  <path d="M190 185 Q200 195 210 185" stroke="#1B4D3E" strokeWidth="2" fill="none" opacity="0.7" />
                  
                  {/* Medical cross on screen corner */}
                  <rect x="250" y="152" width="14" height="4" rx="1" fill="white" opacity="0.8" />
                  <rect x="255" y="147" width="4" height="14" rx="1" fill="white" opacity="0.8" />
                  
                  {/* Hand pointing at screen */}
                  <ellipse cx="245" cy="200" rx="10" ry="8" fill="#a8b8a8" opacity="0.4" />
                  <rect x="242" y="195" width="6" height="14" rx="3" fill="#a8b8a8" opacity="0.4" />
                </svg>
              </div>
            </div>
          </div>

          {/* RIGHT: Steps */}
          <div className="flex flex-col gap-8">
            {displaySteps.map((step, index) => {
              const normalized =
                typeof step === "string"
                  ? { title: `Step ${index + 1}`, description: step }
                  : step;
              
              const IconComponent = stepIcons[index] || MapPin;

              return (
                <div key={`${normalized.title}-${index}`} className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#C8E6A0]/40 text-[#1B4D3E]">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      {normalized.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
                      {normalized.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </Section>
  );
}
