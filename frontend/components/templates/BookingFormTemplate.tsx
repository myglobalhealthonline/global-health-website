import { BookingCTA } from "@/components/sections/BookingCTA";
import { HeroSection } from "@/components/sections/HeroSection";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type BookingOption = { value: string; label: string };

type BookingFormTemplateProps = {
  hero: {
    title: string;
    description: string;
    primaryCtaLabel: string;
  };
  form: {
    title: string;
    description: string;
    fields: {
      country: { label: string; placeholder: string };
      consultationType: { label: string; placeholder: string };
      fullName: { label: string; placeholder: string };
      email: { label: string; placeholder: string };
      phone: { label: string; placeholder: string };
      notes: { label: string; placeholder: string };
      consent: string;
    };
    submitLabel: string;
    helperMessage: string;
    countryOptions: BookingOption[];
    consultationTypeOptions: BookingOption[];
    nextSteps?: { title: string; items: string[] };
  };
};

export function BookingFormTemplate({ hero, form }: BookingFormTemplateProps) {
  const countryId = "booking-country";
  const consultationId = "booking-consultation-type";
  const fullNameId = "booking-full-name";
  const emailId = "booking-email";
  const phoneId = "booking-phone";
  const notesId = "booking-notes";

  return (
    <>
      <HeroSection
        eyebrow="Book online"
        title={hero.title}
        description={hero.description}
        primaryCta={{ href: "#booking-form", label: hero.primaryCtaLabel }}
        trustBadges={["Secure intake", "Private consultation", "Clear next steps"]}
      />
      <Section id="booking-form" className="bg-[var(--color-brand-secondary)]">
        <Container>
          <article className="gh-card mx-auto max-w-3xl p-6 sm:p-8">
            <h2 className="gh-h2 text-[var(--color-text-primary)]">{form.title}</h2>
            <p className="gh-body mt-3 text-[var(--color-text-muted)]">{form.description}</p>
            <form className="mt-6 space-y-4" action="#" method="post">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="gh-field-label">{form.fields.country.label}</span>
                  <select id={countryId} name={countryId} className="gh-select" defaultValue="">
                    <option value="">{form.fields.country.placeholder}</option>
                    {form.countryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="gh-field-label">{form.fields.consultationType.label}</span>
                  <select id={consultationId} name={consultationId} className="gh-select" defaultValue="">
                    <option value="">{form.fields.consultationType.placeholder}</option>
                    {form.consultationTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">{form.fields.fullName.label}</span>
                <input
                  id={fullNameId}
                  name={fullNameId}
                  type="text"
                  placeholder={form.fields.fullName.placeholder}
                  className="gh-input"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="gh-field-label">{form.fields.email.label}</span>
                  <input
                    id={emailId}
                    name={emailId}
                    type="email"
                    placeholder={form.fields.email.placeholder}
                    className="gh-input"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="gh-field-label">{form.fields.phone.label}</span>
                  <input
                    id={phoneId}
                    name={phoneId}
                    type="tel"
                    placeholder={form.fields.phone.placeholder}
                    className="gh-input"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">{form.fields.notes.label}</span>
                <textarea
                  id={notesId}
                  name={notesId}
                  rows={4}
                  placeholder={form.fields.notes.placeholder}
                  className="gh-textarea"
                />
              </label>
              <div className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
                <p className="gh-body-sm text-[var(--color-text-muted)]">{form.fields.consent}</p>
              </div>
              <button type="submit" className="gh-btn gh-btn-primary min-w-[180px]">
                {form.submitLabel}
              </button>
              <p className="gh-body-sm text-[var(--color-text-muted)]">{form.helperMessage}</p>
            </form>
            {form.nextSteps ? (
              <section className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
                <h3 className="gh-h3 text-[var(--color-text-primary)]">{form.nextSteps.title}</h3>
                <ul className="mt-3 space-y-2">
                  {form.nextSteps.items.map((item) => (
                    <li key={item} className="gh-body-sm text-[var(--color-text-muted)]">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>
        </Container>
      </Section>
      <BookingCTA
        title="Need urgent support?"
        description="If you are unsure which consultation to choose, start here and our team will guide you."
        ctaLabel={hero.primaryCtaLabel}
        ctaHref="#booking-form"
      />
    </>
  );
}
