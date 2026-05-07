import { ConsultationDestinationCard } from "./ConsultationDestinationCard";

type Props = {
  href: string;
  title: string;
  description: string;
  stats?: string;
  imageSrc?: string;
  themeColor?: string;
  className?: string;
};

export function SpecialtyDestinationCard({
  href,
  title,
  description,
  stats,
  imageSrc,
  themeColor,
  className,
}: Props) {
  return (
    <ConsultationDestinationCard
      href={href}
      title={title}
      description={description}
      stats={stats}
      imageSrc={imageSrc}
      themeColor={themeColor}
      ctaLabel="Explore Now"
      className={className}
    />
  );
}
