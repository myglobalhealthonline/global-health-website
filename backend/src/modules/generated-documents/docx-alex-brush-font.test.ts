import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { obfuscateFontBytes } from "./docx-alex-brush-font.js";

describe("docx-alex-brush-font", () => {
  it("obfuscateFontBytes is reversible with same key", () => {
    const fontPath = path.join(process.cwd(), "assets", "fonts", "AlexBrush-Regular.ttf");
    if (!fs.existsSync(fontPath)) return;
    const raw = fs.readFileSync(fontPath);
    const key = "{E8B4A12F-9C3D-4F6A-B1E2-7D5A9C0F3E81}";
    const obf = obfuscateFontBytes(raw, key);
    const back = obfuscateFontBytes(obf, key);
    assert.ok(back.subarray(0, 32).equals(raw.subarray(0, 32)));
  });
});
