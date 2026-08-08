import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { AA_THRESHOLD, CARD_HEX_RE, deriveCardPalette } from "./card-colour.js";

describe("membership card colour derivation (§24.2)", () => {
  it("rejects anything that is not a 6-digit hex", () => {
    for (const bad of ["", "#fff", "fff000", "#12345g", "#1234567", "red", "  #ffffff"]) {
      assert.equal(CARD_HEX_RE.test(bad), false, `${bad} should not validate`);
      assert.equal(deriveCardPalette(bad), null);
    }
    assert.equal(deriveCardPalette(null), null);
    assert.equal(deriveCardPalette(undefined), null);
  });

  it("null falls back to the default face rather than a computed palette", () => {
    // The default card keeps its fixed lime chrome — the derivation only
    // engages once a colour is set, so null must be null and not a grey.
    assert.equal(deriveCardPalette(null), null);
  });

  it("accepts either case and normalises the stored value", () => {
    assert.equal(deriveCardPalette("#aabbcc")?.background, "#AABBCC");
    assert.equal(deriveCardPalette("#AABBCC")?.background, "#AABBCC");
  });

  it("flips the foreground to dark ink on a light background", () => {
    const dark = deriveCardPalette("#021B14");
    const light = deriveCardPalette("#F5F0E6");
    assert.equal(dark?.foreground, "#F7FAEF");
    assert.equal(light?.foreground, "#08150F");
  });

  it("flips at the luminance boundary, not at a channel threshold", () => {
    // A saturated mid-yellow is bright (high luminance) despite a low blue
    // channel — a naive average would call it dark and put white ink on it.
    assert.equal(deriveCardPalette("#FFD400")?.foreground, "#08150F");
    // A saturated blue is dark despite a maxed channel.
    assert.equal(deriveCardPalette("#0000FF")?.foreground, "#F7FAEF");
  });

  it("never produces white-on-pale, whatever is picked", () => {
    // Sweep the cube coarsely: the derived foreground must always be the ink
    // that reads better, which is the whole guarantee §24.2 makes.
    for (let r = 0; r < 256; r += 51) {
      for (let g = 0; g < 256; g += 51) {
        for (let b = 0; b < 256; b += 51) {
          const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
          const palette = deriveCardPalette(hex);
          assert.ok(palette, hex);
          // Luminance of a light background must never carry light ink.
          const isPale = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255) > 0.75;
          if (isPale) assert.equal(palette.foreground, "#08150F", hex);
        }
      }
    }
  });

  it("scores contrast on the muted label colour, so the warning can actually fire", () => {
    // This is the correction in §24.2. If the score were taken on the pure
    // foreground it would never drop below AA anywhere in the cube; on the
    // composited label colour a mid-grey does fall through.
    const grey = deriveCardPalette("#767676");
    assert.ok(grey);
    assert.ok(grey.contrast < AA_THRESHOLD, `expected a warning, got ${grey.contrast}`);
    assert.equal(grey.meetsAA, false);
  });

  it("still passes AA on the colours an admin would actually choose", () => {
    for (const hex of ["#021B14", "#0A1F14", "#FFFFFF", "#000000", "#F5F0E6"]) {
      const palette = deriveCardPalette(hex);
      assert.ok(palette?.meetsAA, `${hex} scored ${palette?.contrast}`);
    }
  });

  it("composites the muted colour towards the background, not to a fixed grey", () => {
    // On white the label must sit between the ink and the paper.
    const onWhite = deriveCardPalette("#FFFFFF");
    assert.equal(onWhite?.foreground, "#08150F");
    assert.equal(onWhite?.muted, "#39443F");
  });
});
