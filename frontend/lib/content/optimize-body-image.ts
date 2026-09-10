import { getImageProps } from "next/image";
import { resolveTrustedAssetUrl } from "./asset-media-url";

/** Only public assets belong in Next's shared image cache; never proxy private routes. */
export function optimizeBodyImage(tagName: string, attribs: Record<string, string>) {
  const attributes = { ...attribs, loading: attribs.loading === "eager" ? "eager" : "lazy", decoding: "async" };
  const src = resolveTrustedAssetUrl(attribs.src ?? "");
  const publicSource = src && (
    /^\/(images|logos)\//.test(src) ||
    /^https:\/\//.test(src)
  );
  // Preserve authored responsive sources, animation, SVG and external/private URLs.
  if (!publicSource || attribs.srcset || /\.(svg|gif)(?:[?#]|$)/i.test(src)) {
    return { tagName, attribs: attributes };
  }
  const { props } = getImageProps({
    src,
    alt: attribs.alt ?? "",
    fill: true,
    sizes: attribs.sizes || "(min-width: 1024px) 960px, 100vw",
  });
  return {
    tagName,
    attribs: { ...attributes, src: props.src, srcset: props.srcSet ?? "", sizes: props.sizes ?? "" },
  };
}
