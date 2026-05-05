type PricingCardProps = {
  name: string;
  price: string;
  description: string;
};

export function PricingCard({ name, price, description }: PricingCardProps) {
  return (
    <article className="gh-card h-full p-6">
      <p className="gh-heading-eyebrow text-[var(--color-brand-primary)]">Plan</p>
      <h3 className="gh-h3 text-[var(--color-text-primary)]">{name}</h3>
      <p className="mt-3 text-3xl font-extrabold text-[var(--color-brand-primary)]">{price}</p>
      <p className="gh-body-sm mt-3 text-[var(--color-text-muted)]">{description}</p>
    </article>
  );
}
