import Link from "next/link";

export function StickyBookingCTA({
  href,
  label = "Book Appointment",
}: {
  href: string;
  label?: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-white/95 px-4 py-3 shadow-[0_-14px_40px_rgba(15,46,37,0.14)] backdrop-blur-md md:hidden">
      <Link href={href} className="gh-btn gh-btn-primary w-full justify-center text-base">
        {label}
      </Link>
    </div>
  );
}
