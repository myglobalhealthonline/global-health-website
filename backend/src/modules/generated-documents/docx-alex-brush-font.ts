import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type PizZip from "pizzip";

export const SIGNATURE_FONT = "Alex Brush";
const FONT_PART_TTF = "AlexBrush-Regular.ttf";
const FONT_PART_ODTTF = "AlexBrush-Regular.odttf";
const FONT_KEY = "{E8B4A12F-9C3D-4F6A-B1E2-7D5A9C0F3E81}";

export function resolveAlexBrushFontPath(): string | null {
  const candidates = [
    process.env.ALEX_BRUSH_FONT_PATH,
    path.join(process.cwd(), "assets", "fonts", FONT_PART_TTF),
    path.join(process.cwd(), "backend", "assets", "fonts", FONT_PART_TTF),
    path.join(os.homedir(), "Downloads", "alex-brush", FONT_PART_TTF),
  ].filter((p): p is string => Boolean(p));
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Word OOXML obfuscation — XOR first 32 bytes with reversed GUID bytes. */
export function obfuscateFontBytes(ttf: Buffer, fontKeyGuid: string): Buffer {
  const hex = fontKeyGuid.replace(/[{}-]/g, "");
  const guidBytes = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) {
    guidBytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  const key = Buffer.from(guidBytes).reverse();
  const out = Buffer.from(ttf);
  for (let i = 0; i < 16; i++) {
    out[i] ^= key[15 - i]!;
    out[i + 16] ^= key[15 - i]!;
  }
  return out;
}

function nextRid(relsXml: string): string {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
  return `rId${(ids.length ? Math.max(...ids) : 0) + 1}`;
}

/**
 * Embed obfuscated Alex Brush in every generated DOCX.
 */
export function ensureAlexBrushFont(zip: PizZip): void {
  const fontFile = resolveAlexBrushFontPath();
  if (!fontFile) {
    console.warn(
      "[docx-alex-brush-font] AlexBrush-Regular.ttf missing — place it in backend/assets/fonts/",
    );
    return;
  }

  const obfuscated = obfuscateFontBytes(fs.readFileSync(fontFile), FONT_KEY);
  const partPath = `word/fonts/${FONT_PART_ODTTF}`;
  zip.file(partPath, obfuscated);

  const ctPath = "[Content_Types].xml";
  let ct = zip.file(ctPath)?.asText() ?? "";
  if (!ct.includes(FONT_PART_ODTTF)) {
    if (!ct.includes("obfuscatedFont")) {
      ct = ct.replace(
        "</Types>",
        `<Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/>` +
          `</Types>`,
      );
    }
    ct = ct.replace(
      "</Types>",
      `<Override PartName="/${partPath}" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/>` +
        `</Types>`,
    );
    zip.file(ctPath, ct);
  }

  const fontRelsPath = "word/_rels/fontTable.xml.rels";
  let fontRels = zip.file(fontRelsPath)?.asText();
  if (!fontRels) {
    fontRels =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
  }

  if (!fontRels.includes(FONT_PART_ODTTF)) {
    const embedRid = nextRid(fontRels);
    fontRels = fontRels.replace(
      "</Relationships>",
      `<Relationship Id="${embedRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/${FONT_PART_ODTTF}"/></Relationships>`,
    );
    zip.file(fontRelsPath, fontRels);

    let fontTable = zip.file("word/fontTable.xml")?.asText() ?? "";
    if (!fontTable.includes(SIGNATURE_FONT)) {
      const entry =
        `<w:font w:name="${SIGNATURE_FONT}">` +
        `<w:altName w:val="Alex Brush Regular"/>` +
        `<w:family w:val="Script"/>` +
        `<w:pitch w:val="variable"/>` +
        `<w:charset w:val="00"/>` +
        `<w:embedRegular r:id="${embedRid}" w:fontKey="${FONT_KEY}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>` +
        `</w:font>`;
      fontTable = fontTable.replace("</w:fonts>", `${entry}</w:fonts>`);
      zip.file("word/fontTable.xml", fontTable);
    }
  }

  patchEmbedSettings(zip);
}

function patchEmbedSettings(zip: PizZip): void {
  const settingsPath = "word/settings.xml";
  const settings = zip.file(settingsPath)?.asText();
  if (!settings || settings.includes("embedTrueTypeFonts")) return;
  zip.file(
    settingsPath,
    settings.replace(
      "</w:settings>",
      "<w:embedTrueTypeFonts/><w:embedSystemFonts/><w:saveSubsetFonts/></w:settings>",
    ),
  );
}

/**
 * Copy Alex Brush where LibreOffice looks for fonts. Returns assets/fonts dir for fontconfig.
 */
export function installAlexBrushForLibreOffice(): string | null {
  const fontFile = resolveAlexBrushFontPath();
  if (!fontFile) return null;

  const fontDir = path.dirname(fontFile);
  const targets: string[] = [path.join(fontDir, FONT_PART_TTF)];

  if (process.platform === "win32") {
    targets.push(
      path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "Windows", "Fonts", FONT_PART_TTF),
      path.join(process.env.APPDATA ?? "", "LibreOffice", "4", "user", "fonts", FONT_PART_TTF),
      path.join(process.env.APPDATA ?? "", "LibreOffice", "5", "user", "fonts", FONT_PART_TTF),
    );
  } else {
    targets.push(
      path.join(os.homedir(), ".local", "share", "fonts", FONT_PART_TTF),
      path.join(os.homedir(), ".fonts", FONT_PART_TTF),
    );
  }

  for (const dest of targets) {
    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(fontFile, dest);
    } catch {
      /* continue */
    }
  }

  return fontDir;
}

export function writeFontconfigForLibreOffice(workDir: string, fontDir: string): string {
  const confPath = path.join(workDir, "fonts.conf");
  const dirs: string[] = [];

  if (process.platform === "win32") {
    const windir = process.env.WINDIR ?? "C:\\Windows";
    dirs.push(
      path.join(windir, "Fonts"),
      path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "Windows", "Fonts"),
    );
  } else {
    dirs.push(
      "/usr/share/fonts",
      "/usr/local/share/fonts",
      "/usr/share/fonts/truetype",
      "/usr/share/fonts/truetype/liberation",
      "/usr/share/fonts/truetype/carlito",
      "/usr/share/fonts/truetype/dejavu",
    );
  }

  dirs.push(fontDir);

  const uniqueDirs = [...new Set(dirs.map((d) => d.replace(/\\/g, "/")))]
    .map((d) => `  <dir>${d}</dir>`)
    .join("\n");

  // Calibri is referenced in generated XML; map to metric-compatible fonts on Linux.
  const calibriAlias =
    process.platform === "win32"
      ? ""
      : `
  <alias binding="strong">
    <family>Calibri</family>
    <prefer><family>Carlito</family></prefer>
  </alias>
  <alias binding="strong">
    <family>Calibri</family>
    <prefer><family>Liberation Sans</family></prefer>
  </alias>`;

  fs.writeFileSync(
    confPath,
    `<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n${uniqueDirs}${calibriAlias}\n</fontconfig>\n`,
  );
  return confPath;
}
