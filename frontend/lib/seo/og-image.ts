import { getSiteUrl } from "@/lib/seo/site-url";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_VERSION = "2026-07-19";

export type OgImageKind =
  | "page"
  | "country"
  | "service"
  | "doctor"
  | "article"
  | "pricing"
  | "corporate"
  | "legal";

export type OgImageInput = {
  kind?: OgImageKind | string;
  title: string;
  subtitle?: string;
  locale?: string;
  image?: string;
};

function boundedText(value: string | undefined, maxCodePoints: number): string | undefined {
  if (!value) return undefined;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return undefined;
  return Array.from(normalized).slice(0, maxCodePoints).join("");
}

function contentHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function buildOgImageUrl(input: OgImageInput): string {
  const params = new URLSearchParams();
  const kind = input.kind ?? "page";
  const title = boundedText(input.title, 160) ?? "Global Health";
  const subtitle = boundedText(input.subtitle, 200);
  const locale = boundedText(input.locale, 35);
  const image = boundedText(input.image, 2_048);

  params.set("kind", kind);
  params.set("title", title);
  if (subtitle) params.set("subtitle", subtitle);
  if (locale) params.set("locale", locale);
  if (image) params.set("image", image);

  const identity = JSON.stringify({ version: OG_IMAGE_VERSION, kind, title, subtitle, locale, image });
  params.set("v", `${OG_IMAGE_VERSION}-${contentHash(identity)}`);
  return `${getSiteUrl()}/api/og?${params.toString()}`;
}