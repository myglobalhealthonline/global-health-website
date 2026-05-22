import { DoctorCard } from "@/components/cards/DoctorCard";

type DoctorItem = {
  name: string;
  title: string;
  imcRegistration?: string;
  medicalRegistrationUrl?: string;
  country?: string;
  languages?: string[];
  whatsappNumber?: string;
  bio: string;
  imageSrc?: string | null;
  href?: string;
  ctaLabel?: string;
};

type DoctorsSectionProps = {
  title?: string;
  intro?: string;
  doctors: DoctorItem[];
};

export function DoctorsSection({ title, intro, doctors }: DoctorsSectionProps) {
  return (
    <section
      style={{
        background: "var(--color-background-soft)",
        padding: "clamp(64px,8vw,120px) 0",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        {(title || intro) && (
          <div className="mb-12 lg:mb-14">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "var(--color-brand-primary)" }}
            >
              Our Team
            </span>
            {title && (
              <h2
                className="mt-3 font-extrabold tracking-[-0.03em] leading-[1.05]"
                style={{
                  fontSize: "clamp(1.85rem,3.5vw,3rem)",
                  color: "var(--color-text-primary)",
                }}
              >
                {title}
              </h2>
            )}
            {intro ? (
              <p
                className="mt-3 max-w-2xl text-[length:var(--text-body-lg)] leading-relaxed"
                style={{ color: "var(--color-text-muted)" }}
              >
                {intro}
              </p>
            ) : null}
          </div>
        )}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.href ?? `${doctor.name}-${doctor.title}`} {...doctor} />
          ))}
        </div>
      </div>
    </section>
  );
}
