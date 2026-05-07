const ALLOWED_COLOR = /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))$/;

function stripAllTags(raw: string): string {
  return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function toDoctorBioPlainText(raw: string): string {
  return stripAllTags(raw);
}

export function sanitizeDoctorBioHtml(raw: string): string {
  if (!raw.includes("<")) {
    const escaped = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<p>${escaped}</p>`;
  }

  let html = raw;
  html = html.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  html = html.replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, "");
  html = html.replace(/\son\w+="[^"]*"/gi, "");
  html = html.replace(/\son\w+='[^']*'/gi, "");

  html = html.replace(/<(\/?)([^>\s]+)([^>]*)>/g, (_, slash: string, tagName: string, attrs: string) => {
    const tag = tagName.toLowerCase();
    const allowed = new Set(["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "u", "span", "h2", "h3"]);
    if (!allowed.has(tag)) return "";
    if (slash) return `</${tag}>`;
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
