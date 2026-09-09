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

/**
 * Meta's infinity-loop wordmark glyph — used by `AdSourceIcon` to mark an
 * order that came from a Facebook/Instagram ad. Deliberately the corporate
 * Meta mark rather than the Facebook "f": the attribution it stands for covers
 * both surfaces, and `IconFacebook` above already means the Facebook page link
 * in the site footer.
 */
export function IconMeta({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6.06 5.2c-1.9 0-3.35 1.36-4.14 3.15C1.2 9.98.94 11.74.94 13.1c0 1.5.28 2.72.84 3.6.6.94 1.53 1.45 2.71 1.45 1.02 0 1.9-.4 2.72-1.24.7-.72 1.35-1.7 2.1-3.02l1.2-2.12c.1-.18.2-.35.3-.52.42.68.87 1.44 1.38 2.32l.86 1.48c.85 1.47 1.5 2.42 2.19 3.06.72.67 1.5.98 2.47.98 1.18 0 2.1-.5 2.7-1.42.57-.87.87-2.1.87-3.65 0-1.42-.28-3.24-.99-4.87C20.5 6.56 19.05 5.2 17.1 5.2c-1.16 0-2.19.45-3.14 1.32-.66.6-1.3 1.4-1.99 2.4-.69-1-1.33-1.8-1.99-2.4-.95-.87-1.97-1.32-3.13-1.32H6.06zm-.04 2.32c.62 0 1.2.26 1.79.79.48.44.98 1.06 1.53 1.86l-.35.53-1.2 2.12c-.66 1.16-1.16 1.9-1.6 2.35-.4.4-.75.56-1.16.56-.44 0-.76-.18-1-.56-.28-.44-.44-1.16-.44-2.13 0-1.12.22-2.53.7-3.63.44-1 1.05-1.89 1.73-1.89zm11.06 0c.7 0 1.32.9 1.77 1.93.48 1.1.7 2.5.7 3.6 0 .96-.14 1.66-.4 2.09-.23.38-.55.56-1 .56-.42 0-.79-.17-1.2-.57-.46-.46-.98-1.2-1.66-2.38l-.86-1.48c-.5-.86-.94-1.6-1.35-2.25.55-.8 1.05-1.42 1.53-1.86.58-.53 1.16-.79 1.78-.79h.69z" />
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
