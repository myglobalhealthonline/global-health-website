import { describe, expect, it } from "vitest";
import { isCalmEditorialBlogPilot } from "./blog-presentation";

describe("isCalmEditorialBlogPilot", () => {
  it("enables the calm editorial layout for the approved pilot article", () => {
    expect(isCalmEditorialBlogPilot("hand-foot-and-mouth-disease-signs-and-treatment")).toBe(true);
  });

  it("leaves every other article on the current presentation", () => {
    expect(isCalmEditorialBlogPilot("diabetes-a-silent-disease")).toBe(false);
    expect(isCalmEditorialBlogPilot("")).toBe(false);
  });
});
