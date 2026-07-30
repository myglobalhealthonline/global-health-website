import { describe, expect, it } from "vitest";
import { deriveMemberId } from "./member-id";

describe("deriveMemberId", () => {
  it("is stable for the same user id", () => {
    expect(deriveMemberId("usr_abc123")).toBe(deriveMemberId("usr_abc123"));
  });

  it("always renders the GH-0000-0000 shape, including short ids", () => {
    for (const id of ["a", "usr_abc123", "b1e0f3a2-6f4c-4d9e-9a0b-1c2d3e4f5a6b"]) {
      expect(deriveMemberId(id)).toMatch(/^GH-\d{4}-\d{4}$/);
    }
  });

  it("separates different users", () => {
    expect(deriveMemberId("usr_1")).not.toBe(deriveMemberId("usr_2"));
  });
});
