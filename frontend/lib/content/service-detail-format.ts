const ALLOWED_COLOR = /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))$/;

export function sanitizeServiceDetailHtml(raw: string): string {
  let html = raw;
  html = html.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  html = html.replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, "");
  html = html.replace(/\son\w+="[^"]*"/gi, "");
  html = html.replace(/\son\w+='[^']*'/gi, "");
  html = html.replace(/<(\/?)([^>\s]+)([^>]*)>/g, (_, slash: string, tagName: string, attrs: string) => {
    const tag = tagName.toLowerCase();
    const allowed = new Set(["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "u", "span", "font", "h2", "h3"]);
    if (!allowed.has(tag)) return "";
    if (slash) return `</${tag}>`;
    if (tag === "font") {
      const colorMatch = attrs.match(/color\s*=\s*["']?([^"'>\s]+)["']?/i);
      if (!colorMatch) return "<span>";
      const color = colorMatch[1].trim();
      if (!ALLOWED_COLOR.test(color)) return "<span>";
      return `<span style="color:${color}">`;
    }
    if (tag !== "span") return `<${tag}>`;
    const styleMatch = attrs.match(/style\s*=\s*["']([^"']*)["']/i);
    if (!styleMatch) return "<span>";
    const colorMatch = styleMatch[1].match(/color\s*:\s*([^;]+)/i);
    if (!colorMatch) return "<span>";
    const color = colorMatch[1].trim();
    if (!ALLOWED_COLOR.test(color)) return "<span>";
    return `<span style="color:${color}">`;
  });

  return html.trim();
}
