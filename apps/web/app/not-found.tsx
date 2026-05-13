import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Page not found</h1>
      <p className="max-w-md text-sm text-[var(--color-text-muted)]">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/" className="gh-btn gh-btn-primary">
        Back to home
      </Link>
    </div>
  );
}
