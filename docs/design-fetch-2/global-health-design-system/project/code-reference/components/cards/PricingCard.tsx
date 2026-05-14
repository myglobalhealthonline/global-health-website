type PricingCardProps = {
  name: string;
  price: string;
  description: string;
};

export function PricingCard({ name, price, description }: PricingCardProps) {
  return (
    <article className="gh-card gh-card-hover flex h-full flex-col p-6">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Plan
      </span>
      <h3 className="mt-2 text-lg font-bold text-[var(--color-text-primary)]">{name}</h3>
      <p className="mt-4 text-3xl font-extrabold text-[var(--color-brand-primary)]">{price}</p>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-muted)]">{description}</p>
    </article>
  );
}
