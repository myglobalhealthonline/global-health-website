type PricingCardProps = {
  name: string;
  price: string;
  description: string;
};

export function PricingCard({ name, price, description }: PricingCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
      <p className="mt-2 text-2xl font-bold text-teal-700">{price}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </article>
  );
}
