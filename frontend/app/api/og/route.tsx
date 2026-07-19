import { ImageResponse } from "next/og";
import sharp from "sharp";
import { SITE_NAME } from "@/lib/constants";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, type OgImageKind } from "@/lib/seo/og-image";
import { getOgLabel } from "@/lib/seo/og-labels";
import { getSiteUrl } from "@/lib/seo/site-url";

const CACHE_CONTROL = "public, max-age=31536000, s-maxage=31536000, immutable";
// Keep remote portraits deliberately small. Large base64 payloads can exhaust
// the memory available to an edge image renderer and turn the whole OG route
// into a 502. Oversized or slow images fall back to the branded card.
const MAX_IMAGE_BYTES = 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const KINDS = new Set<OgImageKind>(["page", "country", "service", "doctor", "article", "pricing", "corporate", "legal"]);
export const runtime = "nodejs";

function bounded(value: string | null, maximum: number): string | undefined {
  if (!value) return undefined;
  const clean = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return clean ? Array.from(clean).slice(0, maximum).join("") : undefined;
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  const parts = host.split(".").map(Number);
  return parts.length === 4 && parts.every(Number.isInteger) && (
    parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

function trustedHosts(): Set<string> {
  const hosts = new Set(["images.unsplash.com", "images.pexels.com"]);
  for (const raw of [process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXT_PUBLIC_API_URL]) {
    try { if (raw) hosts.add(new URL(raw).hostname.toLowerCase()); } catch { /* ignore malformed config */ }
  }
  for (const raw of (process.env.NEXT_PUBLIC_MEDIA_ALLOWED_HOSTS ?? "").split(",")) {
    const host = raw.trim().toLowerCase();
    if (host && !host.includes("/") && !host.includes("@")) hosts.add(host.split(":")[0]);
  }
  return hosts;
}

function isImagePath(pathname: string): boolean {
  return !pathname.includes("..") && !pathname.startsWith("/api/og") && !/[\s<>"]/u.test(pathname) &&
    (pathname.startsWith("/api/media/") || pathname.startsWith("/images/") ||
      pathname.startsWith("/social/") || /\.(?:avif|jpe?g|png|webp)$/i.test(pathname));
}

function approvedSource(raw: string | undefined): URL | undefined {
  if (!raw) return undefined;
  try {
    const publicOrigin = new URL(getSiteUrl());
    const isRelative = raw.startsWith("/") && !raw.startsWith("//");
    const url = isRelative ? new URL(raw, publicOrigin) : new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || !isImagePath(url.pathname)) return undefined;
    if (isRelative) return url.origin === publicOrigin.origin ? url : undefined;
    const host = url.hostname.toLowerCase();
    return !isPrivateHost(host) && trustedHosts().has(host) ? url : undefined;
  } catch { return undefined; }
}

function dataUrl(bytes: Uint8Array, type: string): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return `data:${type};base64,${btoa(binary)}`;
}

async function loadImage(
  url: URL | undefined,
  options?: {
    width: number;
    height: number;
    fit?: "cover" | "contain";
    format?: "jpeg" | "png";
  },
): Promise<string | undefined> {
  if (!url) return undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_500);
  try {
    const response = await fetch(url, { cache: "force-cache", redirect: "manual", signal: controller.signal });
    const type = response.headers.get("content-type")?.split(";")[0].toLowerCase();
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (!response.ok || !type || !IMAGE_TYPES.has(type) || declared > MAX_IMAGE_BYTES) return undefined;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return undefined;

    // Decode before handing bytes to ImageResponse. Its WASM renderer can
    // abort the entire request on a malformed or incompatible remote image.
    // Re-encoding gives it one known-safe format and also downsizes portraits.
    let pipeline = sharp(bytes).rotate();
    if (options) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: options.fit ?? "cover",
        position: "attention",
      });
    }
    const outputType = options?.format === "png" ? "image/png" : "image/jpeg";
    const safeBytes = new Uint8Array(
      await (options?.format === "png"
        ? pipeline.png({ compressionLevel: 9 }).toBuffer()
        : pipeline.jpeg({ quality: 86, mozjpeg: true }).toBuffer()),
    );
    return safeBytes.byteLength <= MAX_IMAGE_BYTES
      ? dataUrl(safeBytes, outputType)
      : undefined;
  } catch { return undefined; } finally { clearTimeout(timeout); }
}

function Card({ kind, title, subtitle, locale, background, source, logo }: {
  kind: OgImageKind; title: string; subtitle?: string; locale?: string;
  background?: string; source?: string; logo?: string;
}) {
  const titleSize = title.length > 105 ? 48 : title.length > 70 ? 55 : 64;
  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden",
      color: "#FFF8E8", background: "#0F2E25", fontFamily: "Arial,sans-serif",
    }}>
      {background ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" src={background} width={OG_IMAGE_WIDTH} height={OG_IMAGE_HEIGHT}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}
      {source ? (
        <div style={{
          position: "absolute", right: 52, top: 52, width: 430, height: 526, display: "flex",
          overflow: "hidden", borderRadius: kind === "doctor" ? 44 : 36,
          border: "3px solid rgba(255,248,232,.52)",
          boxShadow: "0 24px 64px rgba(4,24,18,.34), inset 0 1px 0 rgba(255,255,255,.18)",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" src={source} width={430} height={526} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ) : null}
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        background: source
          ? "linear-gradient(90deg,rgba(8,34,27,1) 0%,rgba(8,34,27,.99) 54%,rgba(8,34,27,.84) 64%,rgba(8,34,27,.16) 82%)"
          : "linear-gradient(90deg,rgba(8,34,27,.98) 0%,rgba(8,34,27,.90) 66%,rgba(8,34,27,.62) 100%)",
      }} />
      <div style={{
        position: "relative", width: source ? 730 : 980, padding: "60px 72px 52px",
        display: "flex", flexDirection: "column",
      }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" src={logo} width={220} height={143} style={{
            display: "flex", width: 220, height: 143, objectFit: "contain", objectPosition: "left center",
          }} />
        ) : (
          <div style={{
            display: "flex", alignItems: "center", color: "#FFFFFF", fontSize: 23,
            fontWeight: 700, letterSpacing: "0.16em",
          }}>
            {SITE_NAME.toUpperCase()}
          </div>
        )}
        <div style={{
          display: "flex", marginTop: logo ? 18 : 72, color: "#C7EE62", fontSize: 18, fontWeight: 700, letterSpacing: "0.13em",
        }}>{getOgLabel(kind, locale)}</div>
        <div style={{
          display: "flex", marginTop: 18, fontSize: titleSize, lineHeight: 1.05, fontWeight: 760, letterSpacing: "-0.035em", color: "#FFFFFF",
        }}>{title}</div>
        {subtitle ? <div style={{ display: "flex", marginTop: 22, color: "#F3F7F5", fontSize: 27, lineHeight: 1.3, fontWeight: 600 }}>{subtitle}</div> : null}
        <div style={{ display: "flex", marginTop: "auto", alignItems: "center", color: "#F6F8F7", fontSize: 19, fontWeight: 600 }}>
          myglobalhealth.online
          {locale ? <div style={{
            display: "flex", marginLeft: 20, padding: "8px 14px", borderRadius: 999,
            background: "#274A2A", color: "#D3F779", fontWeight: 700,
          }}>{locale.replace("_", "-")}</div> : null}
        </div>
      </div>
    </div>
  );
}

async function renderCard(
  props: Parameters<typeof Card>[0],
): Promise<Uint8Array> {
  const response = new ImageResponse(<Card {...props} />, {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
  });
  return new Uint8Array(await response.arrayBuffer());
}

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const requestedKind = bounded(requestUrl.searchParams.get("kind"), 24) as OgImageKind | undefined;
  const kind = requestedKind && KINDS.has(requestedKind) ? requestedKind : "page";
  const title = bounded(requestUrl.searchParams.get("title"), 60) ?? SITE_NAME;
  const subtitle = bounded(requestUrl.searchParams.get("subtitle"), 100);
  const locale = bounded(requestUrl.searchParams.get("locale"), 35);
  const sourceUrl = approvedSource(bounded(requestUrl.searchParams.get("image"), 2_048));
  const [background, source, logo] = await Promise.all([
    loadImage(new URL("/social/og-background.webp", getSiteUrl())),
    loadImage(sourceUrl, { width: 430, height: 526 }),
    loadImage(new URL("/logos/global-health-light.png", getSiteUrl()), {
      width: 440,
      height: 286,
      fit: "contain",
      format: "png",
    }),
  ]);
  const props = { kind, title, subtitle, locale, background, source, logo };
  let rendered: Uint8Array;
  try {
    rendered = await renderCard(props);
  } catch {
    rendered = await renderCard({ ...props, source: undefined });
  }
  const optimized = await sharp(rendered)
    .jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toBuffer();

  return new Response(new Uint8Array(optimized), {
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "Content-Type": "image/jpeg",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
