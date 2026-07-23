/**
 * Inline brand-icon SVGs shared by DoctorCard + SiteFooter + any other
 * surface that needs Instagram / Facebook / LinkedIn / X / YouTube
 * glyphs. lucide-react in this project doesn't ship brand icons (they
 * moved out to dedicated SimpleIcons-style packages) — inlining here
 * avoids a new dependency and keeps every social pill rendering the
 * same shape.
 *
 * All icons render at the caller's font-size via `currentColor` for
 * fill/stroke; the only required prop is `className` which the parent
 * uses to set the bounding box (e.g. `size-4`).
 */

type IconProps = { className?: string };

export function IconInstagram({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconFacebook({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M22 12a10 10 0 1 0-11.5 9.88v-6.99H8v-2.89h2.5V9.85c0-2.48 1.49-3.85 3.74-3.85 1.08 0 2.21.2 2.21.2v2.44h-1.25c-1.23 0-1.61.77-1.61 1.55v1.87h2.74l-.44 2.89H13.6v6.99A10 10 0 0 0 22 12z" />
    </svg>
  );
}

export function IconLinkedin({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M4.98 3.5a2.5 2.5 0 1 1-.02 5 2.5 2.5 0 0 1 .02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.93 1.83-1.92 3.77-1.92 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.36c0-1.28-.02-2.92-1.78-2.92-1.78 0-2.05 1.39-2.05 2.83V21H9z" />
    </svg>
  );
}

export function IconTwitter({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.86l-5.37-7.04L4.5 22H1.245l8.04-9.18L1 2h7.04l4.85 6.41L18.244 2zm-2.4 18h1.81L7.27 4h-1.9l10.474 16z" />
    </svg>
  );
}

export function IconYoutube({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M23.5 6.5a3 3 0 0 0-2.1-2.12C19.5 4 12 4 12 4s-7.5 0-9.4.38A3 3 0 0 0 .5 6.5 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.5 3 3 0 0 0 2.1 2.12C4.5 20 12 20 12 20s7.5 0 9.4-.38a3 3 0 0 0 2.1-2.12A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.5zM9.6 15.5v-7l6.4 3.5-6.4 3.5z" />
    </svg>
  );
}

export function IconTiktok({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

export type BrandIcon = (props: IconProps) => React.ReactElement;
