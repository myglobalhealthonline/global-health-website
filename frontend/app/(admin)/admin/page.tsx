import Link from "next/link";
import {
  CalendarClock,
  Globe2,
  Stethoscope,
  UserRound,
  BadgeDollarSign,
  Images,
  FilePenLine,
  CircleHelp,
  FileText,
} from "lucide-react";

const cards = [
  {
    href: "/admin/appointments",
    title: "Appointments",
    description: "Manage booking requests and statuses",
    icon: CalendarClock,
  },
  {
    href: "/admin/countries",
    title: "Countries",
    description: "Manage country websites, locales, routes, currency, availability",
    icon: Globe2,
  },
  {
    href: "/admin/services",
    title: "Services",
    description: "Manage general/specialist consultation services",
    icon: Stethoscope,
  },
  {
    href: "/admin/doctors",
    title: "Doctors",
    description: "Manage public doctor profiles shown on the website",
    icon: UserRound,
  },
  {
    href: "/admin/pricing",
    title: "Pricing",
    description: "Manage displayed pricing plans",
    icon: BadgeDollarSign,
  },
  {
    href: "/admin/assets",
    title: "Assets",
    description: "Manage logo, hero images, icons, badges, and image metadata",
    icon: Images,
  },
  {
    href: "/admin/blog-posts",
    title: "Blog Posts",
    description: "Manage blog and article content",
    icon: FilePenLine,
  },
  {
    href: "/admin/faqs",
    title: "FAQs",
    description: "Manage FAQ content",
    icon: CircleHelp,
  },
  {
    href: "/admin/content-pages",
    title: "Content Pages",
    description: "Manage legal and static page content",
    icon: FileText,
  },
] as const;

export default function AdminHomePage() {
  return (
    <section className="gh-card p-6 sm:p-8">
      <h1 className="gh-h2 text-[var(--color-text-primary)]">Admin dashboard</h1>
      <p className="gh-body mt-3 text-[var(--color-text-muted)]">
        Use this workspace to manage website content and operational data across patient and public experiences.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4 transition hover:-translate-y-[1px] hover:shadow-[var(--shadow-soft)]"
            >
              <div className="mb-3 inline-flex rounded-full bg-[var(--color-brand-secondary)] p-2 text-[var(--color-brand-primary)]">
                <Icon size={18} />
              </div>
              <p className="text-base font-semibold text-[var(--color-text-primary)]">{card.title}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{card.description}</p>
              <p className="mt-4 text-sm font-semibold text-[var(--color-brand-primary)]">Open section</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        Admin scope in this app: website content + booking operations. Payments and doctor portal are intentionally excluded.
      </div>
    </section>
  );
}
