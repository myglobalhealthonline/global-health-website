import { describe, expect, it } from "vitest";

import { readingTimeFromHtml } from "./get-public-blog";

describe("readingTimeFromHtml", () => {
  it("keeps empty and short articles at one minute", () => {
    expect(readingTimeFromHtml("")).toBe(1);
    expect(readingTimeFromHtml("<p>A short update.</p>")).toBe(1);
  });

  it("uses visible prose at 200 words per minute", () => {
    const prose = Array.from({ length: 400 }, (_, index) => `word${index}`).join(" ");

    expect(readingTimeFromHtml(`<article><p>${prose}</p></article>`)).toBe(2);
  });

  it("ignores style and script contents", () => {
    const prose = Array.from({ length: 201 }, (_, index) => `word${index}`).join(" ");
    const css = Array.from({ length: 2_000 }, (_, index) => `.x${index}{color:red}`).join(" ");
    const js = Array.from({ length: 2_000 }, (_, index) => `token${index}`).join(" ");

    expect(
      readingTimeFromHtml(`<style>${css}</style><script>${js}</script><p>${prose}</p>`),
    ).toBe(2);
  });
});
