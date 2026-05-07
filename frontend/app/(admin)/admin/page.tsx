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
  Tags,
  FileText,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Pill,
  TestTube2,
  Truck,
} from "lucide-react";

const cards = [
  {
    href: "/admin/appointments",
    title: "Appointments",
    description: "Manage booking requests and update patient statuses",
    icon: CalendarClock,
  },
  {
    href: "/admin/countries",
    title: "Countries",
    description: "Configure country websites, locales, routes, and currency",
    icon: Globe2,
  },
  {
    href: "/admin/general-consultations",
    title: "General Consultations",
    description: "Manage GP consultation cards, pricing, duration, and detail pages",
    icon: Stethoscope,
  },
  {
    href: "/admin/specialties",
    title: "Specialties",
    description: "Add and manage specialty categories per country",
    icon: Tags,
  },
  {
    href: "/admin/specialist-consultations",
    title: "Specialist Consultations",
    description: "Manage specialist consultation detail pages linked from specialties",
    icon: Stethoscope,
  },
  {
    href: "/admin/online-prescriptions",
    title: "Online Prescriptions",
    description: "Manage prescription service records, pricing, and public content",
    icon: Pill,
  },
  {
    href: "/admin/health-tests",
    title: "Health Tests",
    description: "Manage health test cards, pricing, and detail pages",
    icon: TestTube2,
  },
  {
    href: "/admin/home-delivery",
    title: "Home Delivery",
    description: "Manage delivery-related cards, pricing, and public copy",
    icon: Truck,
  },
  {
    href: "/admin/doctors",
    title: "Doctors",
    description: "Edit public doctor profiles shown on the website",
    icon: UserRound,
  },
  {
    href: "/admin/pricing",
    title: "Pricing",
    description: "Manage displayed pricing plans and currencies",
    icon: BadgeDollarSign,
  },
  {
    href: "/admin/assets",
    title: "Assets",
    description: "Upload and organize logos, hero images, and illustrations",
    icon: Images,
  },
  {
    href: "/admin/blog-posts",
    title: "Blog Posts",
    description: "Create and manage health articles and blog content",
    icon: FilePenLine,
  },
  {
    href: "/admin/faqs",
    title: "FAQs",
    description: "Update frequently asked questions and answers",
    icon: CircleHelp,
  },
  {
    href: "/admin/content-pages",
    title: "Content Pages",
    description: "Manage legal notices, privacy, and static pages",
    icon: FileText,
  },
] as const;

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      {/* Dashboard hero */}
      <section className="rounded-[var(--radius-card)] bg-[var(--color-brand-primary)] p-7 text-white sm:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="gh-heading-eyebrow text-white/80">Admin workspace</p>
            <h1 className="mt-3 text-[var(--text-h1)] font-extrabold leading-[1.08] tracking-tight">
              Manage your clinic platform
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-white/85">
              Update website content, review booking requests, and manage public-facing information across all country clinics.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium">
            <ShieldCheck className="size-4" aria-hidden />
            Admin session
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
            <AlertCircle className="size-5 shrink-0 text-white/80" aria-hidden />
            <p className="text-sm text-white/85">Doctors are public profiles only. Doctor portal is separate.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
            <AlertCircle className="size-5 shrink-0 text-white/80" aria-hidden />
            <p className="text-sm text-white/85">Payments are not enabled yet.</p>
          </div>
        </div>
      </section>

      {/* Dashboard cards */}
      <section>
        <h2 className="gh-h3 mb-4 text-[var(--color-text-primary)]">Workspace sections</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="gh-card gh-card-interactive group flex flex-col p-6"
              >
                <div className="mb-4 inline-flex">
                  <span className="gh-icon-circle gh-icon-circle-lg">
                    <Icon className="size-6" aria-hidden />
                  </span>
                </div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">{card.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {card.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-brand-primary)]">
                  Open section
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Scope note */}
      <section className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-panel)] px-5 py-4">
        <p className="text-sm text-[var(--color-text-muted)]">
          <strong className="text-[var(--color-text-primary)]">Admin scope:</strong> website content + booking operations.
          Payments and doctor portal are intentionally excluded from this interface.
        </p>
      </section>
    </div>
  );
}
