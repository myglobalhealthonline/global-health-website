/**
 * Copies Alex Brush into backend/assets/fonts (bundled for DOCX embed + LibreOffice PDF).
 *
 * Override source: ALEX_BRUSH_FONT_PATH env var, or repo backend/assets/fonts, or Downloads.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(here, "..");
const dest = path.join(backendRoot, "assets", "fonts", "AlexBrush-Regular.ttf");

const sources = [
  process.env.ALEX_BRUSH_FONT_PATH,
  path.join(backendRoot, "assets", "fonts", "AlexBrush-Regular.ttf"),
  path.join(os.homedir(), "Downloads", "alex-brush", "AlexBrush-Regular.ttf"),
].filter(Boolean);

const source = sources.find((p) => fs.existsSync(p));
if (!source) {
  console.warn("[sync-alex-brush-font] AlexBrush-Regular.ttf not found — signature font may fail");
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(source, dest);
console.log(`[sync-alex-brush-font] ${source} → ${dest}`);
